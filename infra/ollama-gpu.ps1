# Script para gerenciar Ollama com/sem GPU no Windows
# Uso:
#   .\ollama-gpu.ps1 start    # Inicia com GPU
#   .\ollama-gpu.ps1 stop     # Para o Ollama
#   .\ollama-gpu.ps1 cpu      # Inicia com CPU only
#   .\ollama-gpu.ps1 status   # Verifica status
#   .\ollama-gpu.ps1 test     # Testa se GPU esta funcionando

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "gpu", "cpu", "stop", "status", "test", "pull", "help")]
    [string]$Command = "help"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

switch ($Command) {
    { $_ -in "start", "gpu" } {
        Write-Info "Iniciando Ollama com GPU NVIDIA..."
        
        # Parar versao CPU se existir (ignorar erros)
        $null = docker compose --profile cpu stop ollama 2>&1
        $null = docker rm climatrak-ollama 2>&1
        
        # Iniciar com GPU
        docker compose --profile gpu up -d ollama-gpu
        
        Write-Info "Aguardando Ollama iniciar..."
        Start-Sleep -Seconds 5
        
        Write-Info "Verificando GPU..."
        try {
            docker exec climatrak-ollama nvidia-smi
            Write-Success "GPU NVIDIA detectada!"
        } catch {
            Write-Warn "nvidia-smi nao disponivel (GPU pode nao estar configurada)"
        }
        
        Write-Host ""
        Write-Success "Ollama iniciado com GPU!"
        Write-Host "Teste com: curl http://localhost:11434/api/tags"
    }
    
    "cpu" {
        Write-Info "Iniciando Ollama com CPU only..."
        
        # Parar versao GPU se existir (ignorar erros)
        $null = docker compose --profile gpu stop ollama-gpu 2>&1
        $null = docker rm climatrak-ollama 2>&1
        
        # Iniciar com CPU
        docker compose --profile cpu up -d ollama
        
        Write-Success "Ollama (CPU) iniciado!"
    }
    
    "stop" {
        Write-Info "Parando Ollama..."
        $null = docker compose --profile gpu stop ollama-gpu 2>&1
        $null = docker compose --profile cpu stop ollama 2>&1
        $null = docker rm climatrak-ollama 2>&1
        Write-Success "Ollama parado!"
    }
    
    "status" {
        Write-Info "Status do Ollama:"
        docker ps --filter "name=climatrak-ollama" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"
        
        Write-Host ""
        Write-Info "Modelos disponiveis:"
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -ErrorAction Stop
            $response.models | ForEach-Object { Write-Host "  - $($_.name)" }
        } catch {
            Write-Warn "Ollama nao esta rodando ou nao responde"
        }
    }
    
    "test" {
        Write-Info "Testando GPU no container Ollama..."
        
        try {
            docker exec climatrak-ollama nvidia-smi
            Write-Host ""
            Write-Success "GPU NVIDIA detectada e funcionando!"
            
            Write-Host ""
            Write-Info "Testando inferencia com GPU..."
            $startTime = Get-Date
            
            $body = @{
                model = "mistral-nemo"
                prompt = "Say hello in 3 words"
                stream = $false
            } | ConvertTo-Json
            
            $response = Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -Body $body -ContentType "application/json"
            
            $elapsed = (Get-Date) - $startTime
            Write-Host ""
            Write-Host "Resposta: $($response.response)"
            Write-Host "Tempo: $($elapsed.TotalSeconds.ToString('F2'))s"
            Write-Host ""
            
            if ($elapsed.TotalSeconds -lt 10) {
                Write-Success "GPU esta acelerando a inferencia! (menos de 10s)"
            } elseif ($elapsed.TotalSeconds -lt 30) {
                Write-Info "Performance OK, mas pode melhorar"
            } else {
                Write-Warn "Lento! Verifique se GPU esta sendo usada"
            }
        } catch {
            Write-Err "GPU nao disponivel no container."
            Write-Host ""
            Write-Host "Verifique:"
            Write-Host "  1. Driver NVIDIA instalado no Windows: nvidia-smi"
            Write-Host "  2. Docker Desktop com WSL2 backend habilitado"
            Write-Host "  3. Container iniciado com: .\ollama-gpu.ps1 start"
        }
    }
    
    "pull" {
        Write-Info "Baixando modelo mistral-nemo..."
        docker exec climatrak-ollama ollama pull mistral-nemo
        Write-Success "Modelo baixado!"
    }
    
    default {
        Write-Host ""
        Write-Host "Uso: .\ollama-gpu.ps1 [comando]" -ForegroundColor White
        Write-Host ""
        Write-Host "Comandos:" -ForegroundColor Yellow
        Write-Host "  start/gpu  - Inicia Ollama com GPU NVIDIA"
        Write-Host "  cpu        - Inicia Ollama com CPU only"
        Write-Host "  stop       - Para o Ollama"
        Write-Host "  status     - Mostra status e modelos"
        Write-Host "  test       - Testa se GPU esta funcionando"
        Write-Host "  pull       - Baixa modelo mistral-nemo"
        Write-Host ""
        Write-Host "Pre-requisitos para GPU no Windows:" -ForegroundColor Yellow
        Write-Host "  1. Driver NVIDIA atualizado (Game Ready ou Studio)"
        Write-Host "  2. Docker Desktop com WSL2 backend"
        Write-Host "  3. WSL2 atualizado (wsl --update)"
        Write-Host ""
        Write-Host "Para verificar GPU no host:" -ForegroundColor Yellow
        Write-Host "  nvidia-smi"
        Write-Host ""
    }
}
