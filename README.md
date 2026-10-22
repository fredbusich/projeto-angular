# RepLog — Diário de Treinos

Aplicação web (SPA) para planear fichas de treino e registar cada série no ginásio, feita com **Angular** e **TypeScript**, com contas e base de dados no **Supabase**. Pensada primeiro para o telemóvel, também funciona no computador.

**App publicada:** https://fredbusich.github.io/projeto-angular/

Projeto prático do módulo de Fundamentos de Angular (UPSKILL), em duas fases entregues juntas:
- **Fase 1:** a interface em Angular, com a biblioteca de exercícios de uma API pública.
- **Fase 2:** contas de utilizador (email e palavra-passe) e as fichas e os treinos numa base de dados Postgres, no Supabase.

## Funcionalidades

**Conta**
- Criar conta (com confirmação por email), entrar, recuperar e mudar a palavra-passe, e sair.
- A app só abre com sessão iniciada; cada pessoa só vê as suas fichas e os seus treinos, em qualquer aparelho.
- Quem já usava a app antes de haver contas pode **importar** as fichas e os treinos que tinha no aparelho.

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
- O progresso fica guardado no aparelho a cada série, por isso o treino não se perde se a página recarregar, nem se não houver rede.

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
- **Funciona sem rede** (no ginásio):
  - o service worker guarda a app, os exercícios já vistos e as imagens;
  - a sessão e uma cópia das fichas e do histórico ficam no aparelho, e aparece o aviso «Sem ligação»;
  - um treino terminado sem rede fica «Por enviar» e vai para a conta quando a rede voltar.

## Fontes de dados

