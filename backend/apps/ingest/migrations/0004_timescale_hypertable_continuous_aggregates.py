# TimescaleDB: Hypertable only (Continuous Aggregates require Community/Enterprise license)

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ingest', '0003_reading_and_more'),
    ]

    operations = [
        # Drop unique constraint on 'id' column (required for TimescaleDB hypertable)
        migrations.RunSQL(
            sql="ALTER TABLE reading DROP CONSTRAINT IF EXISTS reading_pkey;",
            reverse_sql="-- Cannot restore primary key after hypertable conversion"
        ),
        
        # Convert reading table to hypertable (Apache OSS compatible)
        migrations.RunSQL(
            sql="""
            SELECT create_hypertable('reading', 'ts', if_not_exists => TRUE, migrate_data => TRUE);
            """,
            reverse_sql="-- Cannot reverse hypertable conversion safely"
        ),
        
        # Note: Continuous Aggregates removed due to Apache OSS license limitations
        # They require Community or Enterprise edition of TimescaleDB
        # Alternative: Use manual aggregation queries with time_bucket() in views
    ]
