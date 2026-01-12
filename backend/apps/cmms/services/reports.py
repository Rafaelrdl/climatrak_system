"""
Services para Geração de Relatórios PMOC

Implementa a geração de relatórios PMOC Mensal e Anual conforme
Lei 13.589/2018, Portaria MS 3.523/1998 e critérios de QAI (ANVISA RE 09/2003 e/ou ABNT aplicável).

Referências (para constar no PMOC e no relatório):
- Lei 13.589/2018 (PMOC obrigatório)
- Portaria MS 3.523/1998 (PMOC: operação mínima, renovação, filtro mínimo, registros)
- ANVISA RE nº 9/2003 (critérios tradicionais de QAI) / ABNT (ex.: NBR 17037, conforme adoção)
- ABNT NBR 16401 (parâmetros de conforto/projeto – opcional como referência técnica)
"""

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from apps.assets.models import Asset, Site
from apps.cmms.models import MaintenancePlan, WorkOrder

# =============================================================================
# Defaults "PMOC completo"
# =============================================================================

DEFAULT_PMOC_VERSION = getattr(settings, "PMOC_DEFAULT_VERSION", "1.0")
DEFAULT_PMOC_LEGAL_BASIS = getattr(
    settings,
    "PMOC_LEGAL_BASIS",
    [
        "Lei 13.589/2018 (PMOC obrigatório)",
        "Portaria MS 3.523/1998 (operações mínimas, registros, filtro na captação de ar externo)",
        "ANVISA RE 09/2003 e normas ABNT aplicáveis (QAI)",
    ],
)

# Operação mínima (Portaria)
DEFAULT_MIN_OA_M3H_PERSON = getattr(settings, "PMOC_MIN_OA_M3H_PERSON", 27)
DEFAULT_MIN_OA_FILTER_CLASS = getattr(settings, "PMOC_MIN_OA_FILTER_MIN_CLASS", "G1")

# QAI (critério configurável)
DEFAULT_QAI_CRITERION = getattr(settings, "PMOC_QAI_CRITERION", "RE 09/2003")


@dataclass
class PMOCEquipmentSummary:
    """Resumo de equipamento para PMOC."""

    asset_id: str
    tag: str
    name: str
    asset_type: str
    manufacturer: str
    model: str
    serial_number: str
    capacity: Optional[Decimal]
    capacity_unit: str
    location: str
    status: str
    installation_date: Optional[date]
    preventive_count: int
    corrective_count: int
    compliance_rate: (
        float  # *observação*: proxy (ver comentário em _get_equipment_data)
    )

    @property
    def capacity_btu(self) -> int:
        """Retorna capacidade em BTUs."""
        if not self.capacity:
            return 0
        capacity_float = float(self.capacity)
        if self.capacity_unit == "BTU":
            return int(capacity_float)
        if self.capacity_unit == "TR":
            return int(capacity_float * 12000)
        if self.capacity_unit == "KCAL":
            return int(capacity_float * 3.968)
        if self.capacity_unit == "KW":
            return int(capacity_float * 3412)
        return int(capacity_float)


