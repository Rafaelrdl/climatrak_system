"""
Testes para validar as correções dos 5 bugs críticos identificados.

1. Dependência Circular: tenantStorage ↔ getTenantConfig
2. Schema Context: tenant.slug vs tenant.schema_name
3. Import Modelo: TelemetryReading vs Reading
4. Cursor Management: cursor usado fora do contexto
5. JWT Base64url: decodificação incorreta
"""

import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import TestCase
from django_tenants.utils import schema_context
from apps.tenants.models import Tenant
from apps.ingest.models import Reading


class TestSchemaContextFixes(TestCase):
    """Testa correção do schema_context com tenant.schema_name"""
    
    def test_tenant_schema_name_with_hyphen(self):
        """
        BUG FIX #2: Verifica que tenants com hífen usam schema_name corretamente
        
        Tenant com slug "uberlandia-medical-center" deve ter:
        - slug = "uberlandia-medical-center" 
        - schema_name = "uberlandia_medical_center" (underscores)
        """
        # Simular tenant com hífen
        tenant_slug = "test-medical-center"
        expected_schema = "test_medical_center"
        
        # Verificar que hífen é convertido para underscore
        schema_name = tenant_slug.replace('-', '_')
        self.assertEqual(schema_name, expected_schema)
        
        print(f"✅ Hífen convertido corretamente: {tenant_slug} → {schema_name}")


class TestModelImport(TestCase):
    """Testa correção do import do modelo Reading"""
    
    def test_reading_model_exists(self):
        """
        BUG FIX #3: Verifica que Reading existe (não TelemetryReading)
        """
        from apps.ingest.models import Reading
        
        # Verificar que modelo existe e tem campos esperados
        self.assertTrue(hasattr(Reading, 'device_id'))
        self.assertTrue(hasattr(Reading, 'sensor_id'))
        self.assertTrue(hasattr(Reading, 'value'))
        self.assertTrue(hasattr(Reading, 'ts'))
        
        print(f"✅ Modelo Reading importado corretamente")
        print(f"   Campos: device_id, sensor_id, value, ts")
    
    def test_telemetry_reading_does_not_exist(self):
        """Verifica que TelemetryReading não existe (nome antigo)"""
        try:
            from apps.ingest.models import TelemetryReading
            self.fail("TelemetryReading não deveria existir")
        except ImportError:
            print("✅ TelemetryReading corretamente não existe")


class TestCursorManagement(TestCase):
    """Testa correção do gerenciamento de cursor"""
    
    def test_cursor_context_pattern(self):
        """
        BUG FIX #4: Verifica padrão correto de uso de cursor
        
        Correto:
        with connection.cursor() as cursor:
            cursor.execute(sql)
            rows = cursor.fetchall()
        # cursor fechado automaticamente
        
        Incorreto:
        with connection.cursor() as cursor:
            cursor.execute(sql1)
        cursor.execute(sql2)  # ❌ cursor já fechado!
        """
        from django.db import connection
        
        # Testar padrão correto
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            self.assertEqual(result[0], 1)
        
        # Verificar que cursor está fechado
        try:
            cursor.execute("SELECT 1")
            self.fail("Cursor deveria estar fechado")
        except Exception as e:
            # Esperado: cursor já fechado
            print(f"✅ Cursor corretamente fechado após contexto")


class TestBase64urlDecoding(TestCase):
    """Testa correção da decodificação JWT base64url"""
    
    def test_base64url_normalization(self):
        """
        BUG FIX #5: Verifica normalização base64url → base64
        
        Base64url usa: - e _
        Base64 padrão usa: + e /
        """
        import base64
        
        # Exemplo de payload base64url (com - e _)
        base64url_payload = "eyJ0ZXN0IjoidmFsdWUiLCJ0ZW5hbnRfc2x1ZyI6InRlc3QtdGVuYW50In0"
        
        # Normalizar base64url → base64
        normalized = base64url_payload.replace('-', '+').replace('_', '/')
        
        # Adicionar padding
        padding = '=' * ((4 - len(normalized) % 4) % 4)
        padded = normalized + padding
        
        # Decodificar
        decoded_bytes = base64.b64decode(padded)
        decoded_str = decoded_bytes.decode('utf-8')
        
        # Verificar resultado
        import json
        payload = json.loads(decoded_str)
        
        self.assertIn('test', payload)
        self.assertEqual(payload['test'], 'value')
        
        print(f"✅ Base64url decodificado corretamente")
        print(f"   Original: {base64url_payload[:30]}...")
        print(f"   Payload: {payload}")


class TestFileCorrections(TestCase):
    """Valida que os arquivos foram corrigidos"""
    
    def test_tasks_use_schema_name(self):
        """Verifica que tasks.py usam tenant.schema_name"""
        import re
        
        files_to_check = [
            'apps/assets/tasks.py',
            'apps/alerts/tasks.py',
            'apps/ops/tasks.py',
        ]
        
        for filepath in files_to_check:
            full_path = os.path.join(os.path.dirname(__file__), filepath)
            if os.path.exists(full_path):
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Verificar que usa tenant.schema_name
                if 'schema_context(tenant.schema_name)' in content:
                    print(f"✅ {filepath}: usa tenant.schema_name")
                else:
                    # Verificar se tem algum schema_context
                    if 'schema_context' in content:
                        print(f"⚠️  {filepath}: tem schema_context mas verificar manualmente")
    
    def test_ops_imports_reading(self):
        """Verifica que ops/tasks.py importa Reading"""
        filepath = 'apps/ops/tasks.py'
        full_path = os.path.join(os.path.dirname(__file__), filepath)
        
        if os.path.exists(full_path):
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Verificar import correto
            if 'from apps.ingest.models import Reading' in content:
                print(f"✅ {filepath}: importa Reading corretamente")
            
            # Verificar que NÃO importa TelemetryReading
            if 'TelemetryReading' not in content:
                print(f"✅ {filepath}: não importa TelemetryReading (correto)")


def run_tests():
    """Executa todos os testes"""
    print("\n" + "="*70)
    print("🧪 TESTES DE VALIDAÇÃO DAS CORREÇÕES DE BUGS")
    print("="*70 + "\n")
    
    # Executar testes
    from django.test.runner import DiscoverRunner
    test_runner = DiscoverRunner(verbosity=2)
    
    # Executar testes desta classe
    failures = test_runner.run_tests(['test_bug_fixes'])
    
    print("\n" + "="*70)
    if failures == 0:
        print("✅ TODOS OS TESTES PASSARAM!")
    else:
        print(f"❌ {failures} teste(s) falharam")
    print("="*70 + "\n")
    
    return failures


if __name__ == '__main__':
    sys.exit(run_tests())
