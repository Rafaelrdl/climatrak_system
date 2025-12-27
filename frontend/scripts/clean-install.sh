#!/bin/bash
echo "🧹 Limpeza completa do ambiente de desenvolvimento..."

echo "🗑️ Removendo node_modules..."
rm -rf node_modules

echo "🗑️ Removendo cache do Vite..."
rm -rf node_modules/.vite

echo "🗑️ Removendo lock files..."
rm -f package-lock.json

echo "📦 Reinstalando todas as dependências..."
npm install

echo "✅ Limpeza completa finalizada!"
echo "🚀 Execute 'npm run dev' para iniciar o servidor."
