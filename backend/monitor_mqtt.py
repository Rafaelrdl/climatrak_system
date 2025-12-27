#!/usr/bin/env python
"""
Script para monitorar mensagens MQTT chegando no broker.
"""
import paho.mqtt.client as mqtt
import json
from datetime import datetime

MQTT_HOST = "localhost"
MQTT_PORT = 1883
MQTT_USER = "admin"  # Usuário padrão do EMQX
MQTT_PASS = "muaythay99"  # Senha padrão do EMQX

def on_connect(client, userdata, flags, rc):
    rc_messages = {
        0: "✅ Conectado ao broker EMQX",
        1: "❌ Protocolo incorreto",
        2: "❌ Client ID rejeitado",
        3: "❌ Servidor indisponível",
        4: "❌ Usuário/senha incorretos",
        5: "❌ Não autorizado"
    }
    
    if rc == 0:
        print(rc_messages.get(rc, f"Código {rc}"))
        # Subscrever em TODOS os tópicos
        client.subscribe("#")
        print("📡 Monitorando TODOS os tópicos MQTT...\n")
        print("=" * 80)
    else:
        print(rc_messages.get(rc, f"❌ Falha na conexão: {rc}"))
        print("\n💡 Dica: Verifique usuário/senha do EMQX")
        print("   Padrão: admin / public")
        print("   Para permitir anônimo, configure no EMQX Dashboard:")
        print("   Settings → Authentication → Allow Anonymous")

def on_message(client, userdata, msg):
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"\n[{timestamp}] 📨 Tópico: {msg.topic}")
    
    try:
        payload = json.loads(msg.payload.decode())
        print(f"   Payload JSON:")
        print(json.dumps(payload, indent=4, ensure_ascii=False))
    except:
        print(f"   Payload (raw): {msg.payload.decode()}")
    
    print("-" * 80)

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
client.username_pw_set(MQTT_USER, MQTT_PASS)
client.on_connect = on_connect
client.on_message = on_message

try:
    print(f"🔌 Conectando ao broker em {MQTT_HOST}:{MQTT_PORT}...")
    print(f"   Usuário: {MQTT_USER}")
    client.connect(MQTT_HOST, MQTT_PORT, 60)
    print("✅ Conectado! Aguardando mensagens...")
    print("   (Pressione Ctrl+C para parar)")
    print("")
    client.loop_forever()
except KeyboardInterrupt:
    print("\n\n⛔ Monitoramento interrompido pelo usuário")
    client.disconnect()
except Exception as e:
    print(f"\n❌ Erro: {e}")
