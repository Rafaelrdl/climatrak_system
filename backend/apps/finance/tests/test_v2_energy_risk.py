"""
Testes para V2 Finance - Energy, Baseline, Risk/BAR

Testes de:
- EnergyTariff CRUD e cálculo de tarifas
- EnergyReading CRUD e processamento de custos
- Baseline workflow e cálculo de savings automático
- RiskSnapshot CRUD e cálculo de campos derivados
- BAR Calculator e agregações

Ref: docs/delivery/02-backlog-issues.md (V2 M4/M5)
"""

from datetime import date, time, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from django_tenants.test.cases import TenantTestCase

# Imports para criar Asset nos testes
from apps.assets.models import Asset, Site
from apps.finance.auto_savings_engine import AutoSavingsEngine
from apps.finance.bar_calculator import BARCalculator
from apps.finance.energy_engine import EnergyCostEngine
from apps.finance.models import (
    Baseline,
    CostCenter,
    CostTransaction,
    EnergyReading,
    EnergyTariff,
    RiskSnapshot,
    SavingsEvent,
)
from apps.finance.views import BARViewSet, EnergyTariffViewSet, RiskSnapshotViewSet

# ============================================================================
# EnergyTariff Tests
# ============================================================================


class EnergyTariffModelTests(TenantTestCase):
    """Testes do model EnergyTariff."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Company"
        tenant.is_active = True

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="energy_test",
            email="energy@test.com",
            password="testpass123",
        )

    def test_create_energy_tariff(self):
        """Testa criação de tarifa de energia."""
        tariff = EnergyTariff.objects.create(
            name="CEMIG B3 Comercial",
            distributor="CEMIG",
            tariff_class="B3",
            rate_off_peak=Decimal("0.75"),
            rate_peak=Decimal("1.35"),
            peak_start=time(18, 0),
            peak_end=time(21, 0),
            flag_verde=Decimal("0"),
            flag_amarela=Decimal("0.02"),
            flag_vermelha_1=Decimal("0.04"),
            flag_vermelha_2=Decimal("0.06"),
            effective_from=date.today(),
            created_by=self.user,
        )

        self.assertIsNotNone(tariff.id)
        self.assertEqual(tariff.distributor, "CEMIG")
        self.assertTrue(tariff.is_active)

    def test_get_rate_for_time_off_peak(self):
        """Testa cálculo de tarifa fora de ponta."""
        tariff = EnergyTariff.objects.create(
            name="Test Tariff",
            distributor="Test",
            rate_off_peak=Decimal("0.80"),
            rate_peak=Decimal("1.50"),
            peak_start=time(18, 0),
            peak_end=time(21, 0),
            effective_from=date.today(),
        )

        # Horário fora de ponta (10:00)
        rate = tariff.get_rate_for_time(time(10, 0), "verde")
        self.assertEqual(rate, Decimal("0.80"))

    def test_get_rate_for_time_peak(self):
        """Testa cálculo de tarifa no horário de ponta."""
        tariff = EnergyTariff.objects.create(
            name="Test Tariff",
            distributor="Test",
            rate_off_peak=Decimal("0.80"),
            rate_peak=Decimal("1.50"),
            peak_start=time(18, 0),
            peak_end=time(21, 0),
            effective_from=date.today(),
        )

        # Horário de ponta (19:00)
        rate = tariff.get_rate_for_time(time(19, 0), "verde")
        self.assertEqual(rate, Decimal("1.50"))

    def test_get_rate_with_flag_amarela(self):
        """Testa cálculo de tarifa com bandeira amarela."""
        tariff = EnergyTariff.objects.create(
            name="Test Tariff",
            distributor="Test",
            rate_off_peak=Decimal("0.80"),
            rate_peak=Decimal("1.50"),
            peak_start=time(18, 0),
            peak_end=time(21, 0),
            flag_amarela=Decimal("0.025"),
            effective_from=date.today(),
        )

        # Fora de ponta com bandeira amarela
        rate = tariff.get_rate_for_time(time(10, 0), "amarela")
        self.assertEqual(rate, Decimal("0.825"))

    def test_get_tariff_for_date(self):
        """Testa busca de tarifa vigente por data."""
        # Tarifa antiga (vencida)
        EnergyTariff.objects.create(
            name="Tarifa Antiga",
            distributor="CEMIG",
            rate_off_peak=Decimal("0.70"),
            rate_peak=Decimal("1.20"),
            peak_start=time(18, 0),
            peak_end=time(21, 0),
            effective_from=date(2023, 1, 1),
            effective_to=date(2023, 12, 31),
        )

        # Tarifa vigente
        current = EnergyTariff.objects.create(
            name="Tarifa Atual",
            distributor="CEMIG",
            rate_off_peak=Decimal("0.80"),
            rate_peak=Decimal("1.40"),
            peak_start=time(18, 0),
            peak_end=time(21, 0),
            effective_from=date(2024, 1, 1),
        )

        tariff = EnergyTariff.get_tariff_for_date("CEMIG", date.today())
        self.assertEqual(tariff, current)

    def test_vigencia_validation(self):
        """Testa validação de vigência (fim < início)."""
        from django.core.exceptions import ValidationError

        tariff = EnergyTariff(
            name="Invalid",
            distributor="Test",
            rate_off_peak=Decimal("0.80"),
            rate_peak=Decimal("1.50"),
            peak_start=time(18, 0),
            peak_end=time(21, 0),
            effective_from=date(2024, 12, 31),
            effective_to=date(2024, 1, 1),  # Antes do início
        )

        with self.assertRaises(ValidationError):
            tariff.full_clean()


class EnergyTariffAPITests(TenantTestCase):
    """Testes da API de Tarifas de Energia."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Company"
        tenant.is_active = True

    def setUp(self):
        self.factory = APIRequestFactory()
        User = get_user_model()
        self.user = User.objects.create_user(
            username="energy_api_test",
            email="energy_api@test.com",
            password="testpass123",
        )

        self.tariff = EnergyTariff.objects.create(
            name="CEMIG B3",
            distributor="CEMIG",
            tariff_class="B3",
            rate_off_peak=Decimal("0.75"),
            rate_peak=Decimal("1.35"),
            peak_start=time(18, 0),
            peak_end=time(21, 0),
            effective_from=date.today() - timedelta(days=30),
            created_by=self.user,
        )

    def test_list_tariffs(self):
        """Testa listagem de tarifas."""
        view = EnergyTariffViewSet.as_view({"get": "list"})
        request = self.factory.get("/api/finance/energy-tariffs/")
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_create_tariff(self):
        """Testa criação de tarifa via API."""
        view = EnergyTariffViewSet.as_view({"post": "create"})
        data = {
            "name": "CPFL Comercial",
            "distributor": "CPFL",
            "tariff_class": "B3",
            "rate_off_peak": "0.70",
            "rate_peak": "1.25",
            "peak_start": "18:00",
            "peak_end": "21:00",
            "effective_from": str(date.today()),
        }
        request = self.factory.post("/api/finance/energy-tariffs/", data)
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["distributor"], "CPFL")

    def test_current_tariffs(self):
        """Testa endpoint de tarifas vigentes."""
        # Criar tarifa vencida
        EnergyTariff.objects.create(
            name="Vencida",
            distributor="Test",
            rate_off_peak=Decimal("0.50"),
            rate_peak=Decimal("1.00"),
            peak_start=time(18, 0),
            peak_end=time(21, 0),
            effective_from=date(2020, 1, 1),
            effective_to=date(2020, 12, 31),
        )

        view = EnergyTariffViewSet.as_view({"get": "current"})
        request = self.factory.get("/api/finance/energy-tariffs/current/")
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Deve retornar apenas a tarifa vigente
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "CEMIG B3")

    def test_calculate_rate(self):
        """Testa endpoint de cálculo de taxa."""
        view = EnergyTariffViewSet.as_view({"get": "calculate_rate"})
        request = self.factory.get(
            f"/api/finance/energy-tariffs/{self.tariff.id}/calculate_rate/",
            {"hour": 19, "minute": 0, "bandeira": "verde"},
        )
        force_authenticate(request, user=self.user)

        response = view(request, pk=str(self.tariff.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_peak"])
        self.assertEqual(float(response.data["effective_rate"]), 1.35)


# ============================================================================
# EnergyReading Tests
# ============================================================================


class EnergyReadingModelTests(TenantTestCase):
    """Testes do model EnergyReading."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Company"
        tenant.is_active = True

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="reading_test",
            email="reading@test.com",
            password="testpass123",
        )

        self.cost_center = CostCenter.objects.create(
            code="CC-ENERGY-01",
            name="Centro Energia",
            is_active=True,
        )

        self.tariff = EnergyTariff.objects.create(
            name="Test Tariff",
            distributor="Test",
            rate_off_peak=Decimal("0.80"),
            rate_peak=Decimal("1.50"),
            peak_start=time(18, 0),
            peak_end=time(21, 0),
            effective_from=date.today() - timedelta(days=30),
        )

        # Criar Site e Asset reais
        self.site = Site.objects.create(
            name="Test Site",
            company="Test Company",
            is_active=True,
        )
        self.asset = Asset.objects.create(
            tag="TEST-ENERGY-001",
            name="Test Energy Asset",
            site=self.site,
            asset_type="CHILLER",
            status="OK",
        )

    def test_create_energy_reading(self):
        """Testa criação de leitura de energia."""
        reading = EnergyReading.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            tariff=self.tariff,
            reading_date=date.today(),
            kwh_total=Decimal("450.500"),
            kwh_peak=Decimal("135.150"),
            kwh_off_peak=Decimal("315.350"),
            source=EnergyReading.Source.METER,
            bandeira="verde",
            created_by=self.user,
        )

        self.assertIsNotNone(reading.id)
        self.assertEqual(reading.kwh_total, Decimal("450.500"))

    def test_unique_asset_date_constraint(self):
        """Testa constraint de unicidade (asset + date)."""
        from django.core.exceptions import ValidationError

        EnergyReading.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            reading_date=date.today(),
            kwh_total=Decimal("100"),
        )

        # full_clean() é chamado no save() e levanta ValidationError
        with self.assertRaises(ValidationError):
            EnergyReading.objects.create(
                asset=self.asset,
                cost_center=self.cost_center,
                reading_date=date.today(),  # Mesma data
                kwh_total=Decimal("200"),
            )


class EnergyCostEngineTests(TenantTestCase):
    """Testes do EnergyCostEngine."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Company"
        tenant.is_active = True

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="engine_test",
            email="engine@test.com",
            password="testpass123",
        )

        self.cost_center = CostCenter.objects.create(
            code="CC-ENGINE-01",
            name="Centro Engine",
            is_active=True,
        )

        self.tariff = EnergyTariff.objects.create(
            name="Test Tariff",
            distributor="Test",
            rate_off_peak=Decimal("0.80"),
            rate_peak=Decimal("1.50"),
            peak_start=time(18, 0),
            peak_end=time(21, 0),
            flag_verde=Decimal("0"),
            flag_amarela=Decimal("0.025"),
            effective_from=date.today() - timedelta(days=30),
        )

        # Criar Site e Asset reais
        self.site = Site.objects.create(
            name="Test Site Engine",
            company="Test Company",
            is_active=True,
        )
        self.asset = Asset.objects.create(
            tag="TEST-ENGINE-001",
            name="Test Engine Asset",
            site=self.site,
            asset_type="CHILLER",
            status="OK",
        )

    def test_calculate_reading_cost_with_peak_breakdown(self):
        """Testa cálculo de custo com consumo ponta/fora ponta."""
        reading = EnergyReading.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            tariff=self.tariff,
            reading_date=date.today(),
            kwh_total=Decimal("100"),
            kwh_peak=Decimal("30"),  # 30 kWh × R$ 1.50 = R$ 45.00
            kwh_off_peak=Decimal("70"),  # 70 kWh × R$ 0.80 = R$ 56.00
            bandeira="verde",
        )

        cost = EnergyCostEngine.calculate_reading_cost(reading)

        # 45.00 + 56.00 = 101.00
        self.assertEqual(cost, Decimal("101.00"))

    def test_calculate_reading_cost_with_flag_amarela(self):
        """Testa cálculo com bandeira amarela."""
        reading = EnergyReading.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            tariff=self.tariff,
            reading_date=date.today() - timedelta(days=1),
            kwh_total=Decimal("100"),
            kwh_peak=Decimal("30"),  # 30 × (1.50 + 0.025) = 45.75
            kwh_off_peak=Decimal("70"),  # 70 × (0.80 + 0.025) = 57.75
            bandeira="amarela",
        )

        cost = EnergyCostEngine.calculate_reading_cost(reading)

        # 45.75 + 57.75 = 103.50
        self.assertEqual(cost, Decimal("103.50"))

    def test_calculate_reading_cost_total_only(self):
        """Testa cálculo com apenas consumo total (estimativa)."""
        reading = EnergyReading.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            tariff=self.tariff,
            reading_date=date.today() - timedelta(days=2),
            kwh_total=Decimal("100"),
            # Sem breakdown ponta/fora ponta
            bandeira="verde",
        )

        cost = EnergyCostEngine.calculate_reading_cost(reading)

        # Média ponderada: 0.7 × 0.80 + 0.3 × 1.50 = 0.56 + 0.45 = 1.01
        # 100 × 1.01 = 101.00
        self.assertEqual(cost, Decimal("101.00"))

    @patch("apps.finance.energy_engine.EventPublisher.publish")
    def test_process_reading_creates_transaction(self, mock_publish):
        """Testa que process_reading cria transação no ledger."""
        reading = EnergyReading.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            tariff=self.tariff,
            reading_date=date.today() - timedelta(days=3),
            kwh_total=Decimal("100"),
            bandeira="verde",
        )

        result = EnergyCostEngine.process_reading(
            reading, tenant_id="test", user=self.user
        )

        self.assertTrue(result["success"])
        self.assertFalse(result["skipped"])
        self.assertEqual(result["cost"], Decimal("101.00"))

        # Verifica transação criada
        reading.refresh_from_db()
        self.assertIsNotNone(reading.cost_transaction)
        self.assertEqual(
            reading.cost_transaction.transaction_type,
            CostTransaction.TransactionType.ENERGY,
        )
        self.assertEqual(
            reading.cost_transaction.category, CostTransaction.Category.ENERGY
        )

        # Verifica evento publicado
        mock_publish.assert_called_once()

    @patch("apps.finance.energy_engine.EventPublisher.publish")
    def test_process_reading_idempotent(self, mock_publish):
        """Testa idempotência do processamento."""
        reading = EnergyReading.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            tariff=self.tariff,
            reading_date=date.today() - timedelta(days=4),
            kwh_total=Decimal("100"),
            bandeira="verde",
        )

        # Processar duas vezes
        result1 = EnergyCostEngine.process_reading(
            reading, tenant_id="test", user=self.user
        )
        result2 = EnergyCostEngine.process_reading(
            reading, tenant_id="test", user=self.user
        )

        self.assertTrue(result1["success"])
        self.assertFalse(result1["skipped"])

        self.assertTrue(result2["success"])
        self.assertTrue(result2["skipped"])  # Segunda vez é skip

        # Deve ter apenas 1 transação
        self.assertEqual(
            CostTransaction.objects.filter(
                idempotency_key__startswith="energy:"
            ).count(),
            1,
        )


