-- RepLog, fase 2 — 2/3: segurança
--
-- RLS (Row Level Security): cada utilizador só lê e altera as SUAS linhas. A regra está na
-- própria base de dados, por isso vale para qualquer pedido, venha da app ou não.
-- `(select auth.uid())` é o id de quem fez o pedido (lido do token de sessão); escrito assim,
-- o Postgres calcula-o uma vez por pedido e não uma vez por linha.

alter table public.fichas enable row level security;
alter table public.ficha_exercicios enable row level security;
alter table public.treinos enable row level security;
alter table public.treino_exercicios enable row level security;
alter table public.series enable row level security;

-- fichas: o dono faz tudo (ler, criar, editar, apagar)
create policy "Cada utilizador gere as suas fichas"
  on public.fichas for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- exercícios de uma ficha: só se a ficha for do utilizador
create policy "Cada utilizador gere os exercícios das suas fichas"
  on public.ficha_exercicios for all to authenticated
  using (exists (
    select 1 from public.fichas f
    where f.id = ficha_exercicios.ficha_id and f.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.fichas f
    where f.id = ficha_exercicios.ficha_id and f.user_id = (select auth.uid())
  ));

-- treinos: o dono faz tudo; e um treino só pode apontar para uma ficha do próprio utilizador
create policy "Cada utilizador gere os seus treinos"
  on public.treinos for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (ficha_id is null or exists (
      select 1 from public.fichas f
      where f.id = treinos.ficha_id and f.user_id = (select auth.uid())
    ))
  );

-- exercícios de um treino: só se o treino for do utilizador
create policy "Cada utilizador gere os exercícios dos seus treinos"
  on public.treino_exercicios for all to authenticated
  using (exists (
    select 1 from public.treinos t
    where t.id = treino_exercicios.treino_id and t.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.treinos t
    where t.id = treino_exercicios.treino_id and t.user_id = (select auth.uid())
  ));

-- séries: só se o exercício for de um treino do utilizador
create policy "Cada utilizador gere as séries dos seus treinos"
  on public.series for all to authenticated
  using (exists (
    select 1 from public.treino_exercicios e
    join public.treinos t on t.id = e.treino_id
    where e.id = series.treino_exercicio_id and t.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.treino_exercicios e
    join public.treinos t on t.id = e.treino_id
    where e.id = series.treino_exercicio_id and t.user_id = (select auth.uid())
  ));

-- Permissões das tabelas: só quem tem sessão iniciada (papel "authenticated") lhes toca.
-- Os visitantes sem sessão (papel "anon") não têm acesso nenhum.
revoke all on public.fichas, public.ficha_exercicios, public.treinos, public.treino_exercicios, public.series from anon;
grant select, insert, update, delete
  on public.fichas, public.ficha_exercicios, public.treinos, public.treino_exercicios, public.series
  to authenticated;
