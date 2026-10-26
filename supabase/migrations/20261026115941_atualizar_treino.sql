-- RepLog — 5: editar um treino terminado
--
-- atualizar_treino recebe o treino inteiro, como o guardar_treino (mesmo JSON, com o "id"), e
-- substitui-o: atualiza a linha de "treinos" e troca os exercícios e as séries pelos novos.
-- Tudo numa só transação: se alguma coisa falhar (ex.: uma carga fora das regras), o treino fica
-- como estava. Com RLS, só encontra o treino se for de quem pede.
--
-- p_treino: {"id": "<uuid>", "nomeFicha": "Push A", "inicio": "…", "fim": "…",
--            "exercicios": [{"exercicioId", "nome", "grupo", "notas",
--                            "series": [{"numero", "carga", "repeticoes", "feita"}, ...]}, ...]}

create or replace function public.atualizar_treino(p_treino jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_treino uuid;
  v_exercicio uuid;
  ex record;
begin
  if jsonb_typeof(p_treino -> 'exercicios') is distinct from 'array'
     or jsonb_array_length(p_treino -> 'exercicios') = 0 then
    raise exception 'O treino precisa de pelo menos um exercício';
  end if;

  if (p_treino ->> 'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Treino não encontrado';
  end if;

  update public.treinos
  set nome_ficha = p_treino ->> 'nomeFicha',
      inicio = (p_treino ->> 'inicio')::timestamptz,
      fim = (p_treino ->> 'fim')::timestamptz
  where id = (p_treino ->> 'id')::uuid
  returning id into v_treino;

  if v_treino is null then
    raise exception 'Treino não encontrado';
  end if;

  -- As séries vão com os exercícios (on delete cascade)
  delete from public.treino_exercicios where treino_id = v_treino;

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

-- Como as outras funções: só quem tem sessão iniciada a pode chamar
revoke execute on function public.atualizar_treino(jsonb) from public, anon;
grant execute on function public.atualizar_treino(jsonb) to authenticated;
