# Planeamento — Diário de Treinos (Fase 1)

Aplicação web (SPA) feita em **Angular + TypeScript** para planear fichas de treino e registar, série a série, o treino no ginásio. A ideia inspira-se em apps como o Hevy: criar as fichas (Push, Pull, Legs…), escolher uma quando se vai treinar e apontar a carga e as repetições de cada série logo depois de a fazer.

Nome provisório: **RepLog**.

## 1. As duas fases do projeto

| | Fase 1 (este documento) | Fase 2 ([`planeamento-fase2.md`](planeamento-fase2.md)) |
|---|---|---|
| Foco | Angular e TypeScript: a interface | Base de dados e login |
| Pasta | `frontend/` | `supabase/` (o SQL) + alterações no `frontend/` |
| Dados | API pública ExerciseDB + `localStorage` | Supabase (Postgres + Auth) + API ExerciseDB |
| O quê | Fichas, treino em curso, histórico, exercícios | Contas com email e palavra-passe, fichas e treinos guardados na conta |

O repositório é o mesmo nas duas fases, e as duas são entregues juntas. Todo o acesso a dados fica nos **Services**: na fase 2 o `localStorage` deu lugar à base de dados dentro dos services, e as páginas só ganharam os estados "a carregar" e "erro" (os dados passaram a vir da rede).

## 2. Decisões de design

- **Telemóvel primeiro (mobile-first).** A app é para usar no ginásio, entre séries. O CSS base é o do telemóvel; o desktop é acrescentado com `@media (min-width: 768px)`.
- **Navegação.** No telemóvel, o menu abre no botão de 3 listras do cabeçalho. No desktop, o menu fica sempre visível à esquerda.
- **Cores.** Preto como base e **lima `#C8F031`** como cor de destaque (botão principal, série feita, recorde, item ativo do menu). Vermelho fica reservado para erros.
- **Tema claro e escuro.** Escuro por omissão; o utilizador pode mudar e a escolha fica guardada.
- **Letras.** *Barlow Condensed* para títulos e números grandes; *Barlow* para o texto.
- **Botões grandes.** Áreas de toque com pelo menos 44 px, para usar com as mãos ocupadas ou suadas.

### Tons

| Token | Escuro | Claro |
|---|---|---|
| Fundo | `#0B0B0C` | `#F2F2EF` |
| Cartão | `#161618` | `#FFFFFF` |
| Cartão elevado | `#202023` | `#EAEAE6` |
| Linha | `#2C2C30` | `#D9D9D4` |
| Texto | `#F4F4F5` | `#0B0B0C` |
| Texto secundário | `#A1A1AA` | `#55555C` |
| Destaque | `#C8F031` (texto por cima: `#0B0B0C`) | igual |

## 3. Fonte de dados na fase 1

| Dados | Onde estão | Como se obtêm |
|---|---|---|
| Biblioteca de exercícios | API pública **ExerciseDB**, versão gratuita da AscendAPI (`https://oss.exercisedb.dev/api/v1/`) | `HttpClient`, num Service, com estados de carregamento e erro |
| Nomes dos exercícios em português | Ficheiro da própria app: `public/dados/nomes-exercicios-pt.json` (1 285 traduções) | `HttpClient` no `TraducaoService`, carregado uma vez ao arrancar a app (`provideAppInitializer`) |
| Fichas de treino | `localStorage` do navegador | `FichaService` |
| Treinos feitos (histórico) | `localStorage` do navegador | `TreinoService` |
| Tema claro/escuro | `localStorage` do navegador | `TemaService` |
| A app, os exercícios já vistos e as imagens (para funcionar sem rede) | Cache do service worker do Angular | `ngsw-config.json`: a app e as traduções ficam logo guardadas; as respostas da API (7 dias) e as imagens (90 dias) ficam guardadas à medida que se veem. Só na versão publicada (`ng build`), não no `ng serve` |
| Língua dos nomes (PT/EN) | `localStorage` do navegador | `TraducaoService` |

