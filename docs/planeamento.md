# Planeamento — Diário de Treinos (Fase 1)

Aplicação web (SPA) feita em **Angular + TypeScript** para planear fichas de treino e registar, série a série, o treino no ginásio. A ideia inspira-se em apps como o Hevy: criar as fichas (Push, Pull, Legs…), escolher uma quando se vai treinar e apontar a carga e as repetições de cada série logo depois de a fazer.

Nome provisório: **RepLog**.

## 1. As duas fases do projeto

| | Fase 1 (este documento) | Fase 2 (enunciado ainda por sair) |
|---|---|---|
| Foco | Angular e TypeScript: a interface | Back-end e base de dados |
| Pasta | `frontend/` | `backend/` |
| Dados | API pública wger + `localStorage` | Base de dados (a definir com o professor) |
| Ideias | Fichas, treino em curso, histórico, exercícios | Login, recordes, gráficos de progresso, relatórios |

O repositório é o mesmo nas duas fases. Todo o acesso a dados fica nos **Services**: na fase 2 troca-se o `localStorage` pela base de dados sem mexer nos componentes.

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
| Biblioteca de exercícios | API pública **wger** (`https://wger.de/api/v2/`) | `HttpClient`, num Service, com estados de carregamento e erro |
| Fichas de treino | `localStorage` do navegador | `FichaService` |
| Treinos feitos (histórico) | `localStorage` do navegador | `TreinoService` |
| Tema claro/escuro | `localStorage` do navegador | `TemaService` |

Notas sobre a wger (verificadas a 19/10/2026):
- É gratuita, não precisa de chave e aceita pedidos de qualquer site (CORS aberto).
- Tem 932 exercícios, todos com nome em inglês e só cerca de 66 com nome em português. A app mostra o nome em português quando existe e, se não, o nome em inglês.
- As categorias vêm em inglês (Chest, Back, Legs…). A app traduz para português (Peito, Costas, Pernas…).
- Endpoint principal: `exerciseinfo/?category=<id>&limit=<n>`. Cada exercício traz bastante informação, por isso os pedidos são feitos por categoria e em páginas, nunca todos de uma vez.

## 4. Páginas (rotas)

| Rota | Página | O que mostra |
|---|---|---|
| `''` | Início | Próximo treino, números da semana, últimos treinos |
| `fichas` | Fichas | Lista de fichas com "Começar" e "Editar" |
| `fichas/nova` | Formulário de ficha | Criar ficha (formulário reativo) |
| `fichas/:id/editar` | Formulário de ficha | Editar ficha (o mesmo componente) |
| `treino/:fichaId` | Treino em curso | Registar séries, ver o "anterior", temporizador de descanso |
| `historico` | Histórico | Treinos feitos, com duração e volume |
| `exercicios` | Exercícios | Biblioteca da wger, com pesquisa e filtro por grupo muscular |
| `**` | — | Volta ao Início |

## 5. Componentes

```
App
├── Cabecalho            botão de menu, nome da app, botão de tema
├── MenuLateral          lista de páginas (aberto/fechado)
└── <router-outlet>
    ├── Inicio
    ├── Fichas
    │   └── FichaCard            (reutilizável)
    ├── FichaForm
    ├── Treino
    │   ├── SerieLinha           (reutilizável)
    │   └── TemporizadorDescanso
    ├── Historico
    └── Exercicios
        └── ExercicioCard        (reutilizável)
```

Comunicação pai → filho (`@Input`) e filho → pai (`@Output` + `EventEmitter`):

| Filho | Recebe (`@Input`) | Emite (`@Output`) |
|---|---|---|
| `MenuLateral` | `aberto` | `fechar` |
| `FichaCard` | `ficha` | `comecar`, `editar`, `apagar` |
| `ExercicioCard` | `exercicio` | `adicionar` |
| `SerieLinha` | `serie`, `anterior` | `alterada`, `feita` |
| `TemporizadorDescanso` | `segundos` | `terminou` |

## 6. Interfaces TypeScript

