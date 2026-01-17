#!/usr/bin/env python3
"""
Provisionador EMQX para ClimaTrak (Python)
Cria Connector HTTP, Action e Rule para encaminhar telemetria MQTT para /ingest
"""
import os
import sys
import json
import requests
from typing import Dict, Any


def main():
    # Configuração via env vars
    tenant_slug = os.getenv('TENANT_SLUG', 'umc')
    emqx_base_url = os.getenv('EMQX_BASE_URL', 'http://localhost:18083')
    emqx_user = os.getenv('EMQX_DASHBOARD_USER', 'admin')
    emqx_pass = os.getenv('EMQX_DASHBOARD_PASS', 'public')
    ingest_base_url = os.getenv('INGEST_BASE_URL', 'http://api:8000')
    ingest_path = os.getenv('INGEST_PATH', '/ingest')
    ingest_device_token = (
        os.getenv("INGEST_DEVICE_TOKEN") or os.getenv("INGESTION_SECRET") or ""
    )
    
    connector_name = f"http_ingest_{tenant_slug}"
    action_name = f"http_ingest_{tenant_slug}"
    rule_id = f"r_{tenant_slug}_ingest"
    action_body = """{
  "client_id": "${client_id}",
  "topic": "${topic}",
  "ts": ${ts},
  "payload": ${payload}
}"""
    
    # Login para obter token
    print(f">> Fazendo login no EMQX em {emqx_base_url}...")
    login_resp = requests.post(
        f"{emqx_base_url}/api/v5/login",
        json={"username": emqx_user, "password": emqx_pass},
        headers={"Content-Type": "application/json"}
    )
    if login_resp.status_code != 200:
        print(f"❌ Falha no login: {login_resp.status_code} - {login_resp.text}")
        sys.exit(1)
    
    token = login_resp.json().get('token')
    if not token:
        print("❌ Token não retornado no login")
        sys.exit(1)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Criar/atualizar Connector HTTP
    print(f">> Criando/validando Connector HTTP: {connector_name}")
    connector_id = f"http:{connector_name}"
    
    # Verificar se existe
    check_conn = requests.get(f"{emqx_base_url}/api/v5/connectors/{connector_id}", headers=headers)
    
    connector_payload = {
        "type": "http",
        "name": connector_name,
        "enable": True,
        "url": ingest_base_url,
        "pool_size": 8,
        "connect_timeout": "15s"
    }
    
    if check_conn.status_code == 404:
        # Criar novo
        create_resp = requests.post(
            f"{emqx_base_url}/api/v5/connectors",
            json=connector_payload,
            headers=headers
        )
        if create_resp.status_code in [200, 201]:
            print(f"   ✓ Connector criado: {connector_id}")
        else:
            print(f"   ❌ Erro ao criar connector: {create_resp.status_code}")
            print(f"   Response: {create_resp.text}")
    else:
        # Já existe, atualizar
        update_resp = requests.put(
            f"{emqx_base_url}/api/v5/connectors/{connector_id}",
            json=connector_payload,
            headers=headers
        )
        if update_resp.status_code == 200:
            print(f"   ✓ Connector atualizado: {connector_id}")
        else:
            print(f"   ⚠ Connector já existe (não atualizado)")
    
    # Criar/atualizar Action HTTP
    print(f">> Criando/validando Action HTTP: {action_name}")
    action_id = f"http:{action_name}"
    
    # Verificar se existe
    check_action = requests.get(f"{emqx_base_url}/api/v5/actions/{action_id}", headers=headers)
    
    action_headers = {
        "content-type": "application/json",
        "x-tenant": tenant_slug,
    }
    if ingest_device_token:
        action_headers["x-device-token"] = ingest_device_token

    action_payload = {
        "type": "http",
        "name": action_name,
        "enable": True,
        "connector": connector_id,
        "parameters": {
            "path": ingest_path,
            "method": "post",
            "headers": action_headers,
            "body": action_body,
            "max_retries": 3
        },
        "resource_opts": {
            "request_ttl": "45s",
            "health_check_interval": "15s"
        }
    }
    
    if check_action.status_code == 404:
        # Criar novo
        create_resp = requests.post(
            f"{emqx_base_url}/api/v5/actions",
            json=action_payload,
            headers=headers
        )
        if create_resp.status_code in [200, 201]:
            print(f"   ✓ Action criada: {action_id}")
        else:
            print(f"   ❌ Erro ao criar action: {create_resp.status_code}")
            print(f"   Response: {create_resp.text}")
    else:
        # Já existe, atualizar
        update_resp = requests.put(
            f"{emqx_base_url}/api/v5/actions/{action_id}",
            json=action_payload,
            headers=headers
        )
        if update_resp.status_code == 200:
            print(f"   ✓ Action atualizada: {action_id}")
        else:
            print(f"   ⚠ Action já existe (não atualizada)")
    
    # Criar/atualizar Rule
    print(f">> Criando/validando Regra: {rule_id}")
    
    # Verificar se existe
    check_rule = requests.get(f"{emqx_base_url}/api/v5/rules/{rule_id}", headers=headers)
    
    rule_sql = f'''SELECT
  clientid as client_id,
  topic,
  payload,
  timestamp as ts
FROM "tenants/{tenant_slug}/#"'''
    
    rule_payload = {
        "id": rule_id,
        "sql": rule_sql,
        "actions": [action_id],
        "enable": True,
        "description": f"Forward tenants/{tenant_slug}/# -> HTTP {ingest_path}"
    }
    
    if check_rule.status_code == 404:
        # Criar nova
        create_resp = requests.post(
            f"{emqx_base_url}/api/v5/rules",
            json=rule_payload,
            headers=headers
        )
        if create_resp.status_code in [200, 201]:
            print(f"   ✓ Regra criada: {rule_id}")
        else:
            print(f"   ❌ Erro ao criar regra: {create_resp.status_code}")
            print(f"   Response: {create_resp.text}")
    else:
        # Já existe, atualizar
        update_resp = requests.put(
            f"{emqx_base_url}/api/v5/rules/{rule_id}",
            json=rule_payload,
            headers=headers
        )
        if update_resp.status_code == 200:
            print(f"   ✓ Regra atualizada: {rule_id}")
        else:
            print(f"   ⚠ Regra já existe (não atualizada)")
    
    print("\n✅ Provisioning EMQX concluído:")
    print(f"   - Connector: {connector_id}")
    print(f"   - Action:    {action_id}")
    print(f"   - Regra:     {rule_id}")
    print(f"   - Tópicos:   tenants/{tenant_slug}/#")
    print(f"   - Envio ->   {ingest_base_url}{ingest_path}")


if __name__ == "__main__":
    main()