# ============================================================================
# Baseline Tests
# ============================================================================


class BaselineModelTests(TenantTestCase):
    """Testes do model Baseline."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Company"
        tenant.is_active = True

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="baseline_test",
            email="baseline@test.com",
            password="testpass123",
        )

        self.cost_center = CostCenter.objects.create(
            code="CC-BASE-01",
            name="Centro Baseline",
            is_active=True,
        )

        # Criar Site e Asset reais
        self.site = Site.objects.create(
            name="Test Site Baseline",
            company="Test Company",
            is_active=True,
        )
        self.asset = Asset.objects.create(
            tag="TEST-BASELINE-001",
            name="Test Baseline Asset",
            site=self.site,
            asset_type="CHILLER",
            status="OK",
        )

    def test_create_baseline(self):
        """Testa criação de baseline."""
        baseline = Baseline.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            name="Retrofit Chiller #1",
            baseline_type=Baseline.BaselineType.ENERGY,
            before_start=date.today() - timedelta(days=30),
            unit="kWh",
            created_by=self.user,
        )

        self.assertIsNotNone(baseline.id)
        self.assertEqual(baseline.status, Baseline.Status.COLLECTING_BEFORE)

    def test_calculate_savings(self):
        """Testa cálculo de economia."""
        baseline = Baseline.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            name="Test Baseline",
            baseline_type=Baseline.BaselineType.ENERGY,
            before_start=date.today() - timedelta(days=60),
            before_avg_value=Decimal("100"),  # 100 kWh/dia antes
            after_avg_value=Decimal("80"),  # 80 kWh/dia depois
            unit="kWh",
        )

        result = baseline.calculate_savings()

        self.assertTrue(result)
        self.assertEqual(baseline.savings_value, Decimal("20"))  # 100 - 80
        self.assertEqual(baseline.savings_percent, Decimal("20.00"))  # 20%


class AutoSavingsEngineTests(TenantTestCase):
    """Testes do AutoSavingsEngine."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Company"
        tenant.is_active = True

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="auto_savings_test",
            email="auto@test.com",
            password="testpass123",
        )

        self.cost_center = CostCenter.objects.create(
            code="CC-AUTO-01",
            name="Centro Auto",
            is_active=True,
        )

        self.tariff = EnergyTariff.objects.create(
            name="Test Tariff",
            distributor="Test",
            rate_off_peak=Decimal("0.80"),
            rate_peak=Decimal("1.20"),
            peak_start=time(18, 0),
            peak_end=time(21, 0),
            effective_from=date.today() - timedelta(days=90),
        )

        # Criar Site e Asset reais
        self.site = Site.objects.create(
            name="Test Site Auto",
            company="Test Company",
            is_active=True,
        )
        self.asset = Asset.objects.create(
            tag="TEST-AUTO-001",
            name="Test Auto Asset",
            site=self.site,
            asset_type="CHILLER",
            status="OK",
        )

    def _create_readings(self, start_date, days, avg_kwh):
        """Helper para criar leituras de energia."""
        for i in range(days):
            reading_date = start_date + timedelta(days=i)
            # Variação de ±10%
            variation = Decimal(str(0.9 + (i % 3) * 0.1))
            kwh = avg_kwh * variation

            try:
                EnergyReading.objects.create(
                    asset=self.asset,
                    cost_center=self.cost_center,
                    tariff=self.tariff,
                    reading_date=reading_date,
                    kwh_total=kwh,
                    bandeira="verde",
                )
            except Exception:
                pass  # Ignora se já existe

    def test_collect_before_data(self):
        """Testa coleta de dados do período antes."""
        # Criar leituras
        start_date = date.today() - timedelta(days=30)
        self._create_readings(start_date, 20, Decimal("100"))

        baseline = Baseline.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            name="Test Collect Before",
            baseline_type=Baseline.BaselineType.ENERGY,
            before_start=start_date,
            status=Baseline.Status.COLLECTING_BEFORE,
        )

        result = AutoSavingsEngine.collect_before_data(
            baseline, end_date=date.today() - timedelta(days=11)
        )

        self.assertTrue(result["success"])
        self.assertGreater(result["data_points"], 0)

        baseline.refresh_from_db()
        self.assertIsNotNone(baseline.before_avg_value)

    def test_start_intervention(self):
        """Testa início da intervenção."""
        baseline = Baseline.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            name="Test Intervention",
            baseline_type=Baseline.BaselineType.ENERGY,
            before_start=date.today() - timedelta(days=30),
            status=Baseline.Status.COLLECTING_BEFORE,
        )

        intervention_date = date.today() - timedelta(days=10)
        result = AutoSavingsEngine.start_intervention(baseline, intervention_date)

        self.assertTrue(result)
        baseline.refresh_from_db()
        self.assertEqual(baseline.status, Baseline.Status.INTERVENTION)
        self.assertEqual(baseline.intervention_date, intervention_date)

    def test_start_after_collection(self):
        """Testa início da coleta depois."""
        baseline = Baseline.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            name="Test After",
            baseline_type=Baseline.BaselineType.ENERGY,
            before_start=date.today() - timedelta(days=30),
            status=Baseline.Status.INTERVENTION,
        )

        start_date = date.today() - timedelta(days=7)
        result = AutoSavingsEngine.start_after_collection(baseline, start_date)

        self.assertTrue(result)
        baseline.refresh_from_db()
        self.assertEqual(baseline.status, Baseline.Status.COLLECTING_AFTER)
        self.assertEqual(baseline.after_start, start_date)

    def test_calculate_savings_creates_event(self):
        """Testa que calculate_savings cria SavingsEvent."""
        baseline = Baseline.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            name="Test Calculate",
            baseline_type=Baseline.BaselineType.ENERGY,
            before_start=date.today() - timedelta(days=60),
            before_avg_value=Decimal("100"),
            before_days=14,
            before_data_points=14,
            after_start=date.today() - timedelta(days=20),
            after_avg_value=Decimal("80"),
            after_days=14,
            after_data_points=14,
            status=Baseline.Status.COLLECTING_AFTER,
            unit="kWh",
        )

        # Contar SavingsEvents antes
        count_before = SavingsEvent.objects.count()

        result = AutoSavingsEngine.calculate_savings(
            baseline,
            tariff=self.tariff,
            tenant_id="test",
            user=self.user,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["savings_value"], Decimal("20"))  # 100 - 80
        self.assertEqual(result["savings_percent"], Decimal("20.00"))

        # Verifica que SavingsEvent foi criado
        count_after = SavingsEvent.objects.count()
        self.assertEqual(count_after, count_before + 1)


