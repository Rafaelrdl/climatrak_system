#!/bin/bash
# Script de validação para verificar SelectItem com valores vazios
# Este script deve ser executado no CI/CD para evitar regressões

echo "🔍 Verificando SelectItem com valores vazios..."

# Verificar valores vazios "" em SelectItem
EMPTY_VALUES=$(grep -rn 'SelectItem.*value=""' src/ 2>/dev/null || true)
if [ ! -z "$EMPTY_VALUES" ]; then
    echo "❌ Erro: Encontrados SelectItem com valores vazios:"
    echo "$EMPTY_VALUES"
    exit 1
fi

# Verificar valores "none" em SelectItem que podem causar problemas
NONE_VALUES=$(grep -rn 'SelectItem.*value="none"' src/ 2>/dev/null || true)
if [ ! -z "$NONE_VALUES" ]; then
    echo "⚠️  Atenção: Encontrados SelectItem com value='none' (verifique se há lógica apropriada):"
    echo "$NONE_VALUES"
fi

echo "✅ Validação concluída: Nenhum SelectItem com valores vazios encontrado"
exit 0