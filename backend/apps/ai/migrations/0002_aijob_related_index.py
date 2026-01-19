# Generated migration for AI related index
# Adds index for efficient filtering by related object

from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Add composite index for related object filtering.
    
    This index optimizes queries like:
    - GET /api/ai/jobs/?related_type=asset&related_id=123
    - Finding all jobs for a specific asset/work_order
    
    The index covers: (tenant_id, related_type, related_id, created_at)
    """

    dependencies = [
        ("ai", "0001_initial"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="aijob",
            index=models.Index(
                fields=["tenant_id", "related_type", "related_id", "created_at"],
                name="ai_job_related_lookup_idx",
            ),
        ),
        # Índice adicional para listagem por agente + status
        migrations.AddIndex(
            model_name="aijob",
            index=models.Index(
                fields=["tenant_id", "agent_key", "status", "created_at"],
                name="ai_job_agent_status_idx",
            ),
        ),
    ]