# ============================================================================
# RiskSnapshot Tests
# ============================================================================


class RiskSnapshotModelTests(TenantTestCase):
    """Testes do model RiskSnapshot."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Company"
        tenant.is_active = True

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="risk_test",
            email="risk@test.com",
            password="testpass123",
        )

        self.cost_center = CostCenter.objects.create(
            code="CC-RISK-01",
            name="Centro Risco",
            is_active=True,
        )

        # Criar Site e Asset reais
        self.site = Site.objects.create(
            name="Test Site Risk",
            company="Test Company",
            is_active=True,
        )
        self.asset = Asset.objects.create(
            tag="TEST-RISK-001",
            name="Test Risk Asset",
            site=self.site,
            asset_type="CHILLER",
            status="OK",
        )

    def test_create_risk_snapshot(self):
        """Testa criação de snapshot de risco."""
        snapshot = RiskSnapshot.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            snapshot_date=date.today(),
            failure_probability=Decimal("0.15"),
            estimated_repair_cost=Decimal("10000.00"),
            estimated_downtime_hours=Decimal("24"),
            downtime_cost_per_hour=Decimal("500.00"),
            created_by=self.user,
        )

        self.assertIsNotNone(snapshot.id)
        # Campos derivados devem ser calculados
        self.assertEqual(snapshot.downtime_cost, Decimal("12000.00"))  # 24 × 500
        self.assertEqual(
            snapshot.total_impact_cost, Decimal("22000.00")
        )  # 10000 + 12000
        self.assertEqual(snapshot.risk_score, Decimal("3300.00"))  # 0.15 × 22000

    def test_risk_level_low(self):
        """Testa determinação de nível baixo."""
        snapshot = RiskSnapshot.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            snapshot_date=date.today(),
            failure_probability=Decimal("0.05"),  # 5%
            estimated_repair_cost=Decimal("1000.00"),
        )

        self.assertEqual(snapshot.risk_level, RiskSnapshot.RiskLevel.LOW)

    def test_risk_level_medium(self):
        """Testa determinação de nível médio."""
        snapshot = RiskSnapshot.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            snapshot_date=date.today() - timedelta(days=1),
            failure_probability=Decimal("0.20"),  # 20%
            estimated_repair_cost=Decimal("30000.00"),
        )

        self.assertEqual(snapshot.risk_level, RiskSnapshot.RiskLevel.MEDIUM)

    def test_risk_level_high(self):
        """Testa determinação de nível alto."""
        snapshot = RiskSnapshot.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            snapshot_date=date.today() - timedelta(days=2),
            failure_probability=Decimal("0.35"),  # 35%
            estimated_repair_cost=Decimal("50000.00"),
        )

        self.assertEqual(snapshot.risk_level, RiskSnapshot.RiskLevel.HIGH)

    def test_risk_level_critical(self):
        """Testa determinação de nível crítico."""
        snapshot = RiskSnapshot.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            snapshot_date=date.today() - timedelta(days=3),
            failure_probability=Decimal("0.60"),  # 60%
            estimated_repair_cost=Decimal("100000.00"),
        )

        self.assertEqual(snapshot.risk_level, RiskSnapshot.RiskLevel.CRITICAL)

    def test_unique_asset_date_constraint(self):
        """Testa constraint de unicidade."""
        from django.db import IntegrityError

        RiskSnapshot.objects.create(
            asset=self.asset,
            cost_center=self.cost_center,
            snapshot_date=date.today() - timedelta(days=10),
            failure_probability=Decimal("0.10"),
        )

        with self.assertRaises(IntegrityError):
            RiskSnapshot.objects.create(
                asset=self.asset,
                cost_center=self.cost_center,
                snapshot_date=date.today() - timedelta(days=10),  # Mesma data
                failure_probability=Decimal("0.20"),
            )


# ============================================================================
# BAR Calculator Tests
# ============================================================================


class BARCalculatorTests(TenantTestCase):
    """Testes do BARCalculator."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Company"
        tenant.is_active = True

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="bar_test",
            email="bar@test.com",
            password="testpass123",
        )

        self.cost_center = CostCenter.objects.create(
            code="CC-BAR-01",
            name="Centro BAR Principal",
            is_active=True,
        )

        self.cost_center_child = CostCenter.objects.create(
            code="CC-BAR-02",
            name="Centro BAR Filho",
            parent=self.cost_center,
            is_active=True,
        )

        self.snapshot_date = date.today()

        # Criar Site e Assets reais
        self.site = Site.objects.create(
            name="Test Site BAR",
            company="Test Company",
            is_active=True,
        )

        # Criar assets para os snapshots
        self.assets = []
        for i in range(3):
            asset = Asset.objects.create(
                tag=f"TEST-BAR-00{i+1}",
                name=f"Test BAR Asset {i+1}",
                site=self.site,
                asset_type="CHILLER",
                status="OK",
            )
            self.assets.append(asset)

        # Asset adicional para o centro filho
        self.asset_child = Asset.objects.create(
            tag="TEST-BAR-CHILD",
            name="Test BAR Child Asset",
            site=self.site,
            asset_type="AHU",
            status="OK",
        )

        # Criar snapshots
        for i, asset in enumerate(self.assets):
            RiskSnapshot.objects.create(
                asset=asset,
                cost_center=self.cost_center,
                snapshot_date=self.snapshot_date,
                failure_probability=Decimal("0.10") + Decimal(str(i * 0.05)),
                estimated_repair_cost=Decimal("10000") + Decimal(str(i * 5000)),
            )

        # Snapshot no centro filho
        RiskSnapshot.objects.create(
            asset=self.asset_child,
            cost_center=self.cost_center_child,
            snapshot_date=self.snapshot_date,
            failure_probability=Decimal("0.25"),
            estimated_repair_cost=Decimal("20000"),
        )

    def test_calculate_bar_for_cost_center(self):
        """Testa cálculo de BAR para um centro de custo."""
        result = BARCalculator.calculate_bar_for_cost_center(
            self.cost_center,
            self.snapshot_date,
            include_children=True,
        )

        self.assertEqual(result["cost_center_name"], "Centro BAR Principal")
        self.assertEqual(result["assets_count"], 4)  # 3 + 1 filho
        self.assertGreater(result["bar_total"], 0)

    def test_calculate_bar_without_children(self):
        """Testa cálculo sem incluir filhos."""
        result = BARCalculator.calculate_bar_for_cost_center(
            self.cost_center,
            self.snapshot_date,
            include_children=False,
        )

        self.assertEqual(result["assets_count"], 3)  # Apenas principal

    def test_calculate_bar_summary(self):
        """Testa resumo consolidado de BAR."""
        result = BARCalculator.calculate_bar_summary(
            self.snapshot_date,
            top_n=5,
        )

        self.assertEqual(result["snapshot_date"], self.snapshot_date.isoformat())
        self.assertEqual(result["assets_at_risk"], 4)
        self.assertGreater(result["total_bar"], 0)
        self.assertLessEqual(len(result["top_risks"]), 5)

    def test_get_assets_by_risk_level(self):
        """Testa listagem por nível de risco."""
        # Criar asset crítico
        asset_critical = Asset.objects.create(
            tag="TEST-BAR-CRITICAL",
            name="Test Critical Asset",
            site=self.site,
            asset_type="CHILLER",
            status="ALERT",
        )

        # Criar snapshot crítico
        RiskSnapshot.objects.create(
            asset=asset_critical,
            cost_center=self.cost_center,
            snapshot_date=self.snapshot_date,
            failure_probability=Decimal("0.70"),
            estimated_repair_cost=Decimal("100000"),
        )

        critical_assets = BARCalculator.get_assets_by_risk_level(
            RiskSnapshot.RiskLevel.CRITICAL,
            snapshot_date=self.snapshot_date,
        )

        self.assertGreater(len(critical_assets), 0)
        self.assertEqual(str(critical_assets[0]["asset_id"]), str(asset_critical.id))

    def test_forecast_bar(self):
        """Testa projeção de BAR."""
        result = BARCalculator.forecast_bar(
            cost_center=None,
            months_ahead=3,
        )

        self.assertIsNotNone(result["current_bar"])
        self.assertEqual(len(result["forecast"]), 3)


