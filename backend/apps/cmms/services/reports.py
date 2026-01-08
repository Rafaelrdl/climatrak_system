"""
Services para Geração de Relatórios PMOC

Implementa a geração de relatórios PMOC Mensal e Anual conforme
regulamentações ANVISA e normas técnicas (ABNT NBR 16401).

Referências:
- Portaria 3523/1998 MS (PMOC obrigatório)
- RE nº 9/2003 ANVISA (padrões de qualidade do ar)
- ABNT NBR 16401 (parâmetros de projeto de instalações)
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from django.db.models import Avg, Count, F, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from apps.assets.models import Asset, Site
from apps.cmms.models import MaintenancePlan, WorkOrder


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
    capacity_btu: Optional[int]
    location: str
    status: str
    installation_date: Optional[date]
    preventive_count: int
    corrective_count: int
    compliance_rate: float


@dataclass
class PMOCMaintenanceSummary:
    """Resumo de manutenções para PMOC."""
    total_preventive: int
    total_corrective: int
    total_inspections: int
    compliance_rate: float
    average_response_time_hours: Optional[float]
    pending_work_orders: int
    completed_work_orders: int


@dataclass
class PMOCMonthlyData:
    """Dados mensais para relatório PMOC."""
    month: date
    preventive_scheduled: int
    preventive_completed: int
    corrective_opened: int
    corrective_completed: int
    compliance_rate: float


class PMOCReportService:
    """
    Serviço para geração de relatórios PMOC.
    
    O PMOC (Plano de Manutenção, Operação e Controle) é obrigatório
    para sistemas de climatização conforme Portaria 3523/1998 do
    Ministério da Saúde.
    """
    
    @classmethod
    def generate_monthly_report(
        cls,
        month: int,
        year: int,
        site_id: Optional[str] = None,
        company: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Gera relatório PMOC mensal.
        
        Args:
            month: Mês do relatório (1-12)
            year: Ano do relatório
            site_id: Filtrar por site específico (opcional)
            company: Filtrar por empresa (opcional)
            
        Returns:
            Dicionário com dados do relatório PMOC mensal
        """
        # Definir período do relatório
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)
        
        # Obter dados
        equipment_data = cls._get_equipment_data(site_id, company)
        maintenance_data = cls._get_maintenance_data(start_date, end_date, site_id, company)
        work_orders_data = cls._get_work_orders_summary(start_date, end_date, site_id, company)
        responsible_tech = cls._get_responsible_technician()
        
        # Calcular métricas
        total_equipment = len(equipment_data)
        total_capacity_btu = sum(eq.capacity_btu or 0 for eq in equipment_data)
        
        # Montar relatório
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
            "filters": {
                "site_id": site_id,
                "company": company,
            },
            
            # 1. Identificação do estabelecimento
            "establishment": cls._get_establishment_info(site_id, company),
            
            # 2. Resumo dos sistemas de climatização
            "climate_systems": {
                "total_equipment": total_equipment,
                "total_capacity_btu": total_capacity_btu,
                "total_capacity_tr": round(total_capacity_btu / 12000, 2) if total_capacity_btu else 0,
                "equipment_by_type": cls._group_equipment_by_type(equipment_data),
                "equipment_by_status": cls._group_equipment_by_status(equipment_data),
            },
            
            # 3. Manutenções realizadas
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
                    "average_response_hours": maintenance_data.get("avg_response_hours"),
                },
                "inspections": {
                    "total": maintenance_data.get("inspections", 0),
                },
                "overall_compliance_rate": maintenance_data.get("overall_compliance", 0),
            },
            
            # 4. Lista detalhada de equipamentos
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
            
            # 5. Detalhamento das OS do período
            "work_orders": work_orders_data,
            
            # 6. Responsável técnico
            "responsible_technician": responsible_tech,
            
            # 7. Observações e recomendações
            "observations": cls._generate_observations(maintenance_data, equipment_data),
        }
        
        return report
    
    @classmethod
    def generate_annual_report(
        cls,
        year: int,
        site_id: Optional[str] = None,
        company: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Gera relatório PMOC anual consolidado.
        
        Args:
            year: Ano do relatório
            site_id: Filtrar por site específico (opcional)
            company: Filtrar por empresa (opcional)
            
        Returns:
            Dicionário com dados do relatório PMOC anual
        """
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        
        # Dados gerais
        equipment_data = cls._get_equipment_data(site_id, company)
        maintenance_data = cls._get_maintenance_data(start_date, end_date, site_id, company)
        monthly_breakdown = cls._get_monthly_breakdown(year, site_id, company)
        work_orders_summary = cls._get_work_orders_annual_summary(year, site_id, company)
        
        total_equipment = len(equipment_data)
        total_capacity_btu = sum(eq.capacity_btu or 0 for eq in equipment_data)
        
        report = {
            "report_type": "PMOC_ANUAL",
            "period": {
                "year": year,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
            "generated_at": timezone.now().isoformat(),
            "filters": {
                "site_id": site_id,
                "company": company,
            },
            
            # 1. Identificação do estabelecimento
            "establishment": cls._get_establishment_info(site_id, company),
            
            # 2. Inventário de sistemas de climatização
            "climate_systems": {
                "total_equipment": total_equipment,
                "total_capacity_btu": total_capacity_btu,
                "total_capacity_tr": round(total_capacity_btu / 12000, 2) if total_capacity_btu else 0,
                "equipment_by_type": cls._group_equipment_by_type(equipment_data),
                "equipment_by_status": cls._group_equipment_by_status(equipment_data),
                "equipment_by_age": cls._group_equipment_by_age(equipment_data),
            },
            
            # 3. Consolidado anual de manutenções
            "maintenance_annual": {
                "total_preventive": maintenance_data.get("preventive_completed", 0),
                "total_corrective": maintenance_data.get("corrective_completed", 0),
                "total_inspections": maintenance_data.get("inspections", 0),
                "total_work_orders": work_orders_summary.get("total", 0),
                "overall_compliance_rate": maintenance_data.get("overall_compliance", 0),
                "average_mttr_hours": maintenance_data.get("avg_response_hours"),
            },
            
            # 4. Breakdown mensal
            "monthly_breakdown": monthly_breakdown,
            
            # 5. Análise de desempenho por equipamento
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
            
            # 6. Indicadores de desempenho (KPIs)
            "kpis": {
                "preventive_compliance": maintenance_data.get("preventive_compliance", 0),
                "corrective_ratio": cls._calculate_corrective_ratio(maintenance_data),
                "average_response_time": maintenance_data.get("avg_response_hours"),
                "equipment_availability": cls._calculate_availability(equipment_data, year),
                "backlog_aging": work_orders_summary.get("backlog_aging_days", 0),
            },
            
            # 7. Planos de manutenção ativos
            "maintenance_plans": cls._get_maintenance_plans_summary(site_id, company),
            
            # 8. Responsável técnico
            "responsible_technician": cls._get_responsible_technician(),
            
            # 9. Conclusões e recomendações
            "conclusions": cls._generate_annual_conclusions(maintenance_data, equipment_data),
        }
        
        return report
    
    # ==========================================
    # Métodos auxiliares privados
    # ==========================================
    
    @classmethod
    def _get_equipment_data(
        cls,
        site_id: Optional[str],
        company: Optional[str],
    ) -> List[PMOCEquipmentSummary]:
        """Obtém dados dos equipamentos de climatização."""
        queryset = Asset.objects.select_related('site', 'asset_type_custom').all()
        
        if site_id:
            queryset = queryset.filter(site_id=site_id)
        if company:
            queryset = queryset.filter(site__company__icontains=company)
        
        # Filtrar apenas equipamentos HVAC (por tipo)
        hvac_types = ['CHILLER', 'AHU', 'SPLIT', 'VRF', 'FANCOIL', 'TORRE', 'CONDENSADORA', 'EVAPORADORA']
        queryset = queryset.filter(
            Q(asset_type__in=hvac_types) | 
            Q(asset_type_custom__code__in=hvac_types)
        )
        
        equipment_list = []
        for asset in queryset:
            # Contar manutenções do equipamento
            preventive_count = WorkOrder.objects.filter(
                asset=asset,
                type=WorkOrder.Type.PREVENTIVE,
                status=WorkOrder.Status.COMPLETED,
            ).count()
            
            corrective_count = WorkOrder.objects.filter(
                asset=asset,
                type=WorkOrder.Type.CORRECTIVE,
                status=WorkOrder.Status.COMPLETED,
            ).count()
            
            # Calcular taxa de conformidade
            plans = asset.maintenance_plans.filter(is_active=True)
            if plans.exists():
                total_expected = sum(p.work_orders_generated for p in plans)
                compliance = (preventive_count / total_expected * 100) if total_expected > 0 else 100
            else:
                compliance = 100.0
            
            # Determinar tipo do ativo
            asset_type_name = asset.asset_type
            if asset.asset_type_custom:
                asset_type_name = asset.asset_type_custom.name
            
            equipment_list.append(PMOCEquipmentSummary(
                asset_id=str(asset.id),
                tag=asset.tag or "",
                name=asset.name,
                asset_type=asset_type_name or "Não especificado",
                manufacturer=asset.manufacturer or "",
                model=asset.model or "",
                serial_number=asset.serial_number or "",
                capacity_btu=asset.capacity_btu,
                location=f"{asset.site.company} - {asset.site.sector}" if asset.site else "",
                status=asset.status,
                installation_date=asset.installation_date,
                preventive_count=preventive_count,
                corrective_count=corrective_count,
                compliance_rate=round(compliance, 1),
            ))
        
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
        
        # Filtrar por período (usando created_at ou scheduled_date)
        period_filter = Q(created_at__date__gte=start_date, created_at__date__lte=end_date)
        queryset = queryset.filter(period_filter)
        
        # Contar preventivas
        preventive_qs = queryset.filter(type=WorkOrder.Type.PREVENTIVE)
        preventive_completed = preventive_qs.filter(status=WorkOrder.Status.COMPLETED).count()
        preventive_total = preventive_qs.count()
        
        # Contar corretivas
        corrective_qs = queryset.filter(type=WorkOrder.Type.CORRECTIVE)
        corrective_opened = corrective_qs.count()
        corrective_completed = corrective_qs.filter(status=WorkOrder.Status.COMPLETED).count()
        
        # Calcular tempo médio de resposta (para corretivas completadas)
        avg_response = None
        completed_correctives = corrective_qs.filter(
            status=WorkOrder.Status.COMPLETED,
            completed_at__isnull=False,
        )
        if completed_correctives.exists():
            total_hours = 0
            count = 0
            for wo in completed_correctives:
                if wo.completed_at and wo.created_at:
                    delta = wo.completed_at - wo.created_at
                    total_hours += delta.total_seconds() / 3600
                    count += 1
            if count > 0:
                avg_response = round(total_hours / count, 1)
        
        # Inspeções (tipo INSPECTION)
        inspections = queryset.filter(type=WorkOrder.Type.INSPECTION).count()
        
        # Calcular conformidade geral
        total_completed = preventive_completed + corrective_completed
        total_opened = preventive_total + corrective_opened
        overall_compliance = (total_completed / total_opened * 100) if total_opened > 0 else 100
        
        # Conformidade preventiva
        preventive_compliance = (preventive_completed / preventive_total * 100) if preventive_total > 0 else 100
        
        return {
            "preventive_scheduled": preventive_total,
            "preventive_completed": preventive_completed,
            "preventive_pending": preventive_total - preventive_completed,
            "preventive_compliance": round(preventive_compliance, 1),
            "corrective_opened": corrective_opened,
            "corrective_completed": corrective_completed,
            "corrective_pending": corrective_opened - corrective_completed,
            "avg_response_hours": avg_response,
            "inspections": inspections,
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
        queryset = WorkOrder.objects.select_related('asset', 'asset__site').all()
        
        if site_id:
            queryset = queryset.filter(asset__site_id=site_id)
        if company:
            queryset = queryset.filter(asset__site__company__icontains=company)
        
        queryset = queryset.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).order_by('-created_at')[:50]  # Limitar a 50 OS
        
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
                "completed_at": wo.completed_at.isoformat() if wo.completed_at else None,
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
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )
        
        total = queryset.count()
        completed = queryset.filter(status=WorkOrder.Status.COMPLETED).count()
        pending = queryset.exclude(
            status__in=[WorkOrder.Status.COMPLETED, WorkOrder.Status.CANCELLED]
        )
        
        # Calcular aging médio do backlog
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
        breakdown = []
        
        for month in range(1, 13):
            start_date = date(year, month, 1)
            if month == 12:
                end_date = date(year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = date(year, month + 1, 1) - timedelta(days=1)
            
            data = cls._get_maintenance_data(start_date, end_date, site_id, company)
            
            breakdown.append({
                "month": month,
                "month_name": cls._get_month_name(month),
                "preventive_scheduled": data.get("preventive_scheduled", 0),
                "preventive_completed": data.get("preventive_completed", 0),
                "corrective_opened": data.get("corrective_opened", 0),
                "corrective_completed": data.get("corrective_completed", 0),
                "compliance_rate": data.get("overall_compliance", 0),
            })
        
        return breakdown
    
    @classmethod
    def _get_establishment_info(
        cls,
        site_id: Optional[str],
        company: Optional[str],
    ) -> Dict[str, Any]:
        """Obtém informações do estabelecimento."""
        if site_id:
            try:
                site = Site.objects.get(id=site_id)
                return {
                    "name": site.name,
                    "company": site.company,
                    "address": site.address,
                    "sector": site.sector,
                    "subsector": site.subsector,
                }
            except Site.DoesNotExist:
                pass
        
        if company:
            site = Site.objects.filter(company__icontains=company).first()
            if site:
                return {
                    "name": site.name,
                    "company": site.company,
                    "address": site.address,
                    "sector": site.sector,
                    "subsector": site.subsector,
                }
        
        # Retornar dados do primeiro site disponível
        site = Site.objects.first()
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
    def _get_responsible_technician(cls) -> Dict[str, Any]:
        """Obtém dados do responsável técnico."""
        # TODO: Implementar busca do RT cadastrado no tenant
        return {
            "name": "",
            "crea": "",
            "phone": "",
            "email": "",
        }
    
    @classmethod
    def _get_maintenance_plans_summary(
        cls,
        site_id: Optional[str],
        company: Optional[str],
    ) -> List[Dict[str, Any]]:
        """Resumo dos planos de manutenção ativos."""
        queryset = MaintenancePlan.objects.filter(is_active=True).prefetch_related('assets')
        
        if site_id:
            queryset = queryset.filter(assets__site_id=site_id).distinct()
        if company:
            queryset = queryset.filter(assets__site__company__icontains=company).distinct()
        
        return [
            {
                "name": plan.name,
                "frequency": plan.frequency,
                "frequency_display": plan.get_frequency_display(),
                "asset_count": plan.assets.count(),
                "work_orders_generated": plan.work_orders_generated,
                "next_execution": plan.next_execution.isoformat() if plan.next_execution else None,
                "last_execution": plan.last_execution.isoformat() if plan.last_execution else None,
            }
            for plan in queryset
        ]
    
    @classmethod
    def _group_equipment_by_type(
        cls,
        equipment_data: List[PMOCEquipmentSummary],
    ) -> List[Dict[str, Any]]:
        """Agrupa equipamentos por tipo."""
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
        cls,
        equipment_data: List[PMOCEquipmentSummary],
    ) -> Dict[str, int]:
        """Agrupa equipamentos por status."""
        status_counts: Dict[str, int] = {}
        
        for eq in equipment_data:
            status = eq.status or "UNKNOWN"
            status_counts[status] = status_counts.get(status, 0) + 1
        
        return status_counts
    
    @classmethod
    def _group_equipment_by_age(
        cls,
        equipment_data: List[PMOCEquipmentSummary],
    ) -> Dict[str, int]:
        """Agrupa equipamentos por faixa de idade."""
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
        """Calcula MTBF (Mean Time Between Failures) em dias."""
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
        
        # MTBF = dias operacionais / número de falhas
        operating_days = (end_date - start_date).days
        return round(operating_days / failures, 1)
    
    @classmethod
    def _calculate_corrective_ratio(cls, maintenance_data: Dict[str, Any]) -> float:
        """Calcula razão corretivas/preventivas."""
        preventive = maintenance_data.get("preventive_completed", 0)
        corrective = maintenance_data.get("corrective_completed", 0)
        
        total = preventive + corrective
        if total == 0:
            return 0
        
        return round(corrective / total * 100, 1)
    
    @classmethod
    def _calculate_availability(
        cls,
        equipment_data: List[PMOCEquipmentSummary],
        year: int,
    ) -> float:
        """Calcula disponibilidade média dos equipamentos."""
        if not equipment_data:
            return 100.0
        
        # Disponibilidade = (tempo operacional / tempo total) * 100
        # Simplificado: equipamentos ativos / total
        active_count = sum(1 for eq in equipment_data if eq.status == "ACTIVE")
        return round(active_count / len(equipment_data) * 100, 1)
    
    @classmethod
    def _generate_observations(
        cls,
        maintenance_data: Dict[str, Any],
        equipment_data: List[PMOCEquipmentSummary],
    ) -> List[str]:
        """Gera observações automáticas baseadas nos dados."""
        observations = []
        
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
                f"⚠️ {pending_preventive} manutenções preventivas pendentes. "
                "Avaliar capacidade da equipe técnica."
            )
        
        corrective_ratio = cls._calculate_corrective_ratio(maintenance_data)
        if corrective_ratio > 40:
            observations.append(
                f"⚠️ Razão de corretivas ({corrective_ratio}%) acima do recomendado. "
                "Considerar aumentar frequência das preventivas."
            )
        
        # Equipamentos sem manutenção
        no_maintenance = sum(
            1 for eq in equipment_data 
            if eq.preventive_count == 0 and eq.corrective_count == 0
        )
        if no_maintenance > 0:
            observations.append(
                f"ℹ️ {no_maintenance} equipamento(s) sem registro de manutenção no período."
            )
        
        if not observations:
            observations.append("✅ Operação dentro dos parâmetros normais.")
        
        return observations
    
    @classmethod
    def _generate_annual_conclusions(
        cls,
        maintenance_data: Dict[str, Any],
        equipment_data: List[PMOCEquipmentSummary],
    ) -> Dict[str, Any]:
        """Gera conclusões e recomendações para relatório anual."""
        observations = cls._generate_observations(maintenance_data, equipment_data)
        
        recommendations = []
        
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
        
        # Equipamentos antigos
        old_equipment = sum(
            1 for eq in equipment_data 
            if eq.installation_date and (date.today() - eq.installation_date).days > 3650
        )
        if old_equipment > len(equipment_data) * 0.3:
            recommendations.append(
                f"{old_equipment} equipamentos com mais de 10 anos. "
                "Avaliar plano de renovação do parque de equipamentos."
            )
        
        if not recommendations:
            recommendations.append(
                "Manter plano atual de manutenção e monitoramento"
            )
        
        return {
            "summary": observations,
            "recommendations": recommendations,
            "overall_status": "CONFORME" if compliance >= 80 else "ATENÇÃO",
        }
    
    @classmethod
    def _get_month_name(cls, month: int) -> str:
        """Retorna nome do mês em português."""
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
