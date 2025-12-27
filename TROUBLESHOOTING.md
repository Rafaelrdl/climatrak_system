# 🔧 Guia de Solução de Problemas - TrakNor CMMS

## ❌ Erro: Cannot find module 'dep-CvfTChi5.js' (Vite)

### Sintoma
```
Cannot find module '/workspaces/spark-template/node_modules/vite/dist/node/chunks/dep-CvfTChi5.js'
```

### Causa
Este erro ocorre quando os arquivos internos do Vite ficam corrompidos no `node_modules`. Isso pode acontecer por:
- Instalação interrompida
- Atualização parcial de dependências
- Problemas de cache do npm
- Conflitos de versão

### ✅ Solução Rápida

Execute o script de limpeza já configurado no projeto:

```bash
npm run clean
```

Este comando irá:
1. Remover completamente `node_modules/`
2. Limpar o cache do Vite
3. Remover `package-lock.json`
4. Reinstalar todas as dependências do zero

### 🔄 Solução Manual (se o script falhar)

```bash
# 1. Remover node_modules
rm -rf node_modules

# 2. Remover lock file
rm -f package-lock.json

# 3. Limpar cache do npm
npm cache clean --force

# 4. Reinstalar
npm install

# 5. Iniciar servidor
npm run dev
```

### 🚀 Prevenção

Para evitar este problema no futuro:

1. **Sempre use `npm ci` em ambientes limpos** (CI/CD, novos clones)
2. **Não interrompa instalações** (`npm install`)
3. **Mantenha o npm atualizado**: `npm install -g npm@latest`
4. **Use o script de limpeza periodicamente** se encontrar problemas

### 📊 Verificação

Após a reinstalação, verifique se tudo está OK:

```bash
# Verificar se Vite está instalado corretamente
npm list vite

# Deve mostrar: vite@6.3.5
```

---

## 🐛 Outros Problemas Comuns

### Porta 5173 já em uso

**Erro**: `Port 5173 is already in use`

**Solução**:
```bash
# Linux/Mac
lsof -ti:5173 | xargs kill -9

# Ou use o script do projeto
npm run kill
```

### Erro de PostCSS/Tailwind

**Erro**: `Failed to load PostCSS config`

**Solução**: Verifique se `postcss.config.cjs` existe e está correto:
```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

### Tipos TypeScript não encontrados

**Erro**: `Cannot find module '@/...' or its corresponding type declarations`

**Solução**:
```bash
# Reinstalar tipos
npm install --save-dev @types/node @types/react @types/react-dom

# Rebuild TypeScript
npm run build
```

### Vite optimize needed

**Erro**: `The following dependencies need to be pre-bundled`

**Solução**:
```bash
# Forçar otimização de dependências
npm run optimize

# Ou remover cache do Vite
rm -rf node_modules/.vite
```

---

## 🔍 Diagnóstico Avançado

### Verificar integridade do node_modules

```bash
# Verificar se há pacotes corrompidos
npm ls --depth=0 2>&1 | grep "UNMET"

# Verificar Vite especificamente
ls -la node_modules/vite/dist/node/chunks/

# Deve listar arquivos como dep-*.js
```

### Logs detalhados

```bash
# Executar Vite com logs de debug
DEBUG=vite:* npm run dev

# Ver erros completos do npm
npm run dev --loglevel verbose
```

### Verificar versões

```bash
node --version  # Deve ser >= 18.0.0
npm --version   # Deve ser >= 9.0.0
```

---

## 📞 Suporte

Se o problema persistir após todas as tentativas:

1. **Documente o erro completo**: Copie toda a mensagem de erro
2. **Verifique logs**: Procure por mensagens anteriores que possam indicar a causa raiz
3. **Verifique o ambiente**: Confirme versões de Node/npm
4. **Tente em ambiente limpo**: Clone o repositório em novo diretório

### Comandos de diagnóstico completo

```bash
# Criar relatório de diagnóstico
cat > diagnostic-report.txt << EOF
Node Version: $(node --version)
NPM Version: $(npm --version)
OS: $(uname -a)
Working Directory: $(pwd)
Vite Installation: $(npm list vite 2>&1)
Package.json hash: $(md5sum package.json)
EOF

cat diagnostic-report.txt
```

---

## ✅ Checklist de Verificação

Antes de reportar um bug, verifique:

- [ ] `node_modules/` foi completamente removido
- [ ] `package-lock.json` foi removido
- [ ] Cache do npm foi limpo (`npm cache clean --force`)
- [ ] Dependências foram reinstaladas (`npm install`)
- [ ] Versão do Node é >= 18.0.0
- [ ] Versão do npm é >= 9.0.0
- [ ] Não há processos do Vite rodando em background
- [ ] O erro persiste em um diretório limpo

---

**Última atualização**: 2025-01-24
**Versão do projeto**: 0.0.0
**Vite**: 6.3.5
