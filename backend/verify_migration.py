#!/usr/bin/env python
"""Verificar se os campos asset_tag, tenant, site foram criados na tabela reading."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
os.environ['DB_HOST'] = 'localhost'
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name, data_type, is_nullable, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'reading'
          AND column_name IN ('asset_tag', 'tenant', 'site')
        ORDER BY column_name
    """)
    
    print("\n✅ Colunas criadas na tabela 'reading':")
    print("=" * 70)
    for row in cursor.fetchall():
        col_name, data_type, is_nullable, max_length = row
        nullable = "Sim" if is_nullable == "YES" else "Não"
        print(f"  📌 {col_name:<12} | {data_type:<20} | Max: {max_length or 'N/A':<6} | Nullable: {nullable}")
    
    # Verificar índices
    cursor.execute("""
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'reading'
          AND indexname LIKE '%asset%'
        ORDER BY indexname
    """)
    
    print("\n✅ Índices criados:")
    print("=" * 70)
    for row in cursor.fetchall():
        idx_name, idx_def = row
        print(f"  🔍 {idx_name}")
        print(f"     {idx_def[:100]}...")
    
    # Contar readings atuais
    cursor.execute("SELECT COUNT(*) FROM reading")
    total = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM reading WHERE asset_tag IS NOT NULL")
    with_asset_tag = cursor.fetchone()[0]
    
    print(f"\n📊 Dados atuais:")
    print("=" * 70)
    print(f"  Total de readings: {total:,}")
    print(f"  Com asset_tag:     {with_asset_tag:,}")
    print(f"  Sem asset_tag:     {total - with_asset_tag:,}")
    
    if with_asset_tag > 0:
        cursor.execute("""
            SELECT asset_tag, tenant, site, COUNT(*) as count
            FROM reading
            WHERE asset_tag IS NOT NULL
            GROUP BY asset_tag, tenant, site
            ORDER BY count DESC
            LIMIT 5
        """)
        print(f"\n📈 Top 5 assets com dados:")
        print("=" * 70)
        for row in cursor.fetchall():
            asset, tenant, site, count = row
            print(f"  🏢 Asset: {asset or 'NULL':<15} | Tenant: {tenant or 'NULL':<10} | Site: {site or 'NULL':<10} | Readings: {count:,}")
    else:
        print(f"\n⚠️  Nenhum reading com asset_tag ainda (dados antigos não têm o campo preenchido)")
        print(f"   Novos dados via MQTT já serão salvos com asset_tag!")

print("\n✅ Verificação concluída!\n")
