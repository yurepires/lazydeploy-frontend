# LazyDeploy Frontend

Frontend Angular do LazyDeploy, organizado por camadas e features. A fundação usa
standalone components, SCSS, Angular Material, Signals e lazy loading de rotas.

## Executar localmente

```bash
npm install
npm start
```

O servidor de desenvolvimento fica disponível em `http://localhost:4200`.

## Verificar o projeto

```bash
npm run build
npm test -- --watch=false
```

## Estrutura

- `src/app/core`: infraestrutura global, shell e configuração de API.
- `src/app/shared`: componentes e modelos reutilizáveis.
- `src/app/features`: telas agrupadas por domínio.
- `src/assets`: imagens e branding substituíveis sem alterar componentes.
- `src/environments`: URLs por ambiente.

As telas atuais são placeholders visuais. Autenticação, integração com o backend,
CSRF e dados reais serão adicionados na próxima fase.

O background temático atual está em `src/assets/images/backgrounds/bf4-background.jpg`.
Para substituí-lo, troque esse arquivo mantendo o mesmo nome ou atualize o token
`--background-image` em `src/styles.scss`.
