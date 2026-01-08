# Generated migration for TenantFeature model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="TenantFeature",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "feature_key",
                    models.CharField(
                        db_index=True,
                        help_text="Hierarchical feature key (e.g., trakservice.enabled)",
                        max_length=100,
                        verbose_name="Feature Key",
                    ),
                ),
                (
                    "enabled",
                    models.BooleanField(
                        default=False,
                        help_text="Whether this feature is enabled for the tenant",
                        verbose_name="Enabled",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="features",
                        to="tenants.tenant",
                        verbose_name="Tenant",
                    ),
                ),
            ],
            options={
                "verbose_name": "Tenant Feature",
                "verbose_name_plural": "Tenant Features",
                "db_table": "tenant_features",
                "ordering": ["tenant", "feature_key"],
            },
        ),
        migrations.AddIndex(
            model_name="tenantfeature",
            index=models.Index(
                fields=["tenant", "enabled"], name="tenant_feat_tenant__6d8d5a_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="tenantfeature",
            index=models.Index(
                fields=["feature_key", "enabled"], name="tenant_feat_feature_b6c5e3_idx"
            ),
        ),
        migrations.AlterUniqueTogether(
            name="tenantfeature",
            unique_together={("tenant", "feature_key")},
        ),
    ]
