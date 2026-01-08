# Generated migration for LocationPing model
# TrakService Tracking MVP - Issue 05

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("trakservice", "0001_dispatch_models"),
    ]

    operations = [
        migrations.CreateModel(
            name="LocationPing",
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
                    "latitude",
                    models.DecimalField(
                        decimal_places=7,
                        help_text="Latitude em graus decimais (-90 a 90)",
                        max_digits=10,
                        verbose_name="Latitude",
                    ),
                ),
                (
                    "longitude",
                    models.DecimalField(
                        decimal_places=7,
                        help_text="Longitude em graus decimais (-180 a 180)",
                        max_digits=10,
                        verbose_name="Longitude",
                    ),
                ),
                (
                    "accuracy",
                    models.FloatField(
                        blank=True,
                        help_text="Raio de precisão em metros",
                        null=True,
                        verbose_name="Precisão (metros)",
                    ),
                ),
                (
                    "altitude",
                    models.FloatField(
                        blank=True,
                        null=True,
                        verbose_name="Altitude (metros)",
                    ),
                ),
                (
                    "speed",
                    models.FloatField(
                        blank=True,
                        null=True,
                        verbose_name="Velocidade (m/s)",
                    ),
                ),
                (
                    "heading",
                    models.FloatField(
                        blank=True,
                        help_text="Direção em graus (0-360, 0=Norte)",
                        null=True,
                        verbose_name="Direção (graus)",
                    ),
                ),
                (
                    "source",
                    models.CharField(
                        choices=[
                            ("gps", "GPS"),
                            ("network", "Rede"),
                            ("fused", "Fusão GPS+Rede"),
                            ("manual", "Manual"),
                        ],
                        default="gps",
                        max_length=20,
                        verbose_name="Fonte",
                    ),
                ),
                (
                    "device_id",
                    models.CharField(
                        help_text="Identificador único do dispositivo móvel",
                        max_length=100,
                        verbose_name="ID do Dispositivo",
                    ),
                ),
                (
                    "recorded_at",
                    models.DateTimeField(
                        help_text="Timestamp quando a localização foi capturada no dispositivo",
                        verbose_name="Registrado em",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True,
                        verbose_name="Recebido em",
                    ),
                ),
                (
                    "technician",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="location_pings",
                        to="trakservice.technicianprofile",
                        verbose_name="Técnico",
                    ),
                ),
                (
                    "assignment",
                    models.ForeignKey(
                        blank=True,
                        help_text="Atribuição ativa quando o ping foi registrado",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="location_pings",
                        to="trakservice.serviceassignment",
                        verbose_name="Atribuição",
                    ),
                ),
            ],
            options={
                "verbose_name": "Ping de Localização",
                "verbose_name_plural": "Pings de Localização",
                "ordering": ["-recorded_at"],
            },
        ),
        migrations.AddIndex(
            model_name="locationping",
            index=models.Index(
                fields=["technician", "-recorded_at"],
                name="trakservice_technic_93e4c5_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="locationping",
            index=models.Index(
                fields=["recorded_at"],
                name="trakservice_recorde_7d3f8a_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="locationping",
            index=models.Index(
                fields=["device_id"],
                name="trakservice_device__8a2b1c_idx",
            ),
        ),
    ]