Notas sobre a ExerciseDB (verificadas a 20/10/2026):
- 1 500 exercícios, **todos com uma animação** (GIF de 180 px: pessoa em branco com o músculo trabalhado a vermelho), o mesmo estilo de imagem que apps como o Hevy usam.
- Gratuita, sem chave e aceita pedidos de qualquer site (CORS aberto). Condições: uso pessoal/educativo e não comercial, **com crédito à AscendAPI** (está no fim da lista de exercícios), e limites de pedidos apertados.
- Endpoint usado: `exercises?limit=25&name=…&bodyParts=…&after=…`. Pesquisa por nome **na API** (em todos os exercícios), filtro por parte do corpo e paginação por marcador (`after`, com o `nextCursor` da resposta anterior). Máximo de 25 por pedido.
- A pesquisa só é enviada 400 ms depois de se parar de escrever (`debounceTime` do RxJS), para não fazer um pedido por cada letra.
- Na API os nomes só existem em inglês. A app tem a tradução para português de Portugal de todos os nomes (ficheiro JSON acima) e um botão **PT/EN** no cabeçalho para escolher a língua. Os nomes guardam-se sempre em inglês (como vêm da API); a tradução é feita só no ecrã, com o pipe `nomeExercicio`. As partes do corpo e os equipamentos também são traduzidos (Peito, Costas, Halteres, Polia…). A app junta partes do corpo nos grupos dela (ex.: Braços = "upper arms" + "lower arms").
- A pesquisa da API só funciona em inglês, é aproximada e depende da ordem das palavras ("incline bench press" encontra, "bench press incline" não). Por isso `utils/pesquisa.ts` usa as traduções: procura os exercícios cujo nome, em português ou em inglês, tem todas as palavras escritas (aceita plurais, masculino/feminino e palavras escritas a meio) e envia à API a expressão inglesa que esses exercícios têm em comum. O equipamento vai à parte, no filtro `equipments` ("crucifixos com halteres" → `name=fly` + `equipments=dumbbell`). Uma pequena lista de sinónimos cobre palavras que as traduções não usam (rosca → curl, voador → crucifixo, stiff, levantamento terra…). Pesquisas em inglês, ou com as duas línguas misturadas, também funcionam.
- A pesquisa por nome da API é aproximada e junta muitos exercícios só parecidos ("remada unilateral" devolve 137, dos quais 18 têm as duas palavras). Por isso, numa pesquisa, a app pede até 3 páginas seguidas (`expand` do RxJS) e mostra só os exercícios com todas as palavras; "Carregar mais" continua a procura. Ordena-os por relevância (primeiro os que têm a frase escrita) e tira os repetidos com o mesmo nome.
- **Limite da API: 10 pedidos em cada 10 segundos** (depois responde 429). Daí o máximo de 3 páginas por pesquisa e a memória de respostas no `ExercicioService`: reabrir a lista ou repetir uma pesquisa não faz pedidos novos.
- As fichas e os treinos só guardam o id do exercício; a imagem vem do endereço das animações (`static.exercisedb.dev/media/<id>.gif`, função `imagemDoExercicio`).
- Antes da ExerciseDB, a app usava a API **wger** (passos 4 a 9). Foi trocada nas melhorias porque só 224 dos 932 exercícios tinham uma imagem útil e não pesquisava por nome.

## 4. Páginas (rotas)

| Rota | Página | O que mostra |
|---|---|---|
| `''` | Início | Próximo treino, números da semana, últimos treinos |
| `fichas` | Fichas | Lista de fichas com "Começar" e "Editar" |
| `fichas/nova` | Formulário de ficha | Criar ficha (formulário reativo) |
| `fichas/:id/editar` | Formulário de ficha | Editar ficha (o mesmo componente) |
| `treino/:fichaId` | Treino em curso | Registar séries, ver o "anterior", temporizador de descanso; acrescentar, substituir, mudar a ordem e remover exercícios durante o treino (só nesse treino: a ficha fica igual) |
| `treino/livre` | Treino em curso | A mesma rota, com `fichaId = 'livre'`: começa vazio ("Começar treino vazio", no Início): os exercícios escolhem-se durante o treino |
| `historico` | Histórico | Treinos feitos, com duração e volume |
| `exercicios` | Exercícios | Biblioteca da ExerciseDB, com pesquisa e filtro por grupo muscular |
| `**` | — | Volta ao Início |

## 5. Componentes

