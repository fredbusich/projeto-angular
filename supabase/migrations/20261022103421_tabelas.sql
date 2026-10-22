-- RepLog, fase 2 — 1/3: as tabelas
--
-- fichas ──< ficha_exercicios          (uma ficha tem vários exercícios, por ordem)
-- treinos ──< treino_exercicios ──< series
-- fichas ──o< treinos                  (um treino pode vir de uma ficha; um treino livre não)
--
-- Cada utilizador é uma linha de auth.users, criada pelo Supabase Auth ao registar.
-- As regras (check) repetem as validações do formulário: mesmo que alguém fale com a base de
-- dados sem passar pela app, não consegue gravar dados inválidos.

create table public.fichas (
  id         uuid primary key default gen_random_uuid(),
  -- o dono: por omissão quem está a gravar; apagar a conta apaga as fichas
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome       text not null check (char_length(btrim(nome)) between 3 and 40),
  tipo       text not null check (tipo in ('push', 'pull', 'legs', 'upper', 'lower', 'full')),
  criada_em  timestamptz not null default now()
);

create table public.ficha_exercicios (
  id            uuid primary key default gen_random_uuid(),
  -- apagar a ficha apaga os seus exercícios (cascata)
  ficha_id      uuid not null references public.fichas (id) on delete cascade,
  ordem         smallint not null check (ordem >= 0),
  exercicio_id  text not null,   -- id do exercício na API ExerciseDB (ex.: 'EIeI8Vf')
  nome          text not null,   -- em inglês, como vem da API (a tradução é feita no ecrã)
  grupo         text not null check (grupo in ('peito', 'costas', 'pernas', 'ombros', 'bracos', 'abdominais', 'gemeos', 'cardio')),
  series        smallint not null check (series between 1 and 10),
  repeticoes    smallint not null check (repeticoes between 1 and 50),
  unique (ficha_id, ordem)
);

create table public.treinos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- nada num treino livre; se a ficha for apagada fica nada e o treino continua no histórico
  ficha_id    uuid references public.fichas (id) on delete set null,
  nome_ficha  text not null,     -- cópia do nome, para o histórico não depender da ficha
  inicio      timestamptz not null,
  fim         timestamptz not null,
  check (fim >= inicio)
);

create table public.treino_exercicios (
  id            uuid primary key default gen_random_uuid(),
  treino_id     uuid not null references public.treinos (id) on delete cascade,
  ordem         smallint not null check (ordem >= 0),
  exercicio_id  text not null,
  nome          text not null,
  grupo         text not null check (grupo in ('peito', 'costas', 'pernas', 'ombros', 'bracos', 'abdominais', 'gemeos', 'cardio')),
  notas         text,
  unique (treino_id, ordem)
);

create table public.series (
  id                   uuid primary key default gen_random_uuid(),
  treino_exercicio_id  uuid not null references public.treino_exercicios (id) on delete cascade,
  numero               smallint not null check (numero >= 1),
  carga                numeric(6, 2) not null default 0 check (carga between 0 and 999),  -- kg
  repeticoes           smallint not null default 0 check (repeticoes between 0 and 100),
  feita                boolean not null default false,
  unique (treino_exercicio_id, numero)
);

-- Índices: o Postgres não cria índices para as chaves estrangeiras. Estes servem as pesquisas
-- mais comuns (as fichas e o histórico de um utilizador). As tabelas "filhas" já têm um índice
-- que começa pela chave estrangeira (o do unique).
create index fichas_user_id_idx on public.fichas (user_id);
create index treinos_user_id_inicio_idx on public.treinos (user_id, inicio desc);
create index treinos_ficha_id_idx on public.treinos (ficha_id);
