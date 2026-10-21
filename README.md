# RepLog — Diário de Treinos

Aplicação web (SPA) para planear fichas de treino e registar cada série no ginásio, feita com **Angular** e **TypeScript**. Pensada primeiro para o telemóvel, também funciona no computador.

**App publicada:** https://fredbusich.github.io/projeto-angular/

Projeto prático do módulo de Fundamentos de Angular (UPSKILL), fase 1. Nesta fase, as fichas e os treinos ficam guardados no próprio navegador (`localStorage`) e a biblioteca de exercícios vem de uma API pública. A fase 2 vai juntar um back-end com base de dados.

## Funcionalidades

**Início**
- Sugere o próximo treino (numa rotação Push · Pull · Legs, a ficha feita há mais tempo).
- Mostra os números da semana (treinos, volume e tempo a treinar) e os últimos treinos.
- Tem um botão para começar um **treino vazio**, sem ficha, com os exercícios escolhidos durante o treino.

**Fichas de treino**
- Permite criar, editar e apagar fichas com um formulário reativo validado: nome, tipo de treino e exercícios com séries e repetições.
- Os exercícios podem mudar de ordem.
- Há fichas de exemplo (Push A, Pull A, Legs A) para começar logo.

**Treino em curso**
- Regista a carga e as repetições de cada série, ao lado do que se fez da última vez (coluna «anterior»).
- O temporizador de descanso começa sozinho ao marcar uma série.
- Durante o treino pode-se **acrescentar, substituir, mudar a ordem ou remover exercícios** (só nesse treino; a ficha fica igual). Ao substituir, aparecem **sugestões parecidas**: o mesmo músculo e o mesmo movimento com outro equipamento, por exemplo quando o banco está ocupado.
- Mostra um **aviso de novo recorde** quando se passa a maior carga de sempre num exercício.
- Tem uma **calculadora de discos**: que discos pôr de cada lado da barra, com um desenho da barra.
- O progresso fica guardado a cada série, por isso o treino não se perde se a página recarregar.

**Histórico**
- Treinos agrupados por mês, com duração, volume, séries, a melhor série de cada exercício e os recordes.
- Cada treino pode ser **partilhado como imagem** (WhatsApp, Instagram…).

**Exercícios**
- Biblioteca de 1 500 exercícios, todos com animação.
- Filtro por grupo muscular.
- Pesquisa em **português ou inglês** (aceita plurais e palavras escritas a meio).

**Em toda a app**
- Nomes dos exercícios em português ou inglês (botão PT/EN).
- Tema claro ou escuro.
- Pode ser instalada no ecrã principal do telemóvel.
- **Funciona sem rede**: o service worker guarda a app, os exercícios já vistos e as imagens.

## Fonte de dados

| Dados | Origem |
|---|---|
| Exercícios e animações | API pública [**ExerciseDB**](https://oss.exercisedb.dev/docs) (versão gratuita, da [AscendAPI](https://ascendapi.com)), pedida com `HttpClient`. Uso educativo e não comercial, com crédito à AscendAPI. Aceita 10 pedidos em cada 10 segundos. |
| Nomes dos exercícios em português | Ficheiro da própria app: `frontend/public/dados/nomes-exercicios-pt.json` (1 285 traduções) |
| Fichas, treinos e preferências | `localStorage` do navegador |

## Correr o projeto no computador

É preciso ter o [Node.js](https://nodejs.org) 22 ou mais recente (foi usado o 24) e o npm.

```bash
git clone https://github.com/fredbusich/projeto-angular.git
cd projeto-angular/frontend
npm install
npm start
```

A app abre em http://localhost:4200.

Para gerar a versão de produção, usa `npm run build`; os ficheiros ficam em `frontend/dist/frontend/browser`. O modo sem rede (service worker) só funciona nesta versão, não no `npm start`.

## Publicação

A app é publicada no **GitHub Pages** pelo **GitHub Actions** ([`.github/workflows/publicar.yml`](.github/workflows/publicar.yml)), sempre que há alterações na `main`:

1. `npm ci` instala as dependências.
2. `npm run build:pages` faz o `ng build --base-href /projeto-angular/`, porque a app fica dentro de `/projeto-angular/`.
3. Copia o `index.html` para `404.html`, para que abrir ou recarregar uma página interna (ex.: `/treino/livre`) mostre a app em vez de um erro 404.
4. Publica a pasta `dist/frontend/browser`.

## Tecnologias

- Angular 22: componentes standalone, signals, Router, Reactive Forms, HttpClient e service worker
- TypeScript 6
- RxJS
- CSS próprio, mobile-first, sem bibliotecas de componentes

## Requisitos do enunciado

| Requisito | Onde está (em `frontend/src/app/`) |
|---|---|
| Componentização | 6 páginas (`paginas/`), 8 componentes reutilizáveis (`componentes/`) e 2 de layout (`layout/`) |
| Data binding, `@if` / `@for` / `@switch`, pipes | Two-way na pesquisa (`lista-exercicios.html`); `@switch` no estado do pedido HTTP e da página de treino; pipes `date`, `number` e `i18nPlural` em pt-PT e 2 pipes próprios (`pipes/`) |
| `@Input` / `@Output` + `EventEmitter` | `ExercicioCard`, `FichaCard`, `SerieLinha`, `TreinoCard`, `ListaExercicios`, `ExerciciosParecidos`… |
| Services, DI e interfaces | 7 services em `servicos/` com `@Injectable`, injetados pelo construtor; interfaces em `modelos/` |
| HttpClient | `servicos/exercicio-service.ts` (resposta tipada com `RespostaExerciseDb<T>`) e `componentes/lista-exercicios` (subscribe, a carregar, erro e «Tentar outra vez») |
| Router | `app.routes.ts` (7 rotas e `**`), `<router-outlet>` em `app.html`, `routerLink` no menu |
| Reactive Forms | `paginas/ficha-form`: `FormGroup`, `FormControl`, `FormArray`, `Validators` e validadores próprios, erros por campo e botão bloqueado enquanto o formulário for inválido |
| `OnInit` / `OnDestroy` | `ListaExercicios`, `FichaForm`, `Treino`, `TemporizadorDescanso`… (`OnDestroy` cancela pedidos e para temporizadores) |

O planeamento completo, com as decisões tomadas, está em [`docs/planeamento.md`](docs/planeamento.md).

## Estrutura

```
projeto-angular/
├── .github/workflows/publicar.yml   publicação no GitHub Pages
├── docs/planeamento.md              planeamento e decisões
└── frontend/                        a app Angular
    ├── ngsw-config.json             o que o service worker guarda
    ├── public/                      ícones, manifesto e traduções
    └── src/app/
        ├── paginas/                 inicio, fichas, ficha-form, treino, historico, exercicios
        ├── componentes/             cartões, listas, série, temporizador, calculadora de discos…
        ├── layout/                  cabeçalho e menu lateral
        ├── servicos/                dados (API e localStorage), traduções, partilha…
        ├── modelos/                 interfaces TypeScript
        ├── pipes/ · diretivas/ · utils/
        └── app.routes.ts · app.config.ts
```

## Créditos

- Exercícios e animações: [ExerciseDB](https://oss.exercisedb.dev), da [AscendAPI](https://ascendapi.com).
- Letras: [Barlow e Barlow Condensed](https://fonts.google.com/specimen/Barlow) (Google Fonts).
- Feito por [fredbusich](https://github.com/fredbusich).