```
App
├── Cabecalho            botão de menu, nome da app, botões de língua (PT/EN) e de tema
├── MenuLateral          lista de páginas (aberto/fechado)
└── <router-outlet>
    ├── Inicio
    │   └── TreinoCard           (versão curta)
    ├── Fichas
    │   └── FichaCard            (reutilizável)
    ├── FichaForm
    │   └── ListaExercicios      (para escolher exercícios)
    │       └── ExercicioCard
    ├── Treino
    │   ├── SerieLinha           (reutilizável)
    │   ├── TemporizadorDescanso
    │   ├── CalculadoraDiscos    (que discos pôr de cada lado da barra)
    │   ├── ExerciciosParecidos  (sugestões ao substituir um exercício)
    │   └── ListaExercicios      (para acrescentar ou substituir exercícios a meio do treino)
    ├── Historico
    │   └── TreinoCard           (reutilizável: versão detalhada)
    └── Exercicios
        └── ListaExercicios      (reutilizável: a mesma do FichaForm)
            └── ExercicioCard    (reutilizável)
```

Comunicação pai → filho (`@Input`) e filho → pai (`@Output` + `EventEmitter`):

| Filho | Recebe (`@Input`) | Emite (`@Output`) |
|---|---|---|
| `MenuLateral` | `aberto` | `fechar` |
| `FichaCard` | `ficha` | `comecar`, `editar`, `apagar` |
| `ListaExercicios` | `escolhidos`, `grupoInicial` | `escolher` |
| `ExercicioCard` | `exercicio`, `adicionado` | `adicionar` |
| `ExerciciosParecidos` | `exercicioId`, `escolhidos` | `escolher` |
| `SerieLinha` | `serie`, `anterior`, `atual`, `recorde` | `alterada`, `alternarFeita` |
| `TemporizadorDescanso` | `inicio`, `duracao` | `terminou` |
| `CalculadoraDiscos` | `carga`, `barra` | — |
| `TreinoCard` | `treino`, `detalhado` | `apagar`, `partilhar` |

## 6. Interfaces TypeScript

```ts
export type GrupoMuscular =
  'peito' | 'costas' | 'pernas' | 'ombros' | 'bracos' | 'abdominais' | 'gemeos' | 'cardio';

export type TipoFicha = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full';

export interface Exercicio {
  id: string;              // id na ExerciseDB (ex.: "EIeI8Vf")
  nome: string;
  grupo: GrupoMuscular;
  equipamento: string[];
  imagem?: string;
}

export interface ExercicioNaFicha {
  exercicioId: string;
  nome: string;
  grupo: GrupoMuscular;
  series: number;          // séries planeadas
  repeticoes: number;      // repetições alvo
}

export interface Ficha {
  id: string;
  nome: string;
  tipo: TipoFicha;
  exercicios: ExercicioNaFicha[];
  criadaEm: string;        // data ISO
}

export interface Serie {
  numero: number;
  carga: number;           // kg
  repeticoes: number;
  feita: boolean;
}

export interface ExercicioNoTreino {
  exercicioId: string;
  nome: string;
  grupo: GrupoMuscular;
  notas?: string;
  series: Serie[];
}

export interface Treino {
  id: string;
  fichaId: string;         // id da ficha, ou 'livre' (TREINO_LIVRE) num treino começado vazio
  nomeFicha: string;
  inicio: string;          // data ISO
  fim?: string;
  exercicios: ExercicioNoTreino[];
}

// Resposta da ExerciseDB (só os campos que usamos)
export interface RespostaExerciseDb<T> {
  success: boolean;
  meta: { total: number; hasNextPage: boolean; nextCursor?: string };
  data: T[];
}
```

O nome e o grupo do exercício ficam copiados dentro da ficha e do treino. Assim, abrir uma ficha ou o histórico não precisa da API. Na fase 2, com base de dados, isto pode ser normalizado. O `nome` fica em inglês, tal como vem da API, para que trocar de língua mude também as fichas e o histórico já guardados.

## 7. Services

