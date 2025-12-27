#!/bin/bash
echo "🔍 Verificando dependências essenciais..."

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
  echo "📦 Diretório node_modules não encontrado. Instalando dependências..."
  npm install
  exit 0
fi

# Verificar pacotes específicos
MISSING_DEPS=false

# Função para verificar um pacote específico
check_package() {
  if [ ! -d "node_modules/$1" ]; then
    echo "⚠️ Pacote $1 não encontrado."
    MISSING_DEPS=true
  fi
}

# Verificar pacotes problemáticos
check_package "react-pdf"
check_package "@dnd-kit/core"
check_package "@dnd-kit/sortable"
check_package "pdfjs-dist"

# Se algum pacote estiver faltando, reinstalar tudo
if [ "$MISSING_DEPS" = true ]; then
  echo "🔄 Reinstalando dependências..."
  rm -rf node_modules/.vite
  npm install
else
  echo "✅ Todas as dependências essenciais estão instaladas."
fi