```ts
export type GrupoMuscular =
  'peito' | 'costas' | 'pernas' | 'ombros' | 'bracos' | 'abdominais' | 'gemeos' | 'cardio';

export type TipoFicha = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full';

export interface Exercicio {
  id: number;              // id na wger
  nome: string;
  grupo: GrupoMuscular;
  equipamento: string[];
  imagem?: string;
}

export interface ExercicioNaFicha {
  exercicioId: number;
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
  exercicioId: number;
  nome: string;
  grupo: GrupoMuscular;
  notas?: string;
  series: Serie[];
}

export interface Treino {
  id: string;
  fichaId: string;
  nomeFicha: string;
  inicio: string;          // data ISO
  fim?: string;
  exercicios: ExercicioNoTreino[];
}

// Resposta da wger (só os campos que usamos)
export interface RespostaPaginada<T> {
  count: number;
  next: string | null;
  results: T[];
}
```

O nome e o grupo do exercício ficam copiados dentro da ficha e do treino. Assim, abrir uma ficha ou o histórico não precisa da API. Na fase 2, com base de dados, isto pode ser normalizado.

## 7. Services

| Service | Responsabilidade |
|---|---|
| `ExercicioService` | Pedidos HTTP à wger e conversão da resposta para `Exercicio` |
| `FichaService` | Criar, ler, editar e apagar fichas |
| `TreinoService` | Guardar treinos, histórico, "anterior" de cada exercício e maior carga |
| `TemaService` | Tema claro/escuro |
| `ArmazenamentoService` | Ler e guardar no `localStorage` com métodos genéricos (`ler<T>`, `guardar<T>`); usado pelos três anteriores |

Todos com `@Injectable({ providedIn: 'root' })` e injetados pelo construtor, como nas aulas. O Angular 22 gera os services com um decorador novo (`@Service()`), mas o enunciado pede `@Injectable`, por isso é esse que se usa.

## 8. Onde fica cada requisito do enunciado

| # | Requisito | Onde |
|---|---|---|
| 1 | Componentização | Estrutura da secção 5 |
| 2 | `{{ }}`, `[ ]`, `( )` | Em todas as páginas |
| 2 | `[( )]` two-way | Pesquisa de exercícios (`ngModel`) |
| 2 | `@if` / `@for` | Listas de fichas, séries, histórico; mensagens de lista vazia |
| 2 | `@switch` | Estado do pedido (a carregar / erro / vazio / pronto) e grupo muscular |
| 2 | Pipes | `date` (histórico), `number` (cargas e volume), e um pipe nosso `duracao` |
| 3 | `@Input` / `@Output` | `FichaCard`, `ExercicioCard`, `SerieLinha`, `MenuLateral`, `TemporizadorDescanso` |
| 4 | Service, DI, interfaces | Secções 6 e 7 |
| 5 | HttpClient, `Observable`, `subscribe()`, carregamento e erro | `ExercicioService` + página Exercícios |
| 6 | Router (3+ vistas), `router-outlet`, `routerLink` | Secção 4 (7 vistas) |
| 7 | Reactive Forms com validação | `FichaForm`: nome obrigatório (mín. 3 letras), tipo obrigatório, pelo menos 1 exercício, séries e repetições acima de 0 |
| 8 | `OnInit` / `OnDestroy` | `ngOnInit` carrega dados; `ngOnDestroy` para os temporizadores |

## 9. Estrutura de pastas

```
projeto angular/
├── README.md
├── docs/
│   └── planeamento.md
└── frontend/
    └── src/app/
        ├── app.ts / app.html / app.css / app.routes.ts / app.config.ts
        ├── layout/          cabecalho, menu-lateral
        ├── paginas/         inicio, fichas, ficha-form, treino, historico, exercicios
        ├── componentes/     ficha-card, exercicio-card, serie-linha, temporizador-descanso
        ├── servicos/        exercicio-service, ficha-service, treino-service, tema-service, armazenamento-service
        ├── modelos/         interfaces da secção 6 (exercicio, ficha, treino, wger)
        ├── utils/           gerar-id
        └── pipes/           duracao
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
| 10 | `publicacao` | Publicar no GitHub Pages e README final |

## 11. Entrega (do enunciado)

- [x] Repositório público no GitHub
- [ ] Aplicação publicada com link público, a navegar entre páginas
- [ ] README com descrição, funcionalidades, link da app, instruções para correr localmente e API usada
- [ ] Código organizado em componentes, serviços e interfaces
