-- RepLog, fase 2 — 3/3: funções para gravar
--
-- Uma ficha são várias linhas (a ficha e os seus exercícios) e um treino ainda mais (exercícios
-- e séries). Cada função grava tudo numa só transação: ou fica tudo gravado, ou nada.
-- A app chama-as com supabase.rpc('guardar_ficha', {...}).
--
-- security invoker: a função corre com as permissões de quem a chama, por isso as regras de RLS
-- também se aplicam lá dentro (ninguém grava fichas em nome de outro utilizador).
-- search_path vazio: todos os nomes vão escritos por inteiro (public.fichas), para a função não
-- poder ser enganada com tabelas de outro esquema com o mesmo nome.

-- Cria (p_id nulo) ou edita uma ficha e substitui a lista de exercícios.
-- p_exercicios: [{"exercicioId": "EIeI8Vf", "nome": "barbell bench press", "grupo": "peito",
--                 "series": 4, "repeticoes": 8}, ...] pela ordem da ficha.
-- Devolve o id da ficha.
create or replace function public.guardar_ficha(
  p_id uuid,
  p_nome text,
  p_tipo text,
  p_exercicios jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if jsonb_typeof(p_exercicios) is distinct from 'array' or jsonb_array_length(p_exercicios) = 0 then
    raise exception 'A ficha precisa de pelo menos um exercício';
  end if;

  if p_id is null then
    insert into public.fichas (nome, tipo)
    values (btrim(p_nome), p_tipo)
    returning id into v_id;
  else
    -- com RLS, só encontra a ficha se for de quem pediu
    update public.fichas
    set nome = btrim(p_nome), tipo = p_tipo
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Ficha não encontrada';
    end if;

    delete from public.ficha_exercicios where ficha_id = v_id;
  end if;

  -- "with ordinality" numera os elementos da lista (1, 2, 3…): é a ordem dos exercícios
  insert into public.ficha_exercicios (ficha_id, ordem, exercicio_id, nome, grupo, series, repeticoes)
  select v_id,
         e.posicao - 1,
         e.valor ->> 'exercicioId',
         e.valor ->> 'nome',
         e.valor ->> 'grupo',
         (e.valor ->> 'series')::smallint,
         (e.valor ->> 'repeticoes')::smallint
  from jsonb_array_elements(p_exercicios) with ordinality as e (valor, posicao);

  return v_id;
end;
$$;

-- Grava um treino terminado, com os exercícios e as séries.
-- p_treino: {"fichaId": "<uuid>" ou null, "nomeFicha": "Push A",
--            "inicio": "2026-10-22T18:40:00Z", "fim": "2026-10-22T19:45:00Z",
--            "exercicios": [{"exercicioId", "nome", "grupo", "notas",
--                            "series": [{"numero", "carga", "repeticoes", "feita"}, ...]}, ...]}
-- Devolve o id do treino.
create or replace function public.guardar_treino(p_treino jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_treino uuid;
  v_ficha uuid;
  v_exercicio uuid;
  ex record;
begin
  -- A ficha pode já não existir (apagada noutro aparelho) ou o treino ser livre: nesse caso fica nula
  if (p_treino ->> 'fichaId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select f.id into v_ficha from public.fichas f where f.id = (p_treino ->> 'fichaId')::uuid;
  end if;

  insert into public.treinos (ficha_id, nome_ficha, inicio, fim)
  values (v_ficha,
          p_treino ->> 'nomeFicha',
          (p_treino ->> 'inicio')::timestamptz,
          (p_treino ->> 'fim')::timestamptz)
  returning id into v_treino;

  for ex in
    select e.valor, e.posicao
    from jsonb_array_elements(p_treino -> 'exercicios') with ordinality as e (valor, posicao)
  loop
    insert into public.treino_exercicios (treino_id, ordem, exercicio_id, nome, grupo, notas)
    values (v_treino,
            ex.posicao - 1,
            ex.valor ->> 'exercicioId',
            ex.valor ->> 'nome',
            ex.valor ->> 'grupo',
            nullif(btrim(ex.valor ->> 'notas'), ''))
    returning id into v_exercicio;

    insert into public.series (treino_exercicio_id, numero, carga, repeticoes, feita)
    select v_exercicio,
           (s.serie ->> 'numero')::smallint,
           (s.serie ->> 'carga')::numeric,
           (s.serie ->> 'repeticoes')::smallint,
           (s.serie ->> 'feita')::boolean
    from jsonb_array_elements(ex.valor -> 'series') as s (serie);
  end loop;

  return v_treino;
end;
$$;

-- Só quem tem sessão iniciada pode chamar as funções (por omissão, qualquer um podia)
revoke execute on function public.guardar_ficha(uuid, text, text, jsonb) from public, anon;
revoke execute on function public.guardar_treino(jsonb) from public, anon;
grant execute on function public.guardar_ficha(uuid, text, text, jsonb) to authenticated;
grant execute on function public.guardar_treino(jsonb) to authenticated;