| Dados | Origem |
|---|---|
| Contas (email e palavra-passe) | **Supabase Auth** |
| Fichas e treinos | Base de dados **Postgres do Supabase** (5 tabelas, com RLS), pelo cliente `@supabase/supabase-js` |
| Exercícios e animações | API pública [**ExerciseDB**](https://oss.exercisedb.dev/docs) (versão gratuita, da [AscendAPI](https://ascendapi.com)), pedida com `HttpClient`. Uso educativo e não comercial, com crédito à AscendAPI. Aceita 10 pedidos em cada 10 segundos. |
| Nomes dos exercícios em português | Ficheiro da própria app: `frontend/public/dados/nomes-exercicios-pt.json` (1 285 traduções) |
| Só no aparelho (`localStorage`) | Tema, língua, sessão, treino em curso, treinos por enviar e a cópia das fichas e do histórico |

## Base de dados (Supabase)

O SQL está em `supabase/migrations/` e é aplicado com a **Supabase CLI** (`supabase db push`), por ordem:

1. `…_tabelas.sql`: `fichas` e `ficha_exercicios`; `treinos`, `treino_exercicios` e `series`. As regras (`check`) repetem as validações do formulário.
2. `…_seguranca.sql`: **RLS** em todas as tabelas (cada utilizador só lê e altera as suas linhas) e permissões só para quem tem sessão.
3. `…_funcoes.sql`: `guardar_ficha` e `guardar_treino`, que gravam uma ficha ou um treino com todas as linhas numa só transação.
4. `…_treino_com_id.sql`: o `guardar_treino` aceita o id criado na app, para um treino enviado duas vezes não ficar duplicado.

Os tipos TypeScript das tabelas (`frontend/src/app/modelos/base-de-dados.ts`) são gerados a partir da base de dados com `npm run tipos:bd`.

As decisões da fase 2 estão em [`docs/planeamento-fase2.md`](docs/planeamento-fase2.md).

## Correr o projeto no computador

É preciso ter o [Node.js](https://nodejs.org) 22 ou mais recente (foi usado o 24) e o npm.

```bash
git clone https://github.com/fredbusich/projeto-angular.git
cd projeto-angular/frontend
npm install
npm start
```

A app abre em http://localhost:4200 e usa o projeto Supabase indicado em `frontend/src/environments/environment.ts` (o URL e a chave **pública**, que são feitos para estar no código; a chave secreta nunca entra no repositório).

Para usar outro projeto Supabase:
1. Instala a [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).
2. Na pasta `projeto-angular`, corre `supabase login`, `supabase link --project-ref <ref do projeto>` e `supabase db push`.
3. Põe o URL e a chave *publishable* desse projeto no `environment.ts`.
4. No painel do Supabase, em *Authentication → URL Configuration*, junta `http://localhost:4200/**` às *Redirect URLs*.

Para gerar a versão de produção, usa `npm run build`; os ficheiros ficam em `frontend/dist/frontend/browser`. O service worker só funciona nesta versão, não no `npm start`.

## Publicação

A app é publicada no **GitHub Pages** pelo **GitHub Actions** ([`.github/workflows/publicar.yml`](.github/workflows/publicar.yml)), sempre que há alterações na `main`:

1. `npm ci` instala as dependências.
2. `npm run build:pages` faz o `ng build --base-href /projeto-angular/`, porque a app fica dentro de `/projeto-angular/`.
3. Copia o `index.html` para `404.html`, para que abrir ou recarregar uma página interna (ex.: `/treino/livre`) mostre a app em vez de um erro 404.
4. Publica a pasta `dist/frontend/browser`.

## Tecnologias

- Angular 22: componentes standalone, signals, Router (com guards), Reactive Forms, HttpClient e service worker
- TypeScript 6
- RxJS
- Supabase: Postgres, Auth e o cliente `@supabase/supabase-js`; Supabase CLI para as migrações
- CSS próprio, mobile-first, sem bibliotecas de componentes

## Requisitos do enunciado

| Requisito | Onde está (em `frontend/src/app/`) |
|---|---|
| Componentização | 10 páginas (`paginas/`), 9 componentes reutilizáveis (`componentes/`) e 2 de layout (`layout/`); `CartaoAuth` usa `<ng-content>` |
| Data binding, `@if` / `@for` / `@switch`, pipes | Two-way na pesquisa (`lista-exercicios.html`); `@switch` nos estados a carregar / erro / pronto e na página de treino; pipes `date`, `number` e `i18nPlural` em pt-PT e 2 pipes próprios (`pipes/`) |
| `@Input` / `@Output` + `EventEmitter` | `ExercicioCard`, `FichaCard`, `SerieLinha`, `TreinoCard`, `ListaExercicios`, `ExerciciosParecidos`… |
| Services, DI e interfaces | 10 services em `servicos/` com `@Injectable`, injetados pelo construtor (o `SupabaseService` no `AuthService`, `FichaService` e `TreinoService`); interfaces em `modelos/` |
| HttpClient e dados externos | `servicos/exercicio-service.ts` (ExerciseDB, resposta tipada) e o Supabase nos services de dados; todas as páginas com «a carregar», erro e «Tentar outra vez» |
| Router | `app.routes.ts`: 11 rotas e `**`, guards `sessaoGuard` (`CanActivateChildFn`) e `visitanteGuard` (`CanActivateFn`) em `guards/`, regresso à página pedida depois de entrar |
| Reactive Forms | `paginas/ficha-form` (`FormGroup`, `FormControl`, `FormArray`, validadores próprios) e as páginas de conta (`Validators.email`, `minLength` e o validador de grupo `palavrasPasseIguais`) |
| `OnInit` / `OnDestroy` | `ListaExercicios`, `Treino`, `TemporizadorDescanso`… (`OnDestroy` cancela pedidos e para temporizadores) |

O planeamento da fase 1 está em [`docs/planeamento.md`](docs/planeamento.md) e o da fase 2 em [`docs/planeamento-fase2.md`](docs/planeamento-fase2.md).

## Estrutura

```
projeto-angular/
├── .github/workflows/publicar.yml   publicação no GitHub Pages
├── docs/                            planeamento das duas fases
├── supabase/
│   ├── config.toml                  configuração para a Supabase CLI
│   └── migrations/                  o SQL: tabelas, segurança (RLS) e funções
└── frontend/                        a app Angular
    ├── ngsw-config.json             o que o service worker guarda
    ├── public/                      ícones, manifesto e traduções
    └── src/
        ├── environments/            URL e chave pública do Supabase
        └── app/
            ├── paginas/             inicio, fichas, ficha-form, treino, historico, exercicios,
            │                        entrar, registar, recuperar-palavra-passe, nova-palavra-passe
            ├── componentes/         cartões, listas, série, temporizador, calculadora de discos…
            ├── layout/              cabeçalho e menu lateral
            ├── guards/              sessao-guard, visitante-guard
            ├── servicos/            Supabase, conta, fichas, treinos, importação, API, traduções…
            ├── modelos/             interfaces TypeScript e os tipos gerados da base de dados
            ├── pipes/ · diretivas/ · utils/
            └── app.routes.ts · app.config.ts
```

## Créditos

- Exercícios e animações: [ExerciseDB](https://oss.exercisedb.dev), da [AscendAPI](https://ascendapi.com).
- Base de dados e contas: [Supabase](https://supabase.com).
- Letras: [Barlow e Barlow Condensed](https://fonts.google.com/specimen/Barlow) (Google Fonts).
- Feito por [fredbusich](https://github.com/fredbusich).
