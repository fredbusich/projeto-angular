import { PostgrestError } from '@supabase/supabase-js';

// Os erros da base de dados (PostgREST e Postgres) vêm em inglês e com um código ("42501"…).
// Aqui passam a frases em português para mostrar nas páginas.
const MENSAGENS: Record<string, string> = {
  PGRST301: 'A sessão terminou. Sai e entra outra vez.',   // token inválido
  PGRST303: 'A sessão terminou. Sai e entra outra vez.',   // token expirado
  '42501': 'Não tens permissão para isto. Sai e entra outra vez.', // bloqueado pelo RLS
  '23514': 'Há dados que não são válidos. Verifica e tenta outra vez.', // falhou um "check" da tabela
};

// status 0: o pedido nem chegou ao Supabase (sem rede, ou servidor em baixo)
export function traduzirErroBd(erro: PostgrestError, status: number): string {
  if (status === 0) {
    return 'Não foi possível ligar ao servidor. Verifica a ligação à internet e tenta outra vez.';
  }
  // P0001: um "raise exception" das nossas funções (guardar_ficha…), que já vem em português
  if (erro.code === 'P0001') {
    return erro.message;
  }
  return MENSAGENS[erro.code] ?? 'Algo correu mal. Tenta outra vez daqui a pouco.';
}
