-- RepLog, fase 2 — 4: guardar_treino aceita o id do treino, criado na app
--
-- O treino tem id desde que começa (crypto.randomUUID() na app). Se terminar sem rede, fica na
-- lista "por enviar" do aparelho já com o id definitivo, e é enviado quando a rede voltar.
-- Se um envio for repetido (o treino ficou gravado mas a resposta perdeu-se pelo caminho), o
-- "on conflict do nothing" não grava outra vez: o treino não aparece duplicado no histórico.
--
-- p_treino ganha o campo "id" (opcional: sem ele, ou se não for um uuid, a base de dados cria um).
-- O resto fica igual à versão da migração 3. "create or replace" mantém as permissões (grant).

create or replace function public.guardar_treino(p_treino jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_pedido uuid;
  v_treino uuid;
  v_ficha uuid;
  v_exercicio uuid;
  ex record;
begin
  if (p_treino ->> 'id') ~* v_uuid then
    v_pedido := (p_treino ->> 'id')::uuid;
  else
    v_pedido := gen_random_uuid();
  end if;

  -- A ficha pode já não existir (apagada noutro aparelho) ou o treino ser livre: nesse caso fica nula
  if (p_treino ->> 'fichaId') ~* v_uuid then
    select f.id into v_ficha from public.fichas f where f.id = (p_treino ->> 'fichaId')::uuid;
  end if;

  insert into public.treinos (id, ficha_id, nome_ficha, inicio, fim)
  values (v_pedido,
          v_ficha,
          p_treino ->> 'nomeFicha',
          (p_treino ->> 'inicio')::timestamptz,
          (p_treino ->> 'fim')::timestamptz)
  on conflict (id) do nothing
  returning id into v_treino;

  -- Já estava gravado (envio repetido): os exercícios e as séries também já lá estão
  if v_treino is null then
    return v_pedido;
  end if;

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
