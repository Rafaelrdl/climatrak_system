"""
Migração para remover a restrição unique_together do modelo Sensor.

A restrição (device, metric_type) impedia que um device tivesse múltiplos
sensores do mesmo tipo, o que não é compatível com dispositivos como o
gateway Khomp que pode ter múltiplos sensores de temperatura.

Solução: Remover unique_together e confiar na unicidade do tag.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('assets', '0001_initial'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='sensor',
            unique_together=set(),  # Remove todas as restrições unique_together
        ),
    ]