# ============================================================================
# API Integration Tests
# ============================================================================


class RiskSnapshotAPITests(TenantTestCase):
    """Testes da API de Snapshots de Risco."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Company"
        tenant.is_active = True

    def setUp(self):
        self.factory = APIRequestFactory()
        User = get_user_model()
        self.user = User.objects.create_user(
            username="risk_api_test",
            email="risk_api@test.com",
            password="testpass123",
        )

        self.cost_center = CostCenter.objects.create(
            code="CC-RISK-API",
            name="Centro API",
            is_active=True,
        )

        # Criar Site e Asset para teste
        self.site = Site.objects.create(
            name="Test Site Risk API",
            company="Test Company",
            is_active=True,
        )
        self.asset = Asset.objects.create(
            tag="TEST-RISK-API-001",
            name="Test Risk API Asset",
            site=self.site,
            asset_type="CHILLER",
            status="OK",
        )

    def test_create_risk_snapshot(self):
        """Testa criação de snapshot via API."""
        view = RiskSnapshotViewSet.as_view({"post": "create"})
        data = {
            "asset": str(self.asset.id),
            "cost_center": str(self.cost_center.id),
            "snapshot_date": str(date.today()),
            "failure_probability": "0.15",
            "estimated_repair_cost": "10000",
            "estimated_downtime_hours": "24",
            "downtime_cost_per_hour": "500",
        }
        request = self.factory.post("/api/finance/risk-snapshots/", data)
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Campos derivados devem estar calculados
        self.assertEqual(float(response.data["downtime_cost"]), 12000)
        self.assertEqual(float(response.data["risk_score"]), 3300)


class BARAPITests(TenantTestCase):
    """Testes da API de BAR."""

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Company"
        tenant.is_active = True

    def setUp(self):
        self.factory = APIRequestFactory()
        User = get_user_model()
        self.user = User.objects.create_user(
            username="bar_api_test",
            email="bar_api@test.com",
            password="testpass123",
        )

        self.cost_center = CostCenter.objects.create(
            code="CC-BAR-API",
            name="Centro BAR API",
            is_active=True,
        )

        # Criar Site e Assets
        self.site = Site.objects.create(
            name="Test Site BAR API",
            company="Test Company",
            is_active=True,
        )

        # Criar snapshots para teste
        for i in range(3):
            asset = Asset.objects.create(
                tag=f"TEST-BAR-API-00{i+1}",
                name=f"Test BAR API Asset {i+1}",
                site=self.site,
                asset_type="CHILLER",
                status="OK",
            )
            RiskSnapshot.objects.create(
                asset=asset,
                cost_center=self.cost_center,
                snapshot_date=date.today(),
                failure_probability=Decimal("0.15"),
                estimated_repair_cost=Decimal("15000"),
            )

    def test_bar_summary(self):
        """Testa endpoint de resumo de BAR."""
        view = BARViewSet.as_view({"get": "summary"})
        request = self.factory.get("/api/finance/bar/summary/")
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_bar", response.data)
        self.assertIn("assets_at_risk", response.data)
        self.assertEqual(response.data["assets_at_risk"], 3)

    def test_bar_cost_center(self):
        """Testa endpoint de BAR por centro de custo."""
        view = BARViewSet.as_view({"get": "cost_center"})
        request = self.factory.get(
            f"/api/finance/bar/cost-center/{self.cost_center.id}/"
        )
        force_authenticate(request, user=self.user)

        response = view(request, cost_center_id=str(self.cost_center.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["cost_center_name"], "Centro BAR API")

    def test_bar_forecast(self):
        """Testa endpoint de projeção de BAR."""
        view = BARViewSet.as_view({"get": "forecast"})
        request = self.factory.get("/api/finance/bar/forecast/?months=3")
        force_authenticate(request, user=self.user)

        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["forecast"]), 3)
