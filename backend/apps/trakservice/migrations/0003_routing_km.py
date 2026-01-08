# Generated migration for Routing and KM models
# DailyRoute: daily route for a technician with stops
# RouteStop: individual stop in a route

import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("trakservice", "0002_tracking_locationping"),
    ]

    operations = [
        # DailyRoute model
        migrations.CreateModel(
            name="DailyRoute",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "route_date",
                    models.DateField(
                        help_text="Data para a qual a rota foi planejada",
                        verbose_name="Data da Rota",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Rascunho"),
                            ("confirmed", "Confirmado"),
                            ("in_progress", "Em Andamento"),
                            ("completed", "Concluído"),
                        ],
                        default="draft",
                        max_length=20,
                        verbose_name="Status",
                    ),
                ),
                (
                    "start_latitude",
                    models.DecimalField(
                        blank=True,
                        decimal_places=7,
                        max_digits=10,
                        null=True,
                        verbose_name="Latitude Inicial",
                    ),
                ),
                (
                    "start_longitude",
                    models.DecimalField(
                        blank=True,
                        decimal_places=7,
                        max_digits=10,
                        null=True,
                        verbose_name="Longitude Inicial",
                    ),
                ),
                (
                    "start_address",
                    models.CharField(
                        blank=True,
                        max_length=500,
                        verbose_name="Endereço Inicial",
                    ),
                ),
                (
                    "estimated_km",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Quilometragem estimada para a rota completa",
                        max_digits=8,
                        verbose_name="KM Estimado",
                    ),
                ),
                (
                    "actual_km",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Quilometragem real percorrida (calculada dos pings)",
                        max_digits=8,
                        verbose_name="KM Real",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Criado em"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="Atualizado em"),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_routes",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Criado por",
                    ),
                ),
                (
                    "technician",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="daily_routes",
                        to="trakservice.technicianprofile",
                        verbose_name="Técnico",
                    ),
                ),
            ],
            options={
                "verbose_name": "Rota Diária",
                "verbose_name_plural": "Rotas Diárias",
                "ordering": ["-route_date", "technician"],
            },
        ),
        # RouteStop model
        migrations.CreateModel(
            name="RouteStop",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "sequence",
                    models.PositiveIntegerField(
                        help_text="Ordem da parada na rota (1 = primeira)",
                        verbose_name="Sequência",
                    ),
                ),
                (
                    "latitude",
                    models.DecimalField(
                        decimal_places=7,
                        max_digits=10,
                        verbose_name="Latitude",
                    ),
                ),
                (
                    "longitude",
                    models.DecimalField(
                        decimal_places=7,
                        max_digits=10,
                        verbose_name="Longitude",
                    ),
                ),
                (
                    "address",
                    models.CharField(
                        blank=True,
                        max_length=500,
                        verbose_name="Endereço",
                    ),
                ),
                (
                    "description",
                    models.CharField(
                        blank=True,
                        max_length=500,
                        verbose_name="Descrição",
                    ),
                ),
                (
                    "estimated_arrival",
                    models.TimeField(
                        blank=True,
                        null=True,
                        verbose_name="Chegada Estimada",
                    ),
                ),
                (
                    "estimated_duration_minutes",
                    models.PositiveIntegerField(
                        default=60,
                        verbose_name="Duração Estimada (min)",
                    ),
                ),
                (
                    "distance_from_previous_km",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        max_digits=8,
                        verbose_name="Distância do Anterior (km)",
                    ),
                ),
                (
                    "actual_arrival",
                    models.DateTimeField(
                        blank=True,
                        null=True,
                        verbose_name="Chegada Real",
                    ),
                ),
                (
                    "actual_departure",
                    models.DateTimeField(
                        blank=True,
                        null=True,
                        verbose_name="Saída Real",
                    ),
                ),
                (
                    "route",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="stops",
                        to="trakservice.dailyroute",
                        verbose_name="Rota",
                    ),
                ),
                (
                    "assignment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="route_stops",
                        to="trakservice.serviceassignment",
                        verbose_name="Atribuição",
                    ),
                ),
            ],
            options={
                "verbose_name": "Parada da Rota",
                "verbose_name_plural": "Paradas da Rota",
                "ordering": ["route", "sequence"],
            },
        ),
        # Constraints and indexes
        migrations.AddConstraint(
            model_name="dailyroute",
            constraint=models.UniqueConstraint(
                fields=("technician", "route_date"),
                name="trakservice_dailyroute_technician_date_unique",
            ),
        ),
        migrations.AddConstraint(
            model_name="routestop",
            constraint=models.UniqueConstraint(
                fields=("route", "sequence"),
                name="trakservice_routestop_route_sequence_unique",
            ),
        ),
        migrations.AddIndex(
            model_name="dailyroute",
            index=models.Index(
                fields=["route_date", "technician"],
                name="trakservice_route_date_tech_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="dailyroute",
            index=models.Index(
                fields=["status"],
                name="trakservice_route_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="routestop",
            index=models.Index(
                fields=["route", "sequence"],
                name="trakservice_stop_route_seq_idx",
            ),
        ),
    ]
