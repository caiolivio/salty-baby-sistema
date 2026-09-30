# Salty Baby · Sistema

Este repositório reúne a vitrine, a área do cliente, a área da fornecedora e o painel de gestão do brechó infantil Salty Baby.

As regras do sistema estão em [CLAUDE.md](./CLAUDE.md). O Claude Code lê esse arquivo sempre que trabalha neste projeto.

## Como uma mudança chega ao ar

1. Cada parte nova é feita num pull request.
2. O GitHub confere o código (lint, tipos, testes e build) e publica a versão no **teste.saltybaby.com.br**.
3. Depois de testar e aprovar, o pull request é juntado à `main`.

O **app.saltybaby.com.br** só recebe publicação quando o sistema estiver pronto para uso.

## Para quem programa

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # cálculos de repasse, desconto e cupom
npm run lint && npm run typecheck && npm run build
```

Para rodar localmente, crie um `.env.local` com:

- `DB_HOST`, `DB_PORT`, `DB_NOME`, `DB_USUARIO` e `DB_SENHA` (um MySQL ou MariaDB local);
- `AUTH_SECRET` (qualquer texto longo e aleatório) e `CODIGO_PRIMEIRO_ACESSO`.

A estrutura do banco fica em `prisma/schema.prisma`. Para criar uma migração nova, use
`DATABASE_URL=mysql://... npx prisma migrate dev --name <nome>`. Na publicação, as migrações são aplicadas
automaticamente (`prisma migrate deploy`, por um túnel SSH até a VPS).

Na primeira vez, a página `/primeiro-acesso` cria a administradora. Ela pede o código do segredo
`CODIGO_PRIMEIRO_ACESSO` e deixa de funcionar assim que existe uma administradora.
