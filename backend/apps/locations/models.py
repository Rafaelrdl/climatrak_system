"""
Models para Locations - Hierarquia de localizações

Hierarquia:
  Company (Empresa)
    └── Unit (Unidade)
          └── Sector (Setor)
                └── Subsection (Subseção)
"""

from django.conf import settings
from django.db import models


class Location(models.Model):
    """
    Modelo abstrato base para localizações.
    """

    name = models.CharField("Nome", max_length=255)
    code = models.CharField("Código", max_length=50, blank=True)
    description = models.TextField("Descrição", blank=True)
    is_active = models.BooleanField("Ativo", default=True)

    created_at = models.DateTimeField("Criado em", auto_now_add=True)
    updated_at = models.DateTimeField("Atualizado em", auto_now=True)

    class Meta:
        abstract = True
        ordering = ["name"]

    def __str__(self):
        return self.name


class Company(Location):
    """
    Empresa ou Unidade de negócio.
    Nível mais alto da hierarquia de localizações.
    """

    cnpj = models.CharField("CNPJ", max_length=18, blank=True)
    address = models.TextField("Endereço", blank=True)
    city = models.CharField("Cidade", max_length=100, blank=True)
    state = models.CharField(
        "Estado", max_length=50, blank=True
    )  # Aumentado para suportar nome completo
    zip_code = models.CharField("CEP", max_length=10, blank=True)

    # Responsável (campos de texto para não depender de usuário cadastrado)
    responsible_name = models.CharField(
        "Nome do Responsável", max_length=255, blank=True
    )
    responsible_role = models.CharField(
        "Cargo do Responsável", max_length=100, blank=True
    )

    # Dados operacionais
    total_area = models.DecimalField(
        "Área Total (m²)", max_digits=12, decimal_places=2, null=True, blank=True
    )
    occupants = models.PositiveIntegerField(
        "Número de Ocupantes", null=True, blank=True
    )
    hvac_units = models.PositiveIntegerField("Unidades HVAC", null=True, blank=True)

    # Configurações
    logo = models.ImageField(
        "Logo", upload_to="companies/logos/", blank=True, null=True
    )
    timezone = models.CharField(
        "Fuso Horário", max_length=50, default="America/Sao_Paulo"
    )

    # Gestor (usuário do sistema)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_companies",
        verbose_name="Gestor",
    )

    class Meta(Location.Meta):
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"

    @property
    def unit_count(self):
        return self.units.count()

    @property
    def sector_count(self):
        """Conta setores em todas as unidades da empresa."""
        return Sector.objects.filter(unit__company=self).count()

    @property
    def asset_count(self):
        """Conta ativos em todos os setores da empresa."""
        from apps.assets.models import Asset

        return Asset.objects.filter(
            models.Q(sector__unit__company=self)
            | models.Q(subsection__sector__unit__company=self)
        ).count()


