---
name: implement-issue
description: Implementa uma issue do backlog seguindo docs do repo
argument-hint: "Cole o texto da issue (ex: FIN-001) e referências"
---

Você está no repositório ClimaTrak System (monorepo).

Tarefa: implementar a issue fornecida.

Regras:
1) Leia os documentos em /docs citados na issue e siga-os fielmente.
2) Faça um plano de alteração de arquivos.
3) Implemente com migrations, serializers, viewsets, filtros e testes.
4) Garanta idempotência quando exigido (finance/eventos).
5) Ao final: como testar localmente + quais endpoints validar.

Issue:
{{input}}
