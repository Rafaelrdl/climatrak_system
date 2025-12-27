# 🚑 Quick Fix Reference - TrakNor CMMS

## Erros Mais Comuns e Soluções Rápidas

### 1. ❌ Vite Module Not Found (dep-*.js)
```bash
# SOLUÇÃO RÁPIDA
npm run clean
```

### 2. ❌ Port 5173 Already in Use
```bash
# SOLUÇÃO RÁPIDA
npm run kill
# ou
lsof -ti:5173 | xargs kill -9
```

### 3. ❌ PostCSS Config Failed
```bash
# VERIFICAR se postcss.config.cjs existe
# CONTEÚDO deve ser:
# module.exports = { plugins: { '@tailwindcss/postcss': {} } }
```

### 4. ❌ Cannot Find @/... (TypeScript Path)
```bash
# SOLUÇÃO
npm install --save-dev @types/node @types/react @types/react-dom
npm run build
```

### 5. ❌ CORS Error (Backend)
```bash
# VERIFICAR backend_django/.env
# Deve ter: CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### 6. ❌ Login Failed (Credentials)
```bash
# CREDENCIAIS DE TESTE:
# Admin: admin@traknor.com / admin123
# Técnico: tecnico@traknor.com / tecnico123
```

### 7. ❌ Tailwind Styles Not Loading
```bash
# VERIFICAR src/index.css tem:
# @import 'tailwindcss';
# @import "tw-animate-css";
```

### 8. ❌ React Router Not Working
```bash
# VERIFICAR vite.config.ts não alterou 'base'
# DEVE SER: base: '/'
```

---

## 🔄 Reset Completo (Última Opção)

Se nada funcionar:

```bash
# 1. Backup de mudanças importantes
git stash

# 2. Limpeza total
npm run clean

# 3. Restaurar arquivos críticos do Spark (se alterados)
git checkout HEAD -- src/main.tsx src/main.css index.html vite.config.ts

# 4. Reinstalar
npm install

# 5. Iniciar
npm run dev
```

---

## 📞 Checklist Antes de Pedir Ajuda

- [ ] Executei `npm run clean`
- [ ] Verifiquei versões: `node --version` (>= 18) e `npm --version` (>= 9)
- [ ] Li o erro completo (não só a primeira linha)
- [ ] Verifiquei se não modifiquei arquivos em `NOT_INSTRUCTIONS.md`
- [ ] Testei em navegador anônimo (sem extensões)
- [ ] Consultei `TROUBLESHOOTING.md`

---

## 🎯 Comandos Úteis

```bash
# Verificar saúde geral
npm list --depth=0          # Ver dependências instaladas
npm outdated                # Ver pacotes desatualizados
npm audit                   # Verificar vulnerabilidades

# Logs e debug
npm run dev --loglevel verbose    # Logs detalhados
DEBUG=vite:* npm run dev          # Debug do Vite

# Limpeza
npm cache clean --force           # Limpar cache npm
rm -rf node_modules/.vite         # Limpar cache Vite
rm -rf dist                       # Limpar build
```

---

**Mantido por**: Equipe TrakNor  
**Atualizado**: 2025-01-24  
**Versão do Guia**: 1.0