| Service | Responsabilidade |
|---|---|
| `ExercicioService` | Pedidos HTTP à ExerciseDB e conversão da resposta para `Exercicio` |
| `FichaService` | Criar, ler, editar e apagar fichas |
| `TreinoService` | Começar treinos (de uma ficha ou vazios), guardar o treino em curso e o histórico, "anterior" de cada exercício e maior carga |
| `TemaService` | Tema claro/escuro |
| `TraducaoService` | Língua escolhida (PT/EN) e tradução dos nomes dos exercícios |
| `ArmazenamentoService` | Ler e guardar no `localStorage` com métodos genéricos (`ler<T>`, `guardar<T>`); usado por `FichaService`, `TreinoService`, `TemaService` e `TraducaoService` |
| `PartilhaService` | Desenhar o resumo de um treino como imagem (`canvas`, 1080 × 1350) e partilhá-la (Web Share API) ou descarregá-la |

Todos com `@Injectable({ providedIn: 'root' })` e injetados pelo construtor, como nas aulas. O Angular 22 gera os services com um decorador novo (`@Service()`), mas o enunciado pede `@Injectable`, por isso é esse que se usa.

## 8. Onde fica cada requisito do enunciado

Tabela atualizada no fim da fase 1, com os ficheiros onde está cada coisa (útil para a apresentação).

| # | Requisito | Onde (ficheiros em `frontend/src/app/`) |
|---|---|---|
| 1 | Componentização | 6 páginas (7 rotas), 8 componentes reutilizáveis e 2 de layout (secção 5) |
| 2 | `{{ }}` interpolação | Em todos os templates (ex.: `ficha-card.html`: `{{ ficha.nome }}`) |
| 2 | `[ ]` property binding | `[routerLink]`, `[disabled]`, `[class.ativo]`, `[attr.aria-expanded]`, `[style.width.%]` (barras de progresso) |
| 2 | `( )` event binding | `(click)`, `(change)` nas séries, `(ngSubmit)` no formulário |
| 2 | `[( )]` two-way | Pesquisa de exercícios: `[(ngModel)]="pesquisa"` em `lista-exercicios.html` |
| 2 | `@if` / `@for` | Em quase todas as páginas; `@for … @empty` nas listas vazias (fichas, histórico, exercícios) |
| 2 | `@switch` | Estado do pedido HTTP (`lista-exercicios.html`), estado da página e confirmação (`treino.html`) |
| 2 | Pipes nativos | `date` (Início, Histórico, cartões), `number` (kg e volume), `i18nPlural` ("1 exercício / 2 exercícios"), em português (`LOCALE_ID 'pt-PT'`) |
| 2 | Pipes nossos | `pipes/duracao-pipe.ts`: "1:24", "58 min", "2,9 h"; `pipes/nome-exercicio-pipe.ts`: nome do exercício na língua escolhida (pipe impuro, para mudar logo ao carregar em PT/EN) |
| 3 | `@Input` / `@Output` + `EventEmitter` | `ExercicioCard`, `FichaCard`, `SerieLinha`, `TreinoCard`, `TemporizadorDescanso`, `ListaExercicios`, `ExerciciosParecidos`, `CalculadoraDiscos`, `MenuLateral`, `Cabecalho` |
| 4 | Service com `@Injectable` e DI | 7 services em `servicos/`, injetados pelo construtor |
| 4 | Interfaces TypeScript | `modelos/` (`Exercicio`, `Ficha`, `Treino`, `Serie`, `RespostaExerciseDb<T>`…) |
| 5 | HttpClient + `Observable` + `subscribe()` | `servicos/exercicio-service.ts` (pedido e `map`) + `componentes/lista-exercicios` (subscribe, a carregar / erro / tentar outra vez); `servicos/traducao-service.ts` (lê o JSON das traduções) |
| 6 | Router: 3+ vistas, `router-outlet`, `routerLink` | `app.routes.ts` (7 vistas + `**`), `app.html`, menu lateral |
| 7 | Reactive Forms com validação | `paginas/ficha-form`: `FormGroup`, `FormControl`, `FormArray`, `Validators` + validadores nossos (`utils/validadores.ts`), erros por campo, botão bloqueado |
| 8 | `OnInit` | `ListaExercicios`, `ExerciciosParecidos` (pedem os exercícios), `FichaForm` (lê o `:id`), `Treino` (lê o `:fichaId`), `TemporizadorDescanso`, `CalculadoraDiscos` |
| 8 | `OnDestroy` | `TemporizadorDescanso` e `Treino` (param os `setInterval` e `setTimeout`), `ListaExercicios` e `ExerciciosParecidos` (cancelam o pedido), `Exercicios`, diretiva `Painel` |
| 8 | Organização | Pastas por responsabilidade (secção 9); acesso a dados só nos services |

