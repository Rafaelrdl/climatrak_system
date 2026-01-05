"""
Serializers para Locations

Hierarquia: Company > Unit > Sector > Subsection
"""

from django.utils.text import slugify
from rest_framework import serializers

from .models import Company, LocationContact, Sector, Subsection, Unit


class LocationContactSerializer(serializers.ModelSerializer):
    """Serializer para contatos."""

    type_display = serializers.CharField(source="get_type_display", read_only=True)

    class Meta:
        model = LocationContact
        fields = [
            "id",
            "type",
            "type_display",
            "name",
            "phone",
            "email",
            "note",
            "created_at",
        ]


class SubsectionSerializer(serializers.ModelSerializer):
    """Serializer completo para subseções."""

    # Campos opcionais
    code = serializers.CharField(required=False, allow_blank=True, max_length=50)
    description = serializers.CharField(required=False, allow_blank=True)
    position = serializers.CharField(required=False, allow_blank=True, max_length=100)
    reference = serializers.CharField(required=False, allow_blank=True, max_length=200)

    # Campos de navegação (somente leitura)
    sector_name = serializers.CharField(source="sector.name", read_only=True)
    unit_id = serializers.IntegerField(source="sector.unit_id", read_only=True)
    unit_name = serializers.CharField(source="sector.unit.name", read_only=True)
    company_id = serializers.IntegerField(source="sector.unit.company_id", read_only=True)
    company_name = serializers.CharField(source="sector.unit.company.name", read_only=True)
    full_path = serializers.CharField(read_only=True)
    asset_count = serializers.IntegerField(read_only=True)
    contacts = LocationContactSerializer(many=True, read_only=True)

    def to_internal_value(self, data):
        data = data.copy()
        code = data.get("code")
        if code is None and self.instance:
            code = self.instance.code
        if not code:
            name = data.get("name") or (self.instance.name if self.instance else "")
            if name:
                data["code"] = slugify(name)[:50]
        return super().to_internal_value(data)

    def validate(self, data):
        code = data.get("code")
        if code is None and self.instance:
            code = self.instance.code
        if not code:
            name = data.get("name") or (self.instance.name if self.instance else "")
            if name:
                data["code"] = slugify(name)[:50]
        return data

    class Meta:
        model = Subsection
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "sector",
            "sector_name",
            "unit_id",
            "unit_name",
            "company_id",
            "company_name",
            "position",
            "reference",
            "full_path",
            "asset_count",
            "contacts",
            "created_at",
            "updated_at",
        ]


class SubsectionListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagem de subseções."""

    sector_name = serializers.CharField(source="sector.name", read_only=True)
    unit_id = serializers.IntegerField(source="sector.unit_id", read_only=True)
    unit_name = serializers.CharField(source="sector.unit.name", read_only=True)
    company_id = serializers.IntegerField(source="sector.unit.company_id", read_only=True)
    company_name = serializers.CharField(source="sector.unit.company.name", read_only=True)
    asset_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Subsection
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "sector",
            "sector_name",
            "unit_id",
            "unit_name",
            "company_id",
            "company_name",
            "position",
            "reference",
            "asset_count",
            "created_at",
            "updated_at",
        ]


class SectorSerializer(serializers.ModelSerializer):
    """Serializer completo para setores."""

    # Campos explícitos opcionais
    code = serializers.CharField(required=False, allow_blank=True, max_length=50)
    description = serializers.CharField(required=False, allow_blank=True)
    floor = serializers.CharField(required=False, allow_blank=True, max_length=20)
    building = serializers.CharField(required=False, allow_blank=True, max_length=100)
    responsible_name = serializers.CharField(
        required=False, allow_blank=True, max_length=255
    )
    responsible_phone = serializers.CharField(
        required=False, allow_blank=True, max_length=20
    )
    responsible_email = serializers.EmailField(required=False, allow_blank=True)
    area = serializers.DecimalField(
        required=False, allow_null=True, max_digits=12, decimal_places=2
    )
    occupants = serializers.IntegerField(required=False, allow_null=True)
    hvac_units = serializers.IntegerField(required=False, allow_null=True)

    # Campos de navegação (somente leitura)
    unit_name = serializers.CharField(source="unit.name", read_only=True)
    company_id = serializers.IntegerField(source="unit.company_id", read_only=True)
    company_name = serializers.CharField(source="unit.company.name", read_only=True)
    supervisor_name = serializers.CharField(
        source="supervisor.get_full_name", read_only=True
    )
    full_path = serializers.CharField(read_only=True)
    subsection_count = serializers.IntegerField(read_only=True)
    asset_count = serializers.IntegerField(read_only=True)
    subsections = SubsectionListSerializer(many=True, read_only=True)
    contacts = LocationContactSerializer(many=True, read_only=True)

    class Meta:
        model = Sector
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "unit",
            "unit_name",
            "company_id",
            "company_name",
            "supervisor",
            "supervisor_name",
            "responsible_name",
            "responsible_phone",
            "responsible_email",
            "floor",
            "building",
            "area",
            "occupants",
            "hvac_units",
            "full_path",
            "subsection_count",
            "asset_count",
            "subsections",
            "contacts",
            "created_at",
            "updated_at",
        ]


class SectorListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagem de setores."""

    unit_name = serializers.CharField(source="unit.name", read_only=True)
    company_id = serializers.IntegerField(source="unit.company_id", read_only=True)
    company_name = serializers.CharField(source="unit.company.name", read_only=True)
    supervisor_name = serializers.CharField(
        source="supervisor.get_full_name", read_only=True, allow_null=True
    )
    subsection_count = serializers.IntegerField(read_only=True)
    asset_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Sector
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "unit",
            "unit_name",
            "company_id",
            "company_name",
            "supervisor",
            "supervisor_name",
            "responsible_name",
            "responsible_phone",
            "responsible_email",
            "floor",
            "building",
            "area",
            "occupants",
            "hvac_units",
            "subsection_count",
            "asset_count",
            "created_at",
            "updated_at",
        ]


class SectorNestedSerializer(serializers.ModelSerializer):
    """Serializer de setor com subseções aninhadas para árvore."""

    subsections = SubsectionListSerializer(many=True, read_only=True)
    asset_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Sector
        fields = ["id", "name", "code", "is_active", "asset_count", "subsections"]


# ============================================
# Unit Serializers
# ============================================


class UnitSerializer(serializers.ModelSerializer):
    """Serializer completo para unidades."""

    # Campos explícitos opcionais
    code = serializers.CharField(required=False, allow_blank=True, max_length=50)
    description = serializers.CharField(required=False, allow_blank=True)
    cnpj = serializers.CharField(required=False, allow_blank=True, max_length=18)
    address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True, max_length=100)
    state = serializers.CharField(required=False, allow_blank=True, max_length=50)
    zip_code = serializers.CharField(required=False, allow_blank=True, max_length=10)
    responsible_name = serializers.CharField(
        required=False, allow_blank=True, max_length=255
    )
    responsible_role = serializers.CharField(
        required=False, allow_blank=True, max_length=100
    )
    total_area = serializers.DecimalField(
        required=False, allow_null=True, max_digits=12, decimal_places=2
    )
    occupants = serializers.IntegerField(required=False, allow_null=True)
    hvac_units = serializers.IntegerField(required=False, allow_null=True)

    # Campos de navegação (somente leitura)
    company_name = serializers.CharField(source="company.name", read_only=True)
    manager_name = serializers.CharField(source="manager.get_full_name", read_only=True)
    full_path = serializers.CharField(read_only=True)
    sector_count = serializers.IntegerField(read_only=True)
    asset_count = serializers.IntegerField(read_only=True)
    sectors = SectorListSerializer(many=True, read_only=True)
    contacts = LocationContactSerializer(many=True, read_only=True)

    class Meta:
        model = Unit
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "company",
            "company_name",
            "cnpj",
            "address",
            "city",
            "state",
            "zip_code",
            "responsible_name",
            "responsible_role",
            "total_area",
            "occupants",
            "hvac_units",
            "manager",
            "manager_name",
            "full_path",
            "sector_count",
            "asset_count",
            "sectors",
            "contacts",
            "created_at",
            "updated_at",
        ]


class UnitListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagem de unidades."""

    company_name = serializers.CharField(source="company.name", read_only=True)
    manager_name = serializers.CharField(
        source="manager.get_full_name", read_only=True, allow_null=True
    )
    sector_count = serializers.IntegerField(read_only=True)
    asset_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Unit
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "company",
            "company_name",
            "cnpj",
            "address",
            "city",
            "state",
            "zip_code",
            "responsible_name",
            "responsible_role",
            "total_area",
            "occupants",
            "hvac_units",
            "manager",
            "manager_name",
            "sector_count",
            "asset_count",
            "created_at",
            "updated_at",
        ]


class UnitNestedSerializer(serializers.ModelSerializer):
    """Serializer de unidade com setores aninhados para árvore."""

    sectors = SectorNestedSerializer(many=True, read_only=True)
    sector_count = serializers.IntegerField(read_only=True)
    asset_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Unit
        fields = ["id", "name", "code", "is_active", "sector_count", "asset_count", "sectors"]


# ============================================
# Company Serializers
# ============================================


class CompanySerializer(serializers.ModelSerializer):
    """Serializer completo para empresas."""

    # Campos explícitos opcionais
    code = serializers.CharField(required=False, allow_blank=True, max_length=50)
    description = serializers.CharField(required=False, allow_blank=True)
    cnpj = serializers.CharField(required=False, allow_blank=True, max_length=18)
    address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True, max_length=100)
    state = serializers.CharField(required=False, allow_blank=True, max_length=50)
    zip_code = serializers.CharField(required=False, allow_blank=True, max_length=10)

    # Campos de dados operacionais
    responsible_name = serializers.CharField(
        required=False, allow_blank=True, max_length=255
    )
    responsible_role = serializers.CharField(
        required=False, allow_blank=True, max_length=100
    )
    total_area = serializers.DecimalField(
        required=False, allow_null=True, max_digits=12, decimal_places=2
    )
    occupants = serializers.IntegerField(required=False, default=0)
    hvac_units = serializers.IntegerField(required=False, default=0)

    manager_name = serializers.CharField(source="manager.get_full_name", read_only=True)
    unit_count = serializers.IntegerField(read_only=True)
    sector_count = serializers.IntegerField(read_only=True)
    asset_count = serializers.IntegerField(read_only=True)
    units = UnitListSerializer(many=True, read_only=True)
    contacts = LocationContactSerializer(many=True, read_only=True)

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "cnpj",
            "address",
            "city",
            "state",
            "zip_code",
            "responsible_name",
            "responsible_role",
            "total_area",
            "occupants",
            "hvac_units",
            "logo",
            "timezone",
            "manager",
            "manager_name",
            "unit_count",
            "sector_count",
            "asset_count",
            "units",
            "contacts",
            "created_at",
            "updated_at",
        ]


class CompanyListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagem de empresas."""

    unit_count = serializers.IntegerField(read_only=True)
    sector_count = serializers.IntegerField(read_only=True)
    asset_count = serializers.IntegerField(read_only=True)
    manager_name = serializers.CharField(
        source="manager.get_full_name", read_only=True, allow_null=True
    )

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "cnpj",
            "address",
            "city",
            "state",
            "zip_code",
            "responsible_name",
            "responsible_role",
            "total_area",
            "occupants",
            "hvac_units",
            "manager",
            "manager_name",
            "unit_count",
            "sector_count",
            "asset_count",
            "created_at",
            "updated_at",
        ]


class CompanyTreeSerializer(serializers.ModelSerializer):
    """Serializer para árvore hierárquica completa."""

    units = UnitNestedSerializer(many=True, read_only=True)
    unit_count = serializers.IntegerField(read_only=True)
    sector_count = serializers.IntegerField(read_only=True)
    asset_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "code",
            "is_active",
            "unit_count",
            "sector_count",
            "asset_count",
            "units",
        ]


class LocationTreeResponseSerializer(serializers.Serializer):
    """Serializer para resposta da árvore de localizações."""

    companies = CompanyTreeSerializer(many=True)
    total_companies = serializers.IntegerField()
    total_units = serializers.IntegerField()
    total_sectors = serializers.IntegerField()
    total_subsections = serializers.IntegerField()
    total_assets = serializers.IntegerField()
