#!/bin/bash
# Script para gerenciar Ollama com/sem GPU
# Uso:
#   ./ollama-gpu.sh start    # Inicia com GPU
#   ./ollama-gpu.sh stop     # Para o Ollama
#   ./ollama-gpu.sh cpu      # Inicia com CPU only
#   ./ollama-gpu.sh status   # Verifica status
#   ./ollama-gpu.sh test     # Testa se GPU está funcionando

set -e

COMPOSE_FILE="docker-compose.yml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

case "$1" in
    start|gpu)
        echo "🚀 Iniciando Ollama com GPU NVIDIA..."
        docker compose --profile gpu up -d ollama-gpu
        echo "⏳ Aguardando Ollama iniciar..."
        sleep 5
        echo "🔍 Verificando GPU..."
        docker exec climatrak-ollama nvidia-smi 2>/dev/null || echo "⚠️  nvidia-smi não disponível (GPU pode não estar configurada)"
        echo ""
        echo "✅ Ollama iniciado! Teste com:"
        echo "   curl http://localhost:11434/api/tags"
        ;;
    
    cpu)
        echo "🖥️  Iniciando Ollama com CPU only..."
        docker compose --profile cpu up -d ollama
        echo "✅ Ollama (CPU) iniciado!"
        ;;
    
    stop)
        echo "🛑 Parando Ollama..."
        docker compose --profile gpu stop ollama-gpu 2>/dev/null || true
        docker compose --profile cpu stop ollama 2>/dev/null || true
        docker rm climatrak-ollama 2>/dev/null || true
        echo "✅ Ollama parado!"
        ;;
    
    status)
        echo "📊 Status do Ollama:"
        docker ps --filter "name=climatrak-ollama" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        echo "📦 Modelos disponíveis:"
        curl -s http://localhost:11434/api/tags 2>/dev/null | jq -r '.models[].name' 2>/dev/null || echo "Ollama não está rodando"
        ;;
    
    test)
        echo "🧪 Testando GPU no container Ollama..."
        if docker exec climatrak-ollama nvidia-smi 2>/dev/null; then
            echo ""
            echo "✅ GPU NVIDIA detectada e funcionando!"
            echo ""
            echo "🔥 Testando inferência com GPU..."
            time curl -s http://localhost:11434/api/generate -d '{"model":"mistral-nemo","prompt":"Say hello","stream":false}' | jq -r '.response'
        else
            echo "❌ GPU não disponível no container."
            echo ""
            echo "Verifique:"
            echo "  1. Driver NVIDIA instalado no host: nvidia-smi"
            echo "  2. Docker Desktop configurado com WSL2 backend"
            echo "  3. Container iniciado com --profile gpu"
        fi
        ;;
    
    pull)
        echo "📥 Baixando modelo mistral-nemo..."
        docker exec climatrak-ollama ollama pull mistral-nemo
        echo "✅ Modelo baixado!"
        ;;
    
    *)
        echo "Uso: $0 {start|gpu|cpu|stop|status|test|pull}"
        echo ""
        echo "Comandos:"
        echo "  start/gpu  - Inicia Ollama com GPU NVIDIA"
        echo "  cpu        - Inicia Ollama com CPU only"
        echo "  stop       - Para o Ollama"
        echo "  status     - Mostra status e modelos"
        echo "  test       - Testa se GPU está funcionando"
        echo "  pull       - Baixa modelo mistral-nemo"
        exit 1
        ;;
esac