class PMOCReportService:
    """
    Serviço para geração de relatórios PMOC.

    PMOC é obrigatório (Lei 13.589/2018). Este relatório gera:
    - Capa/Identificação do PMOC (vigência, base legal, ART/RRT/TRT, local de disponibilização)
    - Inventário (equipamentos HVAC)
    - Operação e Controle (renovação mínima, filtro mínimo, setpoints por zona quando houver)
    - Execução (preventivas/corretivas)
    - QAI (quando houver dados)
    - Registros/Anexos e plano de emergências
    """

    # -------------------------------------------------------------------------
    # PUBLIC
    # -------------------------------------------------------------------------

    @classmethod
    def generate_monthly_report(
        cls,
        month: int,
        year: int,
        site_id: Optional[str] = None,
        company: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Gera relatório PMOC mensal."""
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)

        # Coleta base
        establishment = cls._get_establishment_info(site_id, company)
        responsible_tech = cls._get_responsible_technician(
            site_id=site_id, company=company
        )

        equipment_data = cls._get_equipment_data(
            site_id=site_id,
            company=company,
            start_date=start_date,
            end_date=end_date,
        )
        maintenance_data = cls._get_maintenance_data(
            start_date, end_date, site_id, company
        )
        work_orders_data = cls._get_work_orders_summary(
            start_date, end_date, site_id, company
        )

        total_equipment = len(equipment_data)
        total_capacity_btu = sum(eq.capacity_btu or 0 for eq in equipment_data)

        # PMOC "completo"
        pmoc_meta = cls._get_pmoc_metadata(
            start_date=start_date,
            end_date=end_date,
            site_id=site_id,
            company=company,
        )
        operation = cls._get_operation_control(site_id=site_id, company=company)
        qai = cls._get_qai_monthly_data(start_date, end_date, site_id, company)
        responsibilities = cls._get_responsibilities(site_id, company)
        maintenance_routines = cls._get_maintenance_routines(site_id, company)
        communication_plan = cls._get_communication_plan()
        annexes = cls._get_annexes_status(
            has_inventory=total_equipment > 0,
            has_work_orders=len(work_orders_data) > 0,
            has_rt=bool(responsible_tech.get("name")),
            has_art=bool(pmoc_meta.get("art_rrt_trt")),
            has_qai=bool(qai.get("indicators")),
        )
        emergency_plan = cls._get_emergency_plan()
        compliance_status = cls._calculate_compliance_status(maintenance_data, qai)

        report = {
            "report_type": "PMOC_MENSAL",
            "period": {
                "month": month,
                "year": year,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "month_name": cls._get_month_name(month),
            },
            "generated_at": timezone.now().isoformat(),
            "filters": {"site_id": site_id, "company": company},
            # 0. Capa/Identificação do PMOC (vigência, base legal, ART)
            "pmoc": pmoc_meta,
            # 1. Objetivo (incorporado em pmoc.objective)
            # 2. Abrangência/Escopo (incorporado em pmoc.scope)
            # 3. Responsabilidades (NOVO)
            "responsibilities": responsibilities,
            # 4. Identificação do estabelecimento
            "establishment": establishment,
            # 5. Inventário / sistemas de climatização
            "climate_systems": {
                "total_equipment": total_equipment,
                "total_capacity_btu": total_capacity_btu,
                "total_capacity_tr": (
                    round(total_capacity_btu / 12000, 2) if total_capacity_btu else 0
                ),
                "equipment_by_type": cls._group_equipment_by_type(equipment_data),
                "equipment_by_status": cls._group_equipment_by_status(equipment_data),
            },
            # 6. Parâmetros de Operação e Controle
            "operation": operation,
            # 7. Plano de Manutenção - Rotinas detalhadas (NOVO)
            "maintenance_routines": maintenance_routines,
            # 8. Execução do plano de manutenção (mensal)
            "maintenance_summary": {
                "preventive": {
                    "scheduled": maintenance_data.get("preventive_scheduled", 0),
                    "completed": maintenance_data.get("preventive_completed", 0),
                    "pending": maintenance_data.get("preventive_pending", 0),
                    "compliance_rate": maintenance_data.get("preventive_compliance", 0),
                },
                "corrective": {
                    "opened": maintenance_data.get("corrective_opened", 0),
                    "completed": maintenance_data.get("corrective_completed", 0),
                    "pending": maintenance_data.get("corrective_pending", 0),
                    "average_response_hours": maintenance_data.get(
                        "avg_response_hours"
                    ),
                },
                "requests": {"total": maintenance_data.get("requests", 0)},
                "overall_compliance_rate": maintenance_data.get(
                    "overall_compliance", 0
                ),
            },
            # 9. Controle de QAI
            "qai": qai,
            # 10. Registros/Anexos
            "annexes": annexes,
            # 11. Recomendações para falhas e emergências
            "emergency_plan": emergency_plan,
            # 12. Comunicação aos ocupantes (NOVO)
            "communication": communication_plan,
            # 13. Status de conformidade geral (NOVO)
            "compliance_status": compliance_status,
            # Lista detalhada de equipamentos
            "equipment_list": [
                {
                    "tag": eq.tag,
                    "name": eq.name,
                    "type": eq.asset_type,
                    "manufacturer": eq.manufacturer,
                    "model": eq.model,
                    "serial_number": eq.serial_number,
                    "capacity_btu": eq.capacity_btu,
                    "location": eq.location,
                    "status": eq.status,
                    "preventive_count": eq.preventive_count,
                    "corrective_count": eq.corrective_count,
                    "compliance_rate": eq.compliance_rate,
                }
                for eq in equipment_data
            ],
            # Detalhamento das OS do período
            "work_orders": work_orders_data,
            # Responsável técnico
            "responsible_technician": responsible_tech,
            # Observações e recomendações
            "observations": cls._generate_observations(
                maintenance_data, equipment_data, qai=qai
            ),
        }
        return report

    @classmethod
    def generate_annual_report(
        cls,
        year: int,
        site_id: Optional[str] = None,
        company: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Gera relatório PMOC anual consolidado."""
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)

        establishment = cls._get_establishment_info(site_id, company)
        responsible_tech = cls._get_responsible_technician(
            site_id=site_id, company=company
        )

        equipment_data = cls._get_equipment_data(
            site_id=site_id,
            company=company,
            start_date=start_date,
            end_date=end_date,
        )
        maintenance_data = cls._get_maintenance_data(
            start_date, end_date, site_id, company
        )
        monthly_breakdown = cls._get_monthly_breakdown(year, site_id, company)
        work_orders_summary = cls._get_work_orders_annual_summary(
            year, site_id, company
        )

        total_equipment = len(equipment_data)
        total_capacity_btu = sum(eq.capacity_btu or 0 for eq in equipment_data)

        pmoc_meta = cls._get_pmoc_metadata(
            start_date=start_date,
            end_date=end_date,
            site_id=site_id,
            company=company,
        )
        operation = cls._get_operation_control(site_id=site_id, company=company)
        qai_annual = cls._get_qai_annual_data(year, site_id, company)
        responsibilities = cls._get_responsibilities(site_id, company)
        maintenance_routines = cls._get_maintenance_routines(site_id, company)
        communication_plan = cls._get_communication_plan()

        annexes = cls._get_annexes_status(
            has_inventory=total_equipment > 0,
            has_work_orders=work_orders_summary.get("total", 0) > 0,
            has_rt=bool(responsible_tech.get("name")),
            has_art=bool(pmoc_meta.get("art_rrt_trt")),
            has_qai=bool(qai_annual.get("indicators")),
        )
        emergency_plan = cls._get_emergency_plan()
        compliance_status = cls._calculate_compliance_status(
            maintenance_data, qai_annual
        )

        report = {
            "report_type": "PMOC_ANUAL",
            "period": {
                "year": year,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
            "generated_at": timezone.now().isoformat(),
            "filters": {"site_id": site_id, "company": company},
            # 0. Capa/Identificação do PMOC (vigência, base legal, ART)
            "pmoc": pmoc_meta,
            # 1. Objetivo (incorporado em pmoc.objective)
            # 2. Abrangência/Escopo (incorporado em pmoc.scope)
            # 3. Responsabilidades (NOVO)
            "responsibilities": responsibilities,
            # 4. Identificação do estabelecimento
            "establishment": establishment,
            # 5. Inventário de sistemas de climatização
            "climate_systems": {
                "total_equipment": total_equipment,
                "total_capacity_btu": total_capacity_btu,
                "total_capacity_tr": (
                    round(total_capacity_btu / 12000, 2) if total_capacity_btu else 0
                ),
                "equipment_by_type": cls._group_equipment_by_type(equipment_data),
                "equipment_by_status": cls._group_equipment_by_status(equipment_data),
                "equipment_by_age": cls._group_equipment_by_age(equipment_data),
            },
            # 6. Parâmetros de Operação e Controle
            "operation": operation,
            # 7. Plano de Manutenção - Rotinas detalhadas (NOVO)
            "maintenance_routines": maintenance_routines,
            # 8. Consolidado anual de manutenções
            "maintenance_annual": {
                "total_preventive": maintenance_data.get("preventive_completed", 0),
                "total_corrective": maintenance_data.get("corrective_completed", 0),
                "total_requests": maintenance_data.get("requests", 0),
                "total_work_orders": work_orders_summary.get("total", 0),
                "overall_compliance_rate": maintenance_data.get(
                    "overall_compliance", 0
                ),
                "average_mttr_hours": maintenance_data.get("avg_response_hours"),
            },
            # 9. Controle de QAI
            "qai": qai_annual,
            # 10. Breakdown mensal
            "monthly_breakdown": monthly_breakdown,
            # 11. Performance por equipamento
            "equipment_performance": [
                {
                    "tag": eq.tag,
                    "name": eq.name,
                    "type": eq.asset_type,
                    "capacity_btu": eq.capacity_btu,
                    "location": eq.location,
                    "preventive_count": eq.preventive_count,
                    "corrective_count": eq.corrective_count,
                    "compliance_rate": eq.compliance_rate,
                    "mtbf_days": cls._calculate_mtbf(eq.asset_id, year),
                }
                for eq in equipment_data
            ],
            # 12. KPIs
            "kpis": {
                "preventive_compliance": maintenance_data.get(
                    "preventive_compliance", 0
                ),
                "corrective_ratio": cls._calculate_corrective_ratio(maintenance_data),
                "average_response_time": maintenance_data.get("avg_response_hours"),
                "equipment_availability": cls._calculate_availability(
                    equipment_data, year
                ),
                "backlog_aging_days": work_orders_summary.get("backlog_aging_days", 0),
            },
            # 13. Planos de manutenção ativos
            "maintenance_plans": cls._get_maintenance_plans_summary(site_id, company),
            # 14. Registros/Anexos
            "annexes": annexes,
            # 15. Recomendações para falhas e emergências
            "emergency_plan": emergency_plan,
            # 16. Comunicação aos ocupantes (NOVO)
            "communication": communication_plan,
            # 17. Status de conformidade geral (NOVO)
            "compliance_status": compliance_status,
            # 18. RT
            "responsible_technician": responsible_tech,
            # 19. Conclusões (com status alinhado)
            "conclusions": cls._generate_annual_conclusions(
                maintenance_data, equipment_data, qai=qai_annual
            ),
        }
        return report

    # -------------------------------------------------------------------------
    # PMOC COMPLETO - NOVOS HELPERS
    # -------------------------------------------------------------------------

    @classmethod
    def _get_pmoc_metadata(
        cls,
        start_date: date,
        end_date: date,
        site_id: Optional[str],
        company: Optional[str],
    ) -> Dict[str, Any]:
        """
        Capa/Identificação do PMOC:
        - versão
        - vigência
        - base legal
        - ART/RRT/TRT (quando houver)
        - local de disponibilização
        - objetivo (Seção 1)
        - abrangência/escopo (Seção 2)
        """
        # Sugestão: puxar ART/RRT/TRT e local de disponibilização de um cadastro no tenant.
        art = getattr(settings, "PMOC_ART_RRT_TRT", "")  # fallback
        disclosure_location = getattr(settings, "PMOC_DISCLOSURE_LOCATION", "")

        # Se existir algo no Site (Assunção), prioriza.
        site = cls._safe_get_site(site_id, company)
        site_name = site.name if site else "Não especificado"
        site_address = site.address if site else ""

        if site:
            if hasattr(site, "pmoc_art_rrt_trt") and site.pmoc_art_rrt_trt:
                art = site.pmoc_art_rrt_trt
            if (
                hasattr(site, "pmoc_disclosure_location")
                and site.pmoc_disclosure_location
            ):
                disclosure_location = site.pmoc_disclosure_location

        return {
            "version": DEFAULT_PMOC_VERSION,
            "validity": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "art_rrt_trt": art,
            "legal_basis": DEFAULT_PMOC_LEGAL_BASIS,
            "disclosure_location": disclosure_location,
            # Seção 1 - Objetivo
            "objective": (
                "Estabelecer rotinas de manutenção preventiva e corretiva, controle de operação e "
                "monitoramento da Qualidade do Ar Interior (QAI) dos sistemas de climatização, "
                "em conformidade com a Portaria MS nº 3.523/1998, Resolução RE nº 9/2003 da ANVISA, "
                "Lei Federal nº 13.589/2018 e NBR 16401."
            ),
            # Seção 2 - Abrangência/Escopo
            "scope": {
                "site_name": site_name,
                "site_address": site_address,
                "description": (
                    f"Este PMOC abrange todos os sistemas de climatização e ventilação "
                    f"instalados no estabelecimento '{site_name}', incluindo equipamentos "
                    "de expansão direta (splits, VRFs), centrais de água gelada (chillers, fancoils), "
                    "torres de resfriamento e sistemas de ventilação/exaustão."
                ),
                "exclusions": [
                    "Equipamentos de uso residencial em áreas privativas (se houver)",
                    "Sistemas de refrigeração comercial (câmaras frias, expositores)",
                ],
            },
        }

    @classmethod
    def _get_operation_control(
        cls, site_id: Optional[str], company: Optional[str]
    ) -> Dict[str, Any]:
        """
        Operação e Controle (Seção 5):
        - renovação mínima (m³/h/pessoa)
        - filtro mínimo na captação de ar externo
        - classificação de filtros
        - setpoints por zona (opcional)
        """
        site = cls._safe_get_site(site_id, company)

        setpoints: List[Dict[str, Any]] = []
        # Assunção: Site.pmoc_setpoints seja JSONField (lista de zonas)
        if site and hasattr(site, "pmoc_setpoints") and site.pmoc_setpoints:
            if isinstance(site.pmoc_setpoints, list):
                setpoints = site.pmoc_setpoints

        # Se não houver setpoints cadastrados, usar exemplo padrão
        if not setpoints:
            setpoints = [
                {
                    "zone": "Área Administrativa",
                    "temp_setpoint_c": 24,
                    "temp_tolerance_c": 1,
                    "humidity_setpoint_pct": 55,
                    "humidity_tolerance_pct": 10,
                },
                {
                    "zone": "Área de Atendimento",
                    "temp_setpoint_c": 23,
                    "temp_tolerance_c": 1,
                    "humidity_setpoint_pct": 55,
                    "humidity_tolerance_pct": 10,
                },
                {
                    "zone": "Data Center / CPD",
                    "temp_setpoint_c": 22,
                    "temp_tolerance_c": 1,
                    "humidity_setpoint_pct": 50,
                    "humidity_tolerance_pct": 5,
                },
            ]

        return {
            "minimum_oa_m3h_person": DEFAULT_MIN_OA_M3H_PERSON,
            "oa_filter_min_class": DEFAULT_MIN_OA_FILTER_CLASS,
            "setpoints": setpoints,
            # Classificação de filtros conforme NBR 16401
            "filter_classification": {
                "description": "Classificação mínima de filtros conforme NBR 16401-3",
                "levels": [
                    {
                        "class": "G1-G4",
                        "efficiency": "Grossos",
                        "application": "Pré-filtro / Proteção de serpentina",
                    },
                    {
                        "class": "M5-M6",
                        "efficiency": "Médios",
                        "application": "Ar externo / Ambientes comerciais",
                    },
                    {
                        "class": "F7-F9",
                        "efficiency": "Finos",
                        "application": "Hospitais / Laboratórios / Salas limpas",
                    },
                    {
                        "class": "H10-H14",
                        "efficiency": "HEPA",
                        "application": "Áreas críticas / Isolamento",
                    },
                ],
                "minimum_external_air": "M5 (mínimo recomendado para ar externo)",
            },
        }

    @classmethod
    def _get_qai_monthly_data(
        cls,
        start_date: date,
        end_date: date,
        site_id: Optional[str],
        company: Optional[str],
    ) -> Dict[str, Any]:
        """
        QAI mensal (Seção 7):
        - criterion
        - status: CONFORME | NAO_CONFORME | NAO_APLICAVEL | NÃO INFORMADO
        - last_sampled_at
        - indicators: lista de parâmetros monitorados
        - monitoring_plan: plano de monitoramento
        """
        # Hook futuro: integrar com um model do tipo apps.qai.QaiLabReport / AirQualitySample
        # Por enquanto, retorna estrutura com indicadores padrão (valores vazios)
        indicators: List[Dict[str, Any]] = []
        last_sampled_at = None

        status = "NÃO INFORMADO"
        if indicators:
            if any(i.get("status") == "FORA" for i in indicators):
                status = "NAO_CONFORME"
            else:
                status = "CONFORME"

        # Indicadores padrão conforme RE nº 9/2003 ANVISA
        standard_indicators = [
            {
                "parameter": "Temperatura",
                "unit": "°C",
                "limit": "23 a 26 (verão) / 20 a 22 (inverno)",
                "reference": "RE nº 9/2003",
                "measured_value": None,
                "status": "PENDENTE",
            },
            {
                "parameter": "Umidade Relativa",
                "unit": "%",
                "limit": "40 a 65",
                "reference": "RE nº 9/2003",
                "measured_value": None,
                "status": "PENDENTE",
            },
            {
                "parameter": "Velocidade do Ar",
                "unit": "m/s",
                "limit": "≤ 0,25",
                "reference": "RE nº 9/2003",
                "measured_value": None,
                "status": "PENDENTE",
            },
            {
                "parameter": "CO₂ (Dióxido de Carbono)",
                "unit": "ppm",
                "limit": "≤ 1000",
                "reference": "RE nº 9/2003",
                "measured_value": None,
                "status": "PENDENTE",
            },
            {
                "parameter": "Aerodispersoides (Poeira Total)",
                "unit": "µg/m³",
                "limit": "≤ 80",
                "reference": "RE nº 9/2003",
                "measured_value": None,
                "status": "PENDENTE",
            },
            {
                "parameter": "Fungos",
                "unit": "UFC/m³",
                "limit": "≤ 750 (I/E ≤ 1,5)",
                "reference": "RE nº 9/2003",
                "measured_value": None,
                "status": "PENDENTE",
            },
        ]

        return {
            "criterion": DEFAULT_QAI_CRITERION,
            "status": status,
            "last_sampled_at": last_sampled_at,
            "indicators": indicators if indicators else standard_indicators,
            "monitoring_plan": {
                "frequency": "Semestral (mínimo) ou conforme criticidade",
                "sampling_points": "Representativos das áreas ocupadas",
                "laboratory": "Acreditado / Habilitado",
                "next_scheduled": None,
            },
        }

    @classmethod
    def _get_qai_annual_data(
        cls,
        year: int,
        site_id: Optional[str],
        company: Optional[str],
    ) -> Dict[str, Any]:
        """
        QAI anual (Seção 7):
        - criterion
        - annual_status
        - samples_count
        - indicators (best/worst por parâmetro)
        - summary por semestre
        """
        indicators: List[Dict[str, Any]] = []
        annual_status = "NÃO INFORMADO"
        samples_count = 0

        if indicators:
            if any(i.get("status") == "FORA" for i in indicators):
                annual_status = "NAO_CONFORME"
            else:
                annual_status = "CONFORME"

        # Indicadores padrão conforme RE nº 9/2003 ANVISA (consolidado anual)
        standard_indicators = [
            {
                "parameter": "Temperatura",
                "unit": "°C",
                "limit": "23 a 26 (verão) / 20 a 22 (inverno)",
                "reference": "RE nº 9/2003",
                "first_semester": {"value": None, "status": "PENDENTE"},
                "second_semester": {"value": None, "status": "PENDENTE"},
                "annual_status": "PENDENTE",
            },
            {
                "parameter": "Umidade Relativa",
                "unit": "%",
                "limit": "40 a 65",
                "reference": "RE nº 9/2003",
                "first_semester": {"value": None, "status": "PENDENTE"},
                "second_semester": {"value": None, "status": "PENDENTE"},
                "annual_status": "PENDENTE",
            },
            {
                "parameter": "Velocidade do Ar",
                "unit": "m/s",
                "limit": "≤ 0,25",
                "reference": "RE nº 9/2003",
                "first_semester": {"value": None, "status": "PENDENTE"},
                "second_semester": {"value": None, "status": "PENDENTE"},
                "annual_status": "PENDENTE",
            },
            {
                "parameter": "CO₂ (Dióxido de Carbono)",
                "unit": "ppm",
                "limit": "≤ 1000",
                "reference": "RE nº 9/2003",
                "first_semester": {"value": None, "status": "PENDENTE"},
                "second_semester": {"value": None, "status": "PENDENTE"},
                "annual_status": "PENDENTE",
            },
            {
                "parameter": "Aerodispersoides (Poeira Total)",
                "unit": "µg/m³",
                "limit": "≤ 80",
                "reference": "RE nº 9/2003",
                "first_semester": {"value": None, "status": "PENDENTE"},
                "second_semester": {"value": None, "status": "PENDENTE"},
                "annual_status": "PENDENTE",
            },
            {
                "parameter": "Fungos",
                "unit": "UFC/m³",
                "limit": "≤ 750 (I/E ≤ 1,5)",
                "reference": "RE nº 9/2003",
                "first_semester": {"value": None, "status": "PENDENTE"},
                "second_semester": {"value": None, "status": "PENDENTE"},
                "annual_status": "PENDENTE",
            },
        ]

        return {
            "criterion": DEFAULT_QAI_CRITERION,
            "annual_status": annual_status,
            "samples_count": samples_count,
            "indicators": indicators if indicators else standard_indicators,
            "summary": {
                "total_samples": samples_count,
                "conforming_samples": 0,
                "non_conforming_samples": 0,
                "pending_actions": [],
            },
        }

    @classmethod
    def _get_annexes_status(
        cls,
        *,
        has_inventory: bool,
        has_work_orders: bool,
        has_rt: bool,
        has_art: bool,
        has_qai: bool,
    ) -> List[Dict[str, Any]]:
        """
        Lista padrão de evidências do PMOC:
        - ART/RRT/TRT
        - Inventário
        - Planta/croqui
        - OS/checklists do período
        - Laudo QAI
        - Histórico de filtros
        """

        def ok_or_pending(flag: bool) -> str:
            return "OK" if flag else "PENDENTE"

        annexes = [
            {
                "name": "ART/RRT/TRT do Responsável Técnico",
                "status": ok_or_pending(has_rt and has_art),
            },
            {
                "name": "Inventário (TAGs, capacidade, localização, tipo)",
                "status": ok_or_pending(has_inventory),
            },
            {
                "name": "Planta/Croqui (pontos de insuflamento/retorno/ar externo)",
                "status": "PENDENTE",
                "notes": "Cadastrar/Anexar quando disponível",
            },
            {
                "name": "Registros de execução (OS/checklists do período)",
                "status": ok_or_pending(has_work_orders),
            },
            {
                "name": "Laudo(s) de QAI (quando aplicável)",
                "status": ok_or_pending(has_qai),
            },
            {
                "name": "Histórico de filtros (classe, trocas, dP se houver)",
                "status": "PENDENTE",
                "notes": "Integrar histórico de trocas/inspeções",
            },
        ]
        return annexes

    @classmethod
    def _get_emergency_plan(cls) -> List[str]:
        """Recomendações padrão para falhas e emergências (PMOC completo)."""
        return [
            "Falha total em área crítica: acionar plantão, registrar OS emergencial e aplicar contingência (realocação/isolamento) conforme risco.",
            "Odor/mofo/umidade: inspecionar bandejas/drenos/isolamentos e executar limpeza corretiva; reavaliar necessidade de coleta QAI.",
            "Suspeita de contaminação: revisar filtragem, verificar entrada de ar externo e executar coleta/lab; registrar ações e evidências.",
            "Pane elétrica/incêndio: seguir plano predial e procedimentos de segurança (bloqueio/etiquetagem quando aplicável).",
        ]

    @classmethod
    def _safe_get_site(
        cls, site_id: Optional[str], company: Optional[str]
    ) -> Optional[Site]:
        if site_id:
            return Site.objects.filter(id=site_id).first()
        if company:
            return Site.objects.filter(company__icontains=company).first()
        return Site.objects.first()

    # -------------------------------------------------------------------------
    # EXISTENTES (com pequenos ajustes)
    # -------------------------------------------------------------------------

    @classmethod
    def _get_equipment_data(
        cls,
        site_id: Optional[str],
        company: Optional[str],
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[PMOCEquipmentSummary]:
        """
        Obtém dados dos equipamentos HVAC.

        Ajuste: contagens de preventivas/corretivas agora respeitam o período (quando fornecido),
        o que deixa o relatório mais fiel para PMOC mensal/anual.

        Observação: compliance_rate continua como proxy (dependente do work_orders_generated do plano),
        pois o cálculo "expected no período" exige engine de recorrência do plano.
        """
        queryset = Asset.objects.select_related("site").all()

        if site_id:
            queryset = queryset.filter(site_id=site_id)
        if company:
            queryset = queryset.filter(site__company__icontains=company)

        hvac_types = [
            "CHILLER",
            "AHU",
            "SPLIT",
            "VRF",
            "FANCOIL",
            "TORRE",
            "CONDENSADORA",
            "EVAPORADORA",
            "AC_SPLIT",
            "AC_WINDOW",
            "AC_CASSETTE",
            "AC_DUCTED",
        ]
        queryset = queryset.filter(asset_type__in=hvac_types)

        equipment_list: List[PMOCEquipmentSummary] = []
        for asset in queryset:
            wo_filter = Q(asset=asset)
            if start_date and end_date:
                wo_filter &= Q(
                    created_at__date__gte=start_date, created_at__date__lte=end_date
                )

            preventive_count = WorkOrder.objects.filter(
                wo_filter,
                type=WorkOrder.Type.PREVENTIVE,
                status=WorkOrder.Status.COMPLETED,
            ).count()

            corrective_count = WorkOrder.objects.filter(
                wo_filter,
                type=WorkOrder.Type.CORRECTIVE,
                status=WorkOrder.Status.COMPLETED,
            ).count()

            plans = asset.maintenance_plans.filter(is_active=True)
            if plans.exists():
                total_expected = sum(p.work_orders_generated for p in plans)
                compliance = (
                    (preventive_count / total_expected * 100)
                    if total_expected > 0
                    else 100
                )
            else:
                compliance = 100.0

            asset_type_name = (
                asset.get_asset_type_display()
                if hasattr(asset, "get_asset_type_display")
                else asset.asset_type
            )
            if getattr(asset, "asset_type_other", None):
                asset_type_name = asset.asset_type_other

            equipment_list.append(
                PMOCEquipmentSummary(
                    asset_id=str(asset.id),
                    tag=asset.tag or "",
                    name=asset.name,
                    asset_type=asset_type_name or "Não especificado",
                    manufacturer=asset.manufacturer or "",
                    model=asset.model or "",
                    serial_number=asset.serial_number or "",
                    capacity=asset.capacity,
                    capacity_unit=asset.capacity_unit or "BTU",
                    location=(
                        f"{asset.site.company} - {asset.site.sector}"
                        if asset.site
                        else ""
                    ),
                    status=asset.status,
                    installation_date=asset.installation_date,
                    preventive_count=preventive_count,
                    corrective_count=corrective_count,
                    compliance_rate=round(compliance, 1),
                )
            )
        return equipment_list

    @classmethod
    def _get_maintenance_data(
        cls,
        start_date: date,
        end_date: date,
        site_id: Optional[str],
        company: Optional[str],
    ) -> Dict[str, Any]:
        """Obtém resumo de manutenções do período."""
        queryset = WorkOrder.objects.all()

        if site_id:
            queryset = queryset.filter(asset__site_id=site_id)
        if company:
            queryset = queryset.filter(asset__site__company__icontains=company)

        queryset = queryset.filter(
            Q(created_at__date__gte=start_date, created_at__date__lte=end_date)
        )

        preventive_qs = queryset.filter(type=WorkOrder.Type.PREVENTIVE)
        preventive_completed = preventive_qs.filter(
            status=WorkOrder.Status.COMPLETED
        ).count()
        preventive_total = preventive_qs.count()

        corrective_qs = queryset.filter(type=WorkOrder.Type.CORRECTIVE)
        corrective_opened = corrective_qs.count()
        corrective_completed = corrective_qs.filter(
            status=WorkOrder.Status.COMPLETED
        ).count()

        avg_response = None
        completed_correctives = corrective_qs.filter(
            status=WorkOrder.Status.COMPLETED, completed_at__isnull=False
        )
        if completed_correctives.exists():
            total_hours = 0.0
            count = 0
            for wo in completed_correctives:
                if wo.completed_at and wo.created_at:
                    delta = wo.completed_at - wo.created_at
                    total_hours += delta.total_seconds() / 3600
                    count += 1
            if count:
                avg_response = round(total_hours / count, 1)

        requests = queryset.filter(type=WorkOrder.Type.REQUEST).count()

        total_completed = preventive_completed + corrective_completed
        total_opened = preventive_total + corrective_opened
        overall_compliance = (
            (total_completed / total_opened * 100) if total_opened > 0 else 100
        )
        preventive_compliance = (
            (preventive_completed / preventive_total * 100)
            if preventive_total > 0
            else 100
        )

        return {
            "preventive_scheduled": preventive_total,
            "preventive_completed": preventive_completed,
            "preventive_pending": preventive_total - preventive_completed,
            "preventive_compliance": round(preventive_compliance, 1),
            "corrective_opened": corrective_opened,
            "corrective_completed": corrective_completed,
            "corrective_pending": corrective_opened - corrective_completed,
            "avg_response_hours": avg_response,
            "requests": requests,
            "overall_compliance": round(overall_compliance, 1),
        }

    @classmethod
    def _get_work_orders_summary(
        cls,
        start_date: date,
        end_date: date,
        site_id: Optional[str],
        company: Optional[str],
    ) -> List[Dict[str, Any]]:
        """Obtém lista resumida de OS do período."""
        queryset = WorkOrder.objects.select_related("asset", "asset__site").all()

        if site_id:
            queryset = queryset.filter(asset__site_id=site_id)
        if company:
            queryset = queryset.filter(asset__site__company__icontains=company)

        queryset = queryset.filter(
            created_at__date__gte=start_date, created_at__date__lte=end_date
        ).order_by("-created_at")[:50]

        return [
            {
                "number": wo.number,
                "type": wo.type,
                "type_display": wo.get_type_display(),
                "priority": wo.priority,
                "priority_display": wo.get_priority_display(),
                "status": wo.status,
                "status_display": wo.get_status_display(),
                "asset_tag": wo.asset.tag if wo.asset else "",
                "asset_name": wo.asset.name if wo.asset else "",
                "description": wo.description[:100] if wo.description else "",
                "created_at": wo.created_at.isoformat() if wo.created_at else None,
                "completed_at": (
                    wo.completed_at.isoformat() if wo.completed_at else None
                ),
            }
            for wo in queryset
        ]

    @classmethod
    def _get_work_orders_annual_summary(
        cls,
        year: int,
        site_id: Optional[str],
        company: Optional[str],
    ) -> Dict[str, Any]:
        """Resumo anual de OS."""
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)

        queryset = WorkOrder.objects.all()
        if site_id:
            queryset = queryset.filter(asset__site_id=site_id)
        if company:
            queryset = queryset.filter(asset__site__company__icontains=company)

        queryset = queryset.filter(
            created_at__date__gte=start_date, created_at__date__lte=end_date
        )

        total = queryset.count()
        completed = queryset.filter(status=WorkOrder.Status.COMPLETED).count()
        pending = queryset.exclude(
            status__in=[WorkOrder.Status.COMPLETED, WorkOrder.Status.CANCELLED]
        )

        backlog_aging = 0
        if pending.exists():
            total_days = 0
            for wo in pending:
                delta = timezone.now() - wo.created_at
                total_days += delta.days
            backlog_aging = round(total_days / pending.count(), 1)

        return {
            "total": total,
            "completed": completed,
            "pending": pending.count(),
            "backlog_aging_days": backlog_aging,
        }

    @classmethod
    def _get_monthly_breakdown(
        cls,
        year: int,
        site_id: Optional[str],
        company: Optional[str],
    ) -> List[Dict[str, Any]]:
        """Obtém breakdown mensal de manutenções."""
        breakdown: List[Dict[str, Any]] = []
        for month in range(1, 13):
            start_date = date(year, month, 1)
            if month == 12:
                end_date = date(year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = date(year, month + 1, 1) - timedelta(days=1)

            data = cls._get_maintenance_data(start_date, end_date, site_id, company)
            breakdown.append(
                {
                    "month": month,
                    "month_name": cls._get_month_name(month),
                    "preventive_scheduled": data.get("preventive_scheduled", 0),
                    "preventive_completed": data.get("preventive_completed", 0),
                    "corrective_opened": data.get("corrective_opened", 0),
                    "corrective_completed": data.get("corrective_completed", 0),
                    "compliance_rate": data.get("overall_compliance", 0),
                }
            )
        return breakdown

    @classmethod
    def _get_establishment_info(
        cls, site_id: Optional[str], company: Optional[str]
    ) -> Dict[str, Any]:
        """Obtém informações do estabelecimento."""
        site = cls._safe_get_site(site_id, company)
        if site:
            return {
                "name": site.name,
                "company": site.company,
                "address": site.address,
                "sector": site.sector,
                "subsector": site.subsector,
            }
        return {
            "name": "Não especificado",
            "company": "",
            "address": "",
            "sector": "",
            "subsector": "",
        }

    @classmethod
    def _get_responsible_technician(
        cls, *, site_id: Optional[str] = None, company: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Obtém dados do responsável técnico.

        TODO (ideal): model/cadastro no tenant (ex.: ops/people), com vínculo por site/empresa.
        """
        return {"name": "", "crea": "", "phone": "", "email": ""}

    # ──────────────────────────────────────────────────────────────────────────────
    # NOVAS SEÇÕES PMOC (modelo completo conforme legislação)
    # ──────────────────────────────────────────────────────────────────────────────

    @classmethod
    def _get_responsibilities(
        cls, site_id: Optional[str], company: Optional[str]
    ) -> Dict[str, Any]:
        """
        Seção 3 do PMOC: Responsabilidades.

        Retorna estrutura com responsável legal, técnico e fiscalização.
        TODO: vincular a cadastro real de responsáveis no tenant.
        """
        return {
            "legal": {
                "name": "",
                "role": "Proprietário / Síndico / Administrador",
                "document": "",  # CPF ou CNPJ
                "responsibilities": [
                    "Contratar empresa/profissional habilitado para elaborar e executar o PMOC",
                    "Manter registro de execução do PMOC disponível para fiscalização",
                    "Comunicar ocupantes sobre cuidados com QAI e operação do sistema",
                    "Providenciar recursos para cumprimento do plano",
                ],
            },
            "technical": {
                "name": "",
                "role": "Responsável Técnico",
                "crea": "",
                "phone": "",
                "email": "",
                "responsibilities": [
                    "Elaborar e executar o PMOC conforme normas técnicas",
                    "Emitir ART de execução",
                    "Registrar manutenções preventivas e corretivas",
                    "Orientar equipe operacional",
                    "Garantir condições de QAI conforme padrões legais",
                ],
            },
            "inspection": {
                "authority": "Vigilância Sanitária / ANVISA / Órgão Municipal",
                "responsibilities": [
                    "Fiscalizar cumprimento do PMOC",
                    "Aplicar penalidades em caso de descumprimento",
                    "Solicitar laudos de QAI quando necessário",
                ],
            },
        }

    @classmethod
    def _get_maintenance_routines(
        cls, site_id: Optional[str], company: Optional[str]
    ) -> Dict[str, Any]:
        """
        Seção 6 do PMOC: Plano de Manutenção (rotinas detalhadas por tipo de equipamento).

        Retorna dicionário com rotinas padrão baseadas em normas técnicas.
        """
        return {
            "split_window": {
                "equipment_types": [
                    "Split Hi-Wall",
                    "Split Piso-Teto",
                    "Split Cassete",
                    "Janela",
                    "Portátil",
                ],
                "routines": [
                    {
                        "task": "Limpeza de filtros de ar",
                        "frequency": "Quinzenal",
                        "acceptance_criteria": "Filtros limpos, sem obstrução",
                        "evidence": "Foto antes/depois",
                    },
                    {
                        "task": "Verificação de dreno de condensado",
                        "frequency": "Mensal",
                        "acceptance_criteria": "Dreno desobstruído, sem vazamentos",
                        "evidence": "Registro em check-list",
                    },
                    {
                        "task": "Limpeza da serpentina evaporadora",
                        "frequency": "Semestral",
                        "acceptance_criteria": "Serpentina limpa, aletas alinhadas",
                        "evidence": "Foto + registro",
                    },
                    {
                        "task": "Verificação de carga de gás refrigerante",
                        "frequency": "Anual",
                        "acceptance_criteria": "Pressões dentro da faixa do fabricante",
                        "evidence": "Medição com manifold",
                    },
                    {
                        "task": "Higienização completa (evaporadora + condensadora)",
                        "frequency": "Anual",
                        "acceptance_criteria": "Equipamento limpo e sanitizado",
                        "evidence": "Relatório fotográfico + check-list",
                    },
                ],
            },
            "ahu_fancoil": {
                "equipment_types": ["Self-Contained", "Fan Coil", "AHU", "Rooftop"],
                "routines": [
                    {
                        "task": "Verificação e limpeza de filtros",
                        "frequency": "Mensal",
                        "acceptance_criteria": "Filtros limpos ou substituídos conforme ΔP",
                        "evidence": "Registro de ΔP antes/depois",
                    },
                    {
                        "task": "Inspeção de correias e polias",
                        "frequency": "Mensal",
                        "acceptance_criteria": "Correias tensionadas, sem desgaste",
                        "evidence": "Check-list",
                    },
                    {
                        "task": "Lubrificação de mancais e rolamentos",
                        "frequency": "Trimestral",
                        "acceptance_criteria": "Mancais lubrificados, sem ruído",
                        "evidence": "Registro de lubrificação",
                    },
                    {
                        "task": "Limpeza de bandejas e drenos",
                        "frequency": "Mensal",
                        "acceptance_criteria": "Bandeja limpa, dreno livre",
                        "evidence": "Foto + check-list",
                    },
                    {
                        "task": "Higienização de serpentinas",
                        "frequency": "Semestral",
                        "acceptance_criteria": "Serpentina higienizada",
                        "evidence": "Relatório fotográfico",
                    },
                    {
                        "task": "Análise de vibração",
                        "frequency": "Semestral",
                        "acceptance_criteria": "Vibração dentro dos limites ISO",
                        "evidence": "Relatório de medição",
                    },
                ],
            },
            "cooling_towers": {
                "equipment_types": ["Torre de Resfriamento", "Condensador Evaporativo"],
                "routines": [
                    {
                        "task": "Tratamento químico da água",
                        "frequency": "Contínuo/Mensal",
                        "acceptance_criteria": "pH, condutividade e biocida dentro dos limites",
                        "evidence": "Laudo de tratamento",
                    },
                    {
                        "task": "Limpeza do enchimento",
                        "frequency": "Semestral",
                        "acceptance_criteria": "Enchimento limpo, sem incrustação",
                        "evidence": "Foto + registro",
                    },
                    {
                        "task": "Verificação de eliminadores de gotas",
                        "frequency": "Trimestral",
                        "acceptance_criteria": "Eliminadores íntegros e limpos",
                        "evidence": "Check-list",
                    },
                    {
                        "task": "Inspeção estrutural (bacia, carcaça)",
                        "frequency": "Anual",
                        "acceptance_criteria": "Sem corrosão ou danos estruturais",
                        "evidence": "Relatório de inspeção",
                    },
                    {
                        "task": "Análise microbiológica (Legionella)",
                        "frequency": "Semestral",
                        "acceptance_criteria": "Ausência ou dentro do limite",
                        "evidence": "Laudo laboratorial",
                    },
                ],
            },
            "chillers": {
                "equipment_types": ["Chiller a Ar", "Chiller a Água", "VRF/VRV"],
                "routines": [
                    {
                        "task": "Verificação de pressões e temperaturas",
                        "frequency": "Mensal",
                        "acceptance_criteria": "Parâmetros dentro da faixa do fabricante",
                        "evidence": "Log de operação",
                    },
                    {
                        "task": "Verificação de óleo do compressor",
                        "frequency": "Trimestral",
                        "acceptance_criteria": "Nível e qualidade do óleo OK",
                        "evidence": "Análise de óleo (se aplicável)",
                    },
                    {
                        "task": "Limpeza de condensadores",
                        "frequency": "Trimestral",
                        "acceptance_criteria": "Condensador limpo, ΔT adequado",
                        "evidence": "Medição + foto",
                    },
                    {
                        "task": "Teste de segurança (pressostatos, fusíveis)",
                        "frequency": "Semestral",
                        "acceptance_criteria": "Dispositivos funcionando",
                        "evidence": "Relatório de teste",
                    },
                    {
                        "task": "Análise de vibração",
                        "frequency": "Anual",
                        "acceptance_criteria": "Vibração dentro dos limites",
                        "evidence": "Relatório de medição",
                    },
                ],
            },
        }

    @classmethod
    def _get_communication_plan(cls) -> Dict[str, Any]:
        """
        Seção 10 do PMOC: Comunicação aos ocupantes.

        Define os locais e meios de divulgação das informações sobre QAI e operação.
        """
        return {
            "disclosure_locations": [
                "Recepção / Hall de entrada",
                "Murais de avisos",
                "Intranet / Portal do condomínio",
                "E-mail corporativo",
            ],
            "disclosure_methods": [
                {
                    "method": "Placa informativa",
                    "content": "Contato do RT, telefone da manutenção, orientações básicas",
                    "location": "Próximo aos controles de ar-condicionado",
                },
                {
                    "method": "Cartilha / Folder",
                    "content": "Boas práticas de uso do sistema de climatização",
                    "location": "Distribuição periódica",
                },
                {
                    "method": "Comunicado formal",
                    "content": "Resultados de QAI, manutenções programadas",
                    "location": "E-mail / Mural",
                },
            ],
            "emergency_contacts": {
                "maintenance": "",
                "technical_responsible": "",
                "building_manager": "",
                "fire_department": "193",
                "civil_defense": "199",
            },
        }

    @classmethod
    def _calculate_compliance_status(
        cls,
        maintenance_data: Dict[str, Any],
        qai_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Calcula status geral de conformidade do PMOC.

        Considera taxa de manutenção e QAI (quando disponível).
        """
        maintenance_compliance = maintenance_data.get("overall_compliance", 0)

        # Peso: 70% manutenção, 30% QAI
        if qai_data and qai_data.get("status") == "CONFORME":
            qai_score = 100
        elif qai_data and qai_data.get("status") == "NAO_CONFORME":
            qai_score = 0
        else:
            # Não informado ou pendente - não penaliza, mas não bonifica
            qai_score = 50

        weighted_score = (maintenance_compliance * 0.7) + (qai_score * 0.3)

        if weighted_score >= 90:
            status = "CONFORME"
            color = "green"
        elif weighted_score >= 70:
            status = "PARCIALMENTE CONFORME"
            color = "yellow"
        else:
            status = "NÃO CONFORME"
            color = "red"

        return {
            "overall_score": round(weighted_score, 1),
            "status": status,
            "color": color,
            "breakdown": {
                "maintenance_score": maintenance_compliance,
                "maintenance_weight": 70,
                "qai_score": qai_score,
                "qai_weight": 30,
            },
        }

    @classmethod
    def _get_maintenance_plans_summary(
        cls, site_id: Optional[str], company: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Resumo dos planos de manutenção ativos."""
        queryset = MaintenancePlan.objects.filter(is_active=True).prefetch_related(
            "assets"
        )

        if site_id:
            queryset = queryset.filter(assets__site_id=site_id).distinct()
        if company:
            queryset = queryset.filter(
                assets__site__company__icontains=company
            ).distinct()

        return [
            {
                "name": plan.name,
                "frequency": plan.frequency,
                "frequency_display": plan.get_frequency_display(),
                "asset_count": plan.assets.count(),
                "work_orders_generated": plan.work_orders_generated,
                "next_execution": (
                    plan.next_execution.isoformat() if plan.next_execution else None
                ),
                "last_execution": (
                    plan.last_execution.isoformat() if plan.last_execution else None
                ),
            }
            for plan in queryset
        ]

    @classmethod
    def _group_equipment_by_type(
        cls, equipment_data: List[PMOCEquipmentSummary]
    ) -> List[Dict[str, Any]]:
        type_counts: Dict[str, Dict[str, Any]] = {}
        for eq in equipment_data:
            if eq.asset_type not in type_counts:
                type_counts[eq.asset_type] = {
                    "type": eq.asset_type,
                    "count": 0,
                    "total_capacity_btu": 0,
                }
            type_counts[eq.asset_type]["count"] += 1
            type_counts[eq.asset_type]["total_capacity_btu"] += eq.capacity_btu or 0
        return list(type_counts.values())

    @classmethod
    def _group_equipment_by_status(
        cls, equipment_data: List[PMOCEquipmentSummary]
    ) -> Dict[str, int]:
        status_counts: Dict[str, int] = {}
        for eq in equipment_data:
            status = eq.status or "UNKNOWN"
            status_counts[status] = status_counts.get(status, 0) + 1
        return status_counts

    @classmethod
    def _group_equipment_by_age(
        cls, equipment_data: List[PMOCEquipmentSummary]
    ) -> Dict[str, int]:
        today = date.today()
        age_groups = {
            "0-2 anos": 0,
            "3-5 anos": 0,
            "6-10 anos": 0,
            "11-15 anos": 0,
            "15+ anos": 0,
            "Não informado": 0,
        }

        for eq in equipment_data:
            if not eq.installation_date:
                age_groups["Não informado"] += 1
                continue
            years = (today - eq.installation_date).days / 365
            if years <= 2:
                age_groups["0-2 anos"] += 1
            elif years <= 5:
                age_groups["3-5 anos"] += 1
            elif years <= 10:
                age_groups["6-10 anos"] += 1
            elif years <= 15:
                age_groups["11-15 anos"] += 1
            else:
                age_groups["15+ anos"] += 1

        return age_groups

    @classmethod
    def _calculate_mtbf(cls, asset_id: str, year: int) -> Optional[float]:
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        failures = WorkOrder.objects.filter(
            asset_id=asset_id,
            type=WorkOrder.Type.CORRECTIVE,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
        ).count()
        if failures <= 1:
            return None
        operating_days = (end_date - start_date).days
        return round(operating_days / failures, 1)

    @classmethod
    def _calculate_corrective_ratio(cls, maintenance_data: Dict[str, Any]) -> float:
        preventive = maintenance_data.get("preventive_completed", 0)
        corrective = maintenance_data.get("corrective_completed", 0)
        total = preventive + corrective
        if total == 0:
            return 0
        return round(corrective / total * 100, 1)

    @classmethod
    def _calculate_availability(
        cls, equipment_data: List[PMOCEquipmentSummary], year: int
    ) -> float:
        if not equipment_data:
            return 100.0
        active_count = sum(1 for eq in equipment_data if eq.status == "ACTIVE")
        return round(active_count / len(equipment_data) * 100, 1)

    @classmethod
    def _generate_observations(
        cls,
        maintenance_data: Dict[str, Any],
        equipment_data: List[PMOCEquipmentSummary],
        qai: Optional[Dict[str, Any]] = None,
    ) -> List[str]:
        """Gera observações automáticas baseadas nos dados (inclui QAI quando houver)."""
        observations: List[str] = []

        compliance = maintenance_data.get("overall_compliance", 100)
        if compliance < 80:
            observations.append(
                f"⚠️ Taxa de conformidade de {compliance}% está abaixo da meta de 80%. "
                "Recomenda-se revisão do cronograma de manutenções."
            )
        elif compliance >= 95:
            observations.append(
                f"✅ Excelente taxa de conformidade de {compliance}%. "
                "Plano de manutenção está sendo executado conforme programado."
            )

        pending_preventive = maintenance_data.get("preventive_pending", 0)
        if pending_preventive > 5:
            observations.append(
                f"⚠️ {pending_preventive} manutenções preventivas pendentes. Avaliar capacidade da equipe técnica."
            )

        corrective_ratio = cls._calculate_corrective_ratio(maintenance_data)
        if corrective_ratio > 40:
            observations.append(
                f"⚠️ Razão de corretivas ({corrective_ratio}%) acima do recomendado. "
                "Considerar aumentar frequência das preventivas."
            )

        no_maintenance = sum(
            1
            for eq in equipment_data
            if eq.preventive_count == 0 and eq.corrective_count == 0
        )
        if no_maintenance > 0:
            observations.append(
                f"ℹ️ {no_maintenance} equipamento(s) sem registro de manutenção no período."
            )

        # QAI no texto (se existir)
        if qai:
            qai_status = qai.get("status") or qai.get("annual_status")
            if qai_status in {"NAO_CONFORME", "NÃO CONFORME"}:
                observations.append(
                    "⚠️ QAI: houve não conformidade em parâmetros avaliados. Recomenda-se ação corretiva e nova coleta."
                )
            elif qai_status == "CONFORME":
                observations.append(
                    "✅ QAI: parâmetros avaliados dentro do critério adotado."
                )

        if not observations:
            observations.append("✅ Operação dentro dos parâmetros normais.")
        return observations

    @classmethod
    def _generate_annual_conclusions(
        cls,
        maintenance_data: Dict[str, Any],
        equipment_data: List[PMOCEquipmentSummary],
        qai: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Gera conclusões e recomendações para relatório anual (status alinhado)."""
        observations = cls._generate_observations(
            maintenance_data, equipment_data, qai=qai
        )

        recommendations: List[str] = []

        compliance = maintenance_data.get("overall_compliance", 100)
        if compliance < 90:
            recommendations.append(
                "Revisar e atualizar planos de manutenção preventiva"
            )

        corrective_ratio = cls._calculate_corrective_ratio(maintenance_data)
        if corrective_ratio > 30:
            recommendations.append(
                "Implementar programa de manutenção preditiva para reduzir corretivas"
            )

        avg_response = maintenance_data.get("avg_response_hours")
        if avg_response and avg_response > 24:
            recommendations.append(
                "Otimizar tempo de resposta para manutenções corretivas"
            )

        old_equipment = sum(
            1
            for eq in equipment_data
            if eq.installation_date
            and (date.today() - eq.installation_date).days > 3650
        )
        if equipment_data and old_equipment > len(equipment_data) * 0.3:
            recommendations.append(
                f"{old_equipment} equipamentos com mais de 10 anos. Avaliar plano de renovação do parque."
            )

        # Recomendação extra quando QAI não informado/pendente
        if qai and (
            qai.get("annual_status") == "NÃO INFORMADO"
            or qai.get("status") == "NÃO INFORMADO"
        ):
            recommendations.append(
                "Cadastrar plano de coletas e anexar laudos de QAI conforme critério adotado"
            )

        if not recommendations:
            recommendations.append("Manter plano atual de manutenção e monitoramento")

        overall_status = "CONFORME" if compliance >= 80 else "NAO_CONFORME"
        return {
            "summary": observations,
            "recommendations": recommendations,
            "overall_status": overall_status,
        }

    @classmethod
    def _get_month_name(cls, month: int) -> str:
        months = {
            1: "Janeiro",
            2: "Fevereiro",
            3: "Março",
            4: "Abril",
            5: "Maio",
            6: "Junho",
            7: "Julho",
            8: "Agosto",
            9: "Setembro",
            10: "Outubro",
            11: "Novembro",
            12: "Dezembro",
        }
        return months.get(month, "")
