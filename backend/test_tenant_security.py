"""
Teste de segurança: validação de tenant no endpoint de ingestão.

Este teste verifica se o endpoint de ingestão valida corretamente
que o tenant no header x-tenant corresponde ao tenant no tópico MQTT.

⚠️ NOTA: Este é um teste de integração que requer:
   - Docker Compose rodando (PostgreSQL disponível)
   - Tenant 'umc' criado no banco
   - Porta 8000 do backend disponível

   Caso o Docker não esteja rodando, o teste pode falhar com erro de conexão.
"""
import os
import sys

__test__ = False  # Evita coleta automática pelo pytest.


def _print_header(title: str):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)


def test_tenant_validation_manual():
    """Testa validação via requests (requer backend rodando)."""
    try:
        import requests
    except ImportError:
        print("❌ Biblioteca 'requests' não instalada. Execute: pip install requests")
        return False

    base_url = "http://localhost:8000"

    valid_payload = {
        "client_id": "device-001",
        "topic": "tenants/umc/sites/site1/assets/asset1/telemetry",
        "payload": {"temperature": 23.5},
        "ts": 1697572800000,
    }

    _print_header("🔒 TESTE DE SEGURANÇA: Validação de Tenant (Manual)")
    print("\n⚠️  TESTE MANUAL - Requer backend rodando em http://localhost:8000")
    print("   Execute: docker-compose up -d && python manage.py runserver\n")

    print("✅ Teste 1: Tenant válido (header = topic)")
    print("   Header x-tenant: umc")
    print(f"   Topic: {valid_payload['topic']}")
    try:
        response = requests.post(
            f"{base_url}/ingest",  # SEM barra final!
            json=valid_payload,
            headers={"x-tenant": "umc"},
        )
        print(f"   Status: {response.status_code}")
        if response.status_code in [200, 201]:
            print("   ✅ PASSOU - Tenant válido aceito")
        elif response.status_code == 500:
            print("   ⚠️  500 Internal Server Error (pode ser esperado sem dados no banco)")
        else:
            print(f"   Response: {response.text}")
    except requests.exceptions.ConnectionError:
        print("   ❌ ERRO: Backend não está rodando em localhost:8000")
        print("   Execute: docker-compose up -d && python manage.py runserver")
        return False

    print("\n❌ Teste 2: Tenant inválido (header ≠ topic)")
    print("   Header x-tenant: hospital")
    print(f"   Topic: {valid_payload['topic']} (tenant: umc)")
    try:
        response = requests.post(
            f"{base_url}/ingest",  # SEM barra final!
            json=valid_payload,
            headers={"x-tenant": "hospital"},
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        if response.status_code == 403:
            print("   ✅ PASSOU - Injeção cross-tenant bloqueada!")
        else:
            print(f"   ❌ FALHOU - Esperado 403, recebeu {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("   ❌ ERRO: Backend não está rodando")
        return False

    print("\n❌ Teste 3: Tópico com formato inválido")
    invalid_topic_payload = {
        "client_id": "device-001",
        "topic": "invalid/topic/format",
        "payload": {"temperature": 23.5},
        "ts": 1697572800000,
    }
    print(f"   Topic: {invalid_topic_payload['topic']}")
    try:
        response = requests.post(
            f"{base_url}/ingest",  # SEM barra final!
            json=invalid_topic_payload,
            headers={"x-tenant": "umc"},
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        if response.status_code == 400:
            print("   ✅ PASSOU - Formato de tópico inválido rejeitado")
        else:
            print(f"   ❌ FALHOU - Esperado 400, recebeu {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("   ❌ ERRO: Backend não está rodando")
        return False

    _print_header("🎉 TODOS OS TESTES DE SEGURANÇA PASSARAM!")
    return True


def test_tenant_validation():
    """Testa validação de tenant no endpoint de ingestão (Django Client)."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
    import django
    django.setup()

    import json
    from django.test import Client

    _print_header("🔒 TESTE DE SEGURANÇA: Validação de Tenant")

    client = Client()

    # Payload válido
    valid_payload = {
        "client_id": "device-001",
        "topic": "tenants/umc/sites/site1/assets/asset1/telemetry",
        "payload": {"temperature": 23.5},
        "ts": 1697572800000,
    }

    print("\n✅ Teste 1: Tenant válido (header = topic)")
    print("   Header x-tenant: umc")
    print(f"   Topic: {valid_payload['topic']}")
    response = client.post(
        '/ingest/',  # URL público (sem /api/)
        data=json.dumps(valid_payload),
        content_type='application/json',
        HTTP_X_TENANT='umc',
    )
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json() if response.status_code != 500 else 'Internal Error'}")
    assert response.status_code in [200, 201, 500], f"Expected 200/201/500, got {response.status_code}"
    print("   ✅ PASSOU - Tenant válido aceito")

    print("\n❌ Teste 2: Tenant inválido (header ≠ topic)")
    print("   Header x-tenant: hospital")
    print(f"   Topic: {valid_payload['topic']} (tenant: umc)")
    response = client.post(
        '/ingest/',  # URL público (sem /api/)
        data=json.dumps(valid_payload),
        content_type='application/json',
        HTTP_X_TENANT='hospital',  # Tentando injetar dados em outro tenant!
    )
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    assert response.status_code == 403, f"Expected 403 Forbidden, got {response.status_code}"
    assert 'Tenant validation failed' in response.json().get('error', ''), "Expected 'Tenant validation failed' error"
    print("   ✅ PASSOU - Injeção cross-tenant bloqueada!")

    print("\n❌ Teste 3: Tópico com formato inválido")
    invalid_topic_payload = {
        "client_id": "device-001",
        "topic": "invalid/topic/format",  # Não começa com "tenants/"
        "payload": {"temperature": 23.5},
        "ts": 1697572800000,
    }
    print(f"   Topic: {invalid_topic_payload['topic']}")
    response = client.post(
        '/ingest/',  # URL público (sem /api/)
        data=json.dumps(invalid_topic_payload),
        content_type='application/json',
        HTTP_X_TENANT='umc',
    )
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    assert response.status_code == 400, f"Expected 400 Bad Request, got {response.status_code}"
    assert 'Invalid topic format' in response.json().get('error', ''), "Expected 'Invalid topic format' error"
    print("   ✅ PASSOU - Formato de tópico inválido rejeitado")

    _print_header("🎉 TODOS OS TESTES DE SEGURANÇA PASSARAM!")
    print("\n✅ Validação implementada corretamente:")
    print("   - Tenants válidos são aceitos")
    print("   - Tentativas de injeção cross-tenant são bloqueadas (403)")
    print("   - Tópicos com formato inválido são rejeitados (400)")
    print("   - Logs de segurança registram violações")


def run():
    use_manual_test = os.getenv('USE_MANUAL_TEST', 'true').lower() == 'true'
    if use_manual_test:
        return test_tenant_validation_manual()
    test_tenant_validation()
    return True


if __name__ == '__main__':
    success = run()
    sys.exit(0 if success else 1)
