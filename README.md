# Front Financeiro

Frontend Next.js (App Router, TypeScript, Tailwind) da API de controle financeiro multi-tenant
(`../api-financeiro`). A pessoa cria a conta, envia o extrato CSV que baixou do banco e vê os gastos
de cada mês por categoria.

Front e API rodam **na mesma origem**: o navegador só fala com o Next, que repassa `/api/*` para a
API removendo o prefixo (`rewrites` em `next.config.ts`):

```
http://localhost:3000/        →  Next.js
http://localhost:3000/api/*   →  FastAPI em http://localhost:8000 (sem o prefixo /api)
```

## Como rodar localmente

```bash
# 1. API, MySQL e Redis (no diretório api-financeiro). Use --build depois de atualizar o código da API.
cd ../api-financeiro
docker compose up --build -d

# 2. Front, com hot reload
cd ../front-financeiro
npm install
npm run dev               # http://localhost:3000
```

Se a API estiver em outro endereço, defina `API_URL` no `.env` do front (veja `.env.example`).

No `.env` da API, para desenvolvimento em `http://localhost`:

```dotenv
COOKIE_SECURE=false            # sem HTTPS local; em produção, true
REFRESH_COOKIE_PATH=/api/auth  # é o padrão; o caminho que o navegador vê
```