class Unit(Location):
    """
    Unidade de uma empresa.
    Segundo nível da hierarquia - representa filiais, plantas, prédios, etc.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="units",
        verbose_name="Empresa",
    )

    # Dados de localização
    cnpj = models.CharField("CNPJ", max_length=18, blank=True)
    address = models.TextField("Endereço", blank=True)
    city = models.CharField("Cidade", max_length=100, blank=True)
    state = models.CharField("Estado", max_length=50, blank=True)
    zip_code = models.CharField("CEP", max_length=10, blank=True)

    # Responsável (campos de texto para não depender de usuário cadastrado)
    responsible_name = models.CharField(
        "Nome do Responsável", max_length=255, blank=True
    )
    responsible_role = models.CharField(
        "Cargo do Responsável", max_length=100, blank=True
    )

    # Gestor (usuário do sistema)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_units",
        verbose_name="Gestor",
    )

    # Dados operacionais
    total_area = models.DecimalField(
        "Área Total (m²)", max_digits=12, decimal_places=2, null=True, blank=True
    )
    occupants = models.PositiveIntegerField(
        "Número de Ocupantes", null=True, blank=True
    )
    hvac_units = models.PositiveIntegerField("Unidades HVAC", null=True, blank=True)

    class Meta(Location.Meta):
        verbose_name = "Unidade"
        verbose_name_plural = "Unidades"

    def __str__(self):
        return f"{self.company.name} > {self.name}"

    @property
    def full_path(self):
        return f"{self.company.name} > {self.name}"

    @property
    def sector_count(self):
        return self.sectors.count()

    @property
    def asset_count(self):
        """Conta ativos em todos os setores da unidade."""
        from apps.assets.models import Asset

        return Asset.objects.filter(
            models.Q(sector__unit=self) | models.Q(subsection__sector__unit=self)
        ).count()


class Sector(Location):
    """
    Setor de uma unidade.
    Pode conter subseções e ativos diretamente.
    """

    unit = models.ForeignKey(
        Unit,
        on_delete=models.CASCADE,
        related_name="sectors",
        verbose_name="Unidade",
    )

    # Opcional - responsável do setor
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supervised_sectors",
        verbose_name="Supervisor",
    )

    # Responsável (campos de texto para não depender de usuário cadastrado)
    responsible_name = models.CharField(
        "Nome do Responsável", max_length=255, blank=True
    )
    responsible_phone = models.CharField(
        "Telefone do Responsável", max_length=20, blank=True
    )
    responsible_email = models.EmailField("E-mail do Responsável", blank=True)

    # Localização física
    floor = models.CharField("Andar", max_length=20, blank=True)
    building = models.CharField("Prédio", max_length=100, blank=True)

    # Dados operacionais
    area = models.DecimalField(
        "Área (m²)", max_digits=12, decimal_places=2, null=True, blank=True
    )
    occupants = models.PositiveIntegerField(
        "Número de Ocupantes", null=True, blank=True
    )
    hvac_units = models.PositiveIntegerField("Unidades HVAC", null=True, blank=True)

    class Meta(Location.Meta):
        verbose_name = "Setor"
        verbose_name_plural = "Setores"

    def __str__(self):
        return f"{self.unit} > {self.name}"

    @property
    def full_path(self):
        return f"{self.unit.company.name} > {self.unit.name} > {self.name}"

    @property
    def company(self):
        """Retorna a empresa da unidade (atalho para compatibilidade)."""
        return self.unit.company

    @property
    def subsection_count(self):
        return self.subsections.count()

    @property
    def asset_count(self):
        """Conta ativos diretamente no setor e nas subseções."""
        from apps.assets.models import Asset

        return Asset.objects.filter(
            models.Q(sector=self) | models.Q(subsection__sector=self)
        ).count()


class Subsection(Location):
    """
    Subseção de um setor.
    Nível mais baixo da hierarquia.
    """

    sector = models.ForeignKey(
        Sector,
        on_delete=models.CASCADE,
        related_name="subsections",
        verbose_name="Setor",
    )

    # Localização física específica
    position = models.CharField("Posição", max_length=100, blank=True)
    reference = models.CharField("Referência", max_length=200, blank=True)

    # Dados operacionais
    area = models.DecimalField(
        "Área (m²)", max_digits=12, decimal_places=2, null=True, blank=True
    )
    occupants = models.PositiveIntegerField(
        "Número de Ocupantes", null=True, blank=True
    )
    hvac_units = models.PositiveIntegerField("Unidades HVAC", null=True, blank=True)

    class Meta(Location.Meta):
        verbose_name = "Subseção"
        verbose_name_plural = "Subseções"
        unique_together = ["sector", "code"]

    def __str__(self):
        return f"{self.sector} > {self.name}"

    @property
    def full_path(self):
        return f"{self.sector.unit.company.name} > {self.sector.unit.name} > {self.sector.name} > {self.name}"

    @property
    def unit(self):
        """Retorna a unidade do setor (atalho para compatibilidade)."""
        return self.sector.unit

    @property
    def company(self):
        """Retorna a empresa da unidade (atalho para compatibilidade)."""
        return self.sector.unit.company

    @property
    def asset_count(self):
        from apps.assets.models import Asset

        return Asset.objects.filter(subsection=self).count()


class LocationContact(models.Model):
    """
    Contato associado a uma localização.
    Pode ser associado a Company, Unit, Sector ou Subsection.
    """

    class ContactType(models.TextChoices):
        MANAGER = "MANAGER", "Gestor"
        SUPERVISOR = "SUPERVISOR", "Supervisor"
        TECHNICIAN = "TECHNICIAN", "Técnico"
        EMERGENCY = "EMERGENCY", "Emergência"
        OTHER = "OTHER", "Outro"

    # Polimórfico - associar a qualquer nível
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="contacts",
    )
    unit = models.ForeignKey(
        Unit,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="contacts",
    )
    sector = models.ForeignKey(
        Sector, on_delete=models.CASCADE, null=True, blank=True, related_name="contacts"
    )
    subsection = models.ForeignKey(
        Subsection,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="contacts",
    )

    type = models.CharField("Tipo", max_length=20, choices=ContactType.choices)
    name = models.CharField("Nome", max_length=255)
    phone = models.CharField("Telefone", max_length=20, blank=True)
    email = models.EmailField("E-mail", blank=True)
    note = models.TextField("Observação", blank=True)

    created_at = models.DateTimeField("Criado em", auto_now_add=True)

    class Meta:
        verbose_name = "Contato"
        verbose_name_plural = "Contatos"
        ordering = ["type", "name"]

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"

    @property
    def location(self):
        """Retorna a localização associada."""
        return self.subsection or self.sector or self.unit or self.company
