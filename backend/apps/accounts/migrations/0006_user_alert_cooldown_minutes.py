# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_invite_tenantmembership'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='alert_cooldown_minutes',
            field=models.PositiveIntegerField(
                default=60,
                help_text='Minimum interval between alerts for the same variable (in minutes)',
                verbose_name='Alert Cooldown (minutes)'
            ),
        ),
    ]