Extras (não pedidos): `ngOnChanges` no temporizador, `computed` e `signal`, diretiva `appPainel` (foco e teclado nos painéis), tema claro/escuro, nomes dos exercícios em português ou inglês (botão PT/EN), pesquisa em português, `provideAppInitializer` (traduções carregadas antes de a app abrir), "Adicionar ao ecrã principal" (manifesto e ícones), treino guardado a cada série (sobrevive a recarregar a página), treino vazio e exercícios alterados a meio do treino (ex.: trocar a variação quando o banco está ocupado), com sugestões de exercícios parecidos; aviso de novo recorde; calculadora de discos; partilhar o treino como imagem; funciona sem rede (service worker do Angular, `ngsw-config.json`).

## 9. Estrutura de pastas

```
projeto angular/
├── README.md
├── docs/
│   └── planeamento.md
└── frontend/
    ├── public/
    │   ├── dados/           nomes-exercicios-pt.json (traduções)
    │   └── icones e manifest.webmanifest
    └── src/app/
        ├── app.ts / app.html / app.css / app.routes.ts / app.config.ts
        ├── layout/          cabecalho, menu-lateral
        ├── paginas/         inicio, fichas, ficha-form, treino, historico, exercicios
        ├── componentes/     ficha-card, exercicio-card, lista-exercicios, exercicios-parecidos, serie-linha,
        │                    temporizador-descanso, calculadora-discos, treino-card
        ├── servicos/        exercicio-service, ficha-service, treino-service, tema-service, traducao-service,
        │                    partilha-service, armazenamento-service
        ├── modelos/         interfaces da secção 6 (exercicio, ficha, treino, exercisedb)
        ├── diretivas/       painel
        ├── utils/           gerar-id, normalizar, validadores, datas, pesquisa, discos
        └── pipes/           duracao, nome-exercicio
```

## 10. Plano de trabalho (um ramo e um PR por passo)

| # | Ramo | O que se faz |
|---|---|---|
| 1 | `planeamento` | Este documento |
| 2 | `criar-app` | `ng new frontend --skip-git`, limpar o modelo inicial |
| 3 | `estrutura` | Rotas, páginas vazias, cabeçalho e menu lateral, estilos base e cores |
| 4 | `modelos-servicos` | Interfaces e Services (`localStorage` e HTTP) |
| 5 | `exercicios` | Biblioteca: HTTP, carregamento/erro, pesquisa, filtro, `ExercicioCard` |
| 6 | `fichas` | Lista de fichas, `FichaCard` e formulário reativo |
| 7 | `treino` | Treino em curso, `SerieLinha`, temporizador de descanso |
| 8 | `inicio-historico` | Início e Histórico, pipes |
| 9 | `acabamento` | Tema claro/escuro, versão desktop, acessibilidade, testes |
| — | `melhorias` | Depois de testar a app: ExerciseDB, PT/EN, pesquisa em português, treino vazio, alterar exercícios a meio do treino, recordes, discos, partilha, modo sem rede |
| 10 | `publicacao` | Publicar no GitHub Pages (GitHub Actions) e README final |

## 11. Entrega (do enunciado)

- [x] Repositório público no GitHub
- [ ] Aplicação publicada com link público, a navegar entre páginas (fica feita com o merge do passo 10 e o GitHub Pages ligado)
- [x] README com descrição, funcionalidades, link da app, instruções para correr localmente e API usada
- [x] Código organizado em componentes, serviços e interfaces

## 12. Publicação

- `.github/workflows/publicar.yml`: a cada push para a `main`, o GitHub Actions instala as dependências (`npm ci`), constrói a app (`npm run build:pages`, que faz `ng build --base-href /projeto-angular/`) e publica a pasta `dist/frontend/browser` no GitHub Pages.
- `base-href /projeto-angular/`: a app fica em `https://fredbusich.github.io/projeto-angular/`, não na raiz do domínio.
- `404.html` (cópia do `index.html`): o GitHub Pages não conhece as rotas do Angular; ao abrir ou recarregar `/projeto-angular/treino/livre` responde com o 404.html, que arranca a app, e o Router mostra a página certa.