Para ter um usuário, use a tela **Criar conta** (http://localhost:3000/cadastro).

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento (porta 3000) |
| `npm run build` / `npm start` | build e servidor de produção |
| `npm test` | testes unitários (Vitest): `api-client` (inclusive upload) e conversão de dinheiro |
| `npm run lint` | ESLint |

`NEXT_PUBLIC_API_BASE` (padrão `/api`, veja `.env.example`) só precisa mudar se a API for publicada
em outro caminho.

## Estrutura

```
app/
  login/                    entrar
  cadastro/                 criar conta (a API cria o tenant e já loga)
  (app)/                    área logada: RequireAuth + menu
    dashboard/              Gastos do mês: totais, gráfico por categoria, lançamentos
    importar/               enviar CSV → prévia → (colunas, se outro banco) → importar; histórico/desfazer
contexts/auth-context.tsx   sessão: access token em memória + refresh silencioso no mount
lib/api-client.ts           wrapper único de fetch (token, credentials, refresh em 401, upload)
lib/money.ts                texto ⇄ centavos inteiros, sem float
components/                 UI, gráfico de gastos por categoria, RequireAuth
tests/                      Vitest
```

## Decisões

### Access token só em memória

O access token (15 min) fica no estado do `AuthContext`, **nunca** em `localStorage` ou
`sessionStorage`. Um XSS que rode depois do carregamento ainda pode usar a sessão enquanto a aba está
aberta, mas não consegue **levar** um token que sobreviva. O refresh token (7 dias) está num cookie
`HttpOnly` que o JavaScript não lê.

A consequência é que um F5 apaga o token. Por isso, ao montar a aplicação, o `AuthContext` chama
`POST /api/auth/refresh` (o navegador envia o cookie sozinho) e só libera as rotas protegidas depois
dessa resposta. Enquanto isso, `RequireAuth` mostra "Carregando sessão…". Sem sessão, ele redireciona
para `/login?next=<rota>`, e o `next` é validado para aceitar só caminhos internos (sem open redirect).

### `lib/api-client.ts`: um único ponto de acesso à API

Toda chamada passa por `apiFetch`, que:
- usa `credentials: "include"`;
- injeta `Authorization: Bearer <token>` lido do `AuthContext`;
- em **401**, chama `POST /api/auth/refresh` e repete a requisição original **uma vez**. Se o
  refresh falhar, ou a repetição também der 401, encerra a sessão. Não há loop.

**Refresh compartilhado ("single-flight"):** a API rotaciona o refresh token a cada uso e trata
reuso como roubo, revogando a sessão inteira. Se três requisições recebessem 401 ao mesmo tempo e
cada uma chamasse `/refresh`, a segunda e a terceira reusariam um cookie já consumido e derrubariam
o usuário. Por isso:
- na mesma aba, existe no máximo um refresh em andamento, e todas as requisições esperam o mesmo
  resultado. Isso também cobre o React StrictMode do `npm run dev`, que monta o `AuthContext` duas
  vezes;
- entre abas, um Web Lock (`navigator.locks`) serializa os refreshes, porque o cookie é compartilhado
  entre as abas;
- se outra requisição já renovou o token enquanto esta estava em voo, a repetição usa o token novo
  sem novo refresh.

Esses casos estão cobertos em `tests/api-client.test.ts`.

### Sem BFF: o browser fala direto com a API

Não há API routes, Route Handlers nem Server Actions do Next fazendo proxy. O navegador chama
`/api/*`, que chega ao FastAPI sem passar por código nosso: em desenvolvimento pelo `rewrites` do
Next, em produção pelo proxy reverso. O Next só serve a interface.

**Por quê:**
- **Um salto a menos:** cada requisição vai do navegador ao proxy e à API, sem passar por um
  servidor Node que só repassa a chamada.
- **Uma fonte de verdade para auth:** a API já faz login, rotação de refresh, detecção de reuso e
  revogação. Um BFF teria uma segunda camada de sessão (cookie do Next ⇄ tokens da API) para manter
  coerente com a primeira.
- **O Next fica sem estado e sem segredos:** ele não guarda tokens nem chaves e pode até ser servido
  como estático. Escalar e operar o front fica trivial.
- **A mesma origem resolve o que o BFF costuma resolver:** sem CORS, e com o cookie
  `SameSite=Strict` funcionando.

**Trade-off:** a lógica de sessão (refresh em 401, single-flight, lock entre abas, refresh
silencioso no mount) mora **no client**, replicada em cada aba, em vez de centralizada no servidor
Next. Concretamente:
- essa lógica é mais delicada no browser (concorrência entre requisições e entre abas) e precisa de
  testes próprios. Num BFF, o servidor renovaria o token de forma transparente;
- o access token existe no JavaScript da página (em memória). Num BFF, o browser só teria um cookie
  de sessão opaco e nunca veria token algum;
- Server Components não conseguem buscar dados autenticados, porque o servidor Next não tem o token.
  As telas logadas são client components que buscam dados no navegador, e não há SSR de dados
  privados.

Para um app de uso interativo como este, isso é aceitável e mantém a arquitetura simples. Se SSR de
dados privados ou a remoção do token do browser passarem a ser requisitos, o caminho é um BFF.

### Fluxo do produto

1. **Criar conta** (`/cadastro`): nome, e-mail e senha. A API cria um tenant só da pessoa e devolve
   a sessão, e ela cai direto em Importar extrato.
2. **Importar extrato** (`/importar`): ao escolher ou arrastar o CSV, o front chama
   `/importacoes/preview`, que não salva nada, e mostra o formato reconhecido (Nubank conta, Nubank
   cartão ou outro banco), as primeiras linhas e a conta sugerida. Para outro banco, a pessoa
   confirma qual coluna é data, descrição e valor (já vêm sugeridas) e se os gastos vêm positivos.
   Depois de importar, a tela mostra quantos lançamentos entraram, quantos já existiam (reimportar
   não duplica) e quais linhas não puderam ser lidas, com links "Ver gastos de <mês>". O histórico
   permite desfazer uma importação.
3. **Gastos do mês** (`/dashboard?mes=AAAA-MM`): o total gasto em destaque, entradas e saldo; um
   gráfico de barras com os gastos por categoria (maior primeiro; passe o mouse ou o foco do teclado
   para ver o % e a quantidade; clique para filtrar a lista); e os lançamentos, cada um com a
   categoria editável. Trocar a categoria atualiza o gráfico. Pagamentos de fatura não entram nos
   totais e aparecem numa nota abaixo do gráfico.

### Outras escolhas

- **Dinheiro em centavos inteiros também no front.** `parseReaisParaCentavos` converte texto para
  centavos manipulando a string, sem `parseFloat`. Aceita `49,90`, `1.234,56` e também `10.50`
  (ponto decimal de teclado americano), e recusa entradas ambíguas como `10,555`.
- **Mês e categoria na URL** (`/dashboard?mes=2026-10&categoria=3`): F5, voltar e compartilhar o link
  preservam a visão. Sem mês na URL, abre o mais recente que tem lançamentos.
- **Gráfico:** uma série só (gasto por categoria), então um único tom, sem legenda, e o título nomeia
  o que está plotado. Valor no fim de cada barra; o tooltip fica na própria linha para não esconder as
  barras vizinhas. Cada barra é um botão, acessível por teclado e com descrição para leitor de tela.
- **Páginas preservadas pelo Next 16:** com Cache Components, o Next esconde as páginas visitadas em
  vez de desmontá-las. O `useAsync` limpa os dados ao esconder a página, para que, ao voltar (por
  exemplo, depois de importar um extrato), a tela mostre "Carregando…" em vez de um total
  desatualizado.
- `next.config.ts` usa `instantInsights.validationLevel: "manual-warning"`: a área logada só
  renderiza no navegador, então a validação de navegação instantânea do Next 16 avisaria em toda
  página protegida sem que haja algo a corrigir.

## Produção

- Rode `npm run build && npm start` (ou um container Node) atrás do proxy, com HTTPS.
- No proxy: `/api/` → API **removendo o prefixo**, `/` → Next (no nginx, `proxy_pass http://api:8000/;`
  com a barra final). Sem proxy na frente, o `rewrites` do Next faz esse papel: defina `API_URL`.
- Na API: `COOKIE_SECURE=true`, `REFRESH_COOKIE_PATH=/api/auth`, `ENVIRONMENT=production`.
