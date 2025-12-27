# Convert telemetry table to TimescaleDB hypertable

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ingest', '0001_initial'),
    ]

    operations = [
        # Drop the primary key constraint (TimescaleDB doesn't require it)
        migrations.RunSQL(
            sql="ALTER TABLE telemetry DROP CONSTRAINT telemetry_pkey;",
            reverse_sql="ALTER TABLE telemetry ADD PRIMARY KEY (id);",
        ),
        # Convert to TimescaleDB hypertable
        migrations.RunSQL(
            sql="""
                SELECT create_hypertable(
                    'telemetry', 
                    'timestamp',
                    chunk_time_interval => INTERVAL '1 day',
                    if_not_exists => TRUE
                );
            """,
            reverse_sql="-- No reverse operation needed",
        ),
        # Add index on id for lookups (since we removed PK)
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS telemetry_id_idx ON telemetry (id);",
            reverse_sql="DROP INDEX IF EXISTS telemetry_id_idx;",
        ),
    ]
