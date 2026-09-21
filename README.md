# LazyDeploy — Frontend

Frontend do LazyDeploy, uma aplicação web para acompanhar servidores de
Battlefield 4 e configurar alertas personalizados. O usuário escolhe um
servidor, define as condições da assinatura e recebe uma notificação quando
essas condições são atendidas.

<p align="center">
  <img src="src/assets/images/lazy-deploy-logo-azul.png" alt="LazyDeploy" width="96">
</p>

<p align="center">
  <strong>Monitoramento de servidores BF4 com uma interface simples, responsiva e orientada a eventos.</strong>
</p>

## Demonstração

- Aplicação: [lazydeploy.pages.dev](https://lazydeploy.pages.dev)
- Backend: [lazydeploy-backend](https://github.com/yurepires/lazydeploy-backend)

## Funcionalidades

- Cadastro, login, logout e restauração da sessão autenticada.
- Proteção de rotas para usuários autenticados.
- Dashboard com subscriptions, servidores monitorados e status dos canais.
- Criação e edição de alertas em um wizard de múltiplas etapas.
- Busca de servidores BF4 e seleção de mapas do catálogo.
- Regras de mapa favorito e quantidade mínima de jogadores.
- Ativação, pausa, edição e exclusão de subscriptions.
- Histórico de notificações com filtros de status e canal.
- Página de detalhes do alerta, condições configuradas e histórico recente.
- Layout responsivo para desktop, tablet e celular.
- Tema visual com efeito glass, background inspirado em Battlefield 4 e suporte
  a logos adaptadas ao tema claro ou escuro.

## Tecnologias

- Angular 21
- TypeScript 5.9
- Angular Material e CDK
- SCSS
- RxJS
- Signals e standalone components
- Vitest para testes unitários
- Cloudflare Pages e Pages Functions

## Arquitetura

O projeto é organizado por responsabilidades, mantendo a infraestrutura
compartilhada separada das funcionalidades de negócio:

```text
src/
├── app/
│   ├── core/                  # autenticação, HTTP, guards, layout e roteamento
│   ├── features/
│   │   ├── alerts/            # criação, edição, busca e detalhes dos alertas
│   │   ├── auth/              # login e cadastro
│   │   ├── dashboard/         # visão geral das subscriptions
│   │   ├── history/           # histórico de notificações
│   │   ├── legal/             # política de privacidade e termos de uso
│   │   └── not-found/         # página 404
│   └── shared/                # componentes e utilitários reutilizáveis
├── assets/                    # imagens, logos e background
└── environments/              # configuração por ambiente
functions/
└── api/[[path]].ts            # proxy same-origin para o backend em produção
```

### Fluxo de autenticação

A autenticação utiliza sessão HTTP no backend. O frontend envia as requisições
com credenciais, lê o cookie `XSRF-TOKEN` e adiciona o token no header
`X-XSRF-TOKEN` nas operações mutáveis.

Em produção, o frontend chama apenas `/api`. A Pages Function encaminha essas
requisições ao Railway e preserva `JSESSIONID`, `XSRF-TOKEN`, headers, corpo e
status da resposta. Isso mantém os cookies no domínio do frontend e evita que
navegadores iOS os tratem como cookies de terceiros.

```text
Browser → lazydeploy.pages.dev/api → Pages Function → Railway
```

## Executar localmente

### Pré-requisitos

- Node.js 22 LTS ou versão compatível com Angular 21.
- npm 10 ou superior.
- Backend do LazyDeploy executando em `http://localhost:8080`.

### Instalação

```bash
npm ci
```

### Desenvolvimento

```bash
npm start
```

A aplicação ficará disponível em `http://localhost:4200`. Durante o
desenvolvimento, o arquivo `proxy.conf.json` encaminha `/api` para
`http://localhost:8080`, mantendo a sessão como uma requisição same-origin.

## Build e testes

Build de produção:

```bash
npm run build
```

Os arquivos compilados são gerados em:

```text
dist/lazy-deploy-frontend/browser
```

Testes unitários:

```bash
npm test -- --watch=false
```

O conjunto de testes cobre autenticação, guards, interceptors HTTP, CSRF,
serviços de subscriptions, componentes principais e histórico de notificações.

## Deploy no Cloudflare Pages

Configure o projeto do Cloudflare Pages com:

```text
Build command: npm run build
Output directory: dist/lazy-deploy-frontend/browser
```

O deploy deve utilizar integração com Git ou Wrangler para que a pasta
`functions/` seja detectada como Pages Functions. O upload direto pelo painel
não suporta Pages Functions. Consulte a [documentação oficial de Pages
Functions](https://developers.cloudflare.com/pages/functions/get-started/).

O backend deve manter a origem pública do frontend configurada em:

```env
LAZYDEPLOY_FRONTEND_ORIGIN=https://lazydeploy.pages.dev
```

Caso seja utilizado um domínio próprio, substitua esse valor pela origem exata
do frontend, sem barra no final.

## Rotas da aplicação

| Rota               | Descrição                     |
| ------------------ | ----------------------------- |
| `/login`           | Autenticação do usuário       |
| `/register`        | Criação de uma nova conta     |
| `/dashboard`       | Visão geral das subscriptions |
| `/alerts/new`      | Criação de um novo alerta     |
| `/alerts/:id`      | Detalhes de um alerta         |
| `/alerts/:id/edit` | Edição de um alerta           |
| `/history`         | Histórico de notificações     |
| `/privacy`         | Política de privacidade       |
| `/terms`           | Termos de uso                 |

As páginas protegidas utilizam guards de autenticação. O carregamento das
features é feito sob demanda para reduzir o bundle inicial.

## Documentos legais

Os documentos públicos ficam disponíveis no frontend e no repositório:

- [Política de privacidade](PRIVACY_POLICY.md)
- [Termos de uso](TERMS_OF_USE.md)
- [Licença MIT](LICENSE)

As páginas /privacy e /terms também podem ser acessadas sem autenticação.
Antes do lançamento, revise o responsável pelo tratamento, o email de contato,
a jurisdição e os prazos de retenção para que correspondam à operação real do
serviço. Esses documentos são uma base de projeto e não substituem revisão
jurídica.

## Integração com a API

O cliente HTTP centralizado fica em `src/app/core/http` e concentra:

- montagem das URLs da API;
- envio automático de credenciais;
- obtenção e renovação do token CSRF;
- tratamento de sessões expiradas;
- conversão de respostas `ProblemDetail` em mensagens amigáveis.

As URLs são definidas nos arquivos de ambiente:

- desenvolvimento: `apiBaseUrl: ''`, usando o proxy do Angular;
- produção: `apiBaseUrl: ''`, usando a Pages Function em `/api`.

Nenhuma chave privada ou credencial do backend deve ser colocada no frontend.

## Decisões de projeto

- **Standalone components:** reduz dependências implícitas de módulos e deixa
  cada feature mais fácil de navegar.
- **Lazy loading:** páginas de domínio são carregadas somente quando acessadas.
- **Camadas por feature:** componentes, modelos e acesso a dados ficam próximos
  do contexto em que são usados.
- **Interceptors:** autenticação, CSRF e tratamento de sessão ficam fora dos
  componentes de tela.
- **Proxy same-origin em produção:** mantém a autenticação por cookies segura e
  compatível com as políticas de privacidade do iOS.
- **Design responsivo:** a interface se adapta a diferentes larguras sem
  depender de uma versão separada para dispositivos móveis.

## Integração contínua

O workflow [Frontend CI](.github/workflows/ci.yml) é executado em pull requests
para a branch `main`, em pushes para essa branch e manualmente pelo GitHub.
Ele utiliza Node.js 22, instala as dependências com `npm ci`, executa os testes
e gera o bundle de produção.

Para impedir que alterações com falha sejam incorporadas à `main`, configure
um ruleset no GitHub para essa branch com:

1. exigência de pull request antes do merge;
2. status check obrigatório `Frontend tests and build`;
3. bloqueio de force push e exclusão da branch;
4. aplicação das regras aos administradores, sem bypass permanente.

O check aparecerá para seleção depois que o workflow for executado pelo menos
uma vez no GitHub.

## Estrutura de um fluxo de contribuição

Antes de abrir um pull request, execute:

```bash
npm ci
npm test -- --watch=false
npm run build
```

Alterações visuais devem ser verificadas em desktop, tablet e celular. Alterações
no fluxo autenticado também devem ser testadas em Safari iOS, Chrome Android e
um navegador desktop.
