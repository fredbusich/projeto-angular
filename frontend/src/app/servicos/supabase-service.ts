import { Injectable } from '@angular/core';
import { PostgrestSingleResponse, Session, SupabaseClient, createClient } from '@supabase/supabase-js';
import { Observable, from, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Database } from '../modelos/base-de-dados';
import { traduzirErroBd } from '../utils/erros-bd';

// O estado dos dados que vêm da rede, para as páginas mostrarem "a carregar" ou o erro
export type EstadoDados = 'a-carregar' | 'erro' | 'pronto';

// O nome da chave onde o cliente guarda a sessão no localStorage (com o prefixo da app)
const CHAVE_SESSAO = 'replog-sessao';

// O cliente do Supabase, criado uma só vez para a app toda (providedIn: 'root').
// Os outros services (AuthService, FichaService, TreinoService) recebem-no por injeção de dependências.
// O cliente guarda a sessão no localStorage e renova o token sozinho.
//
// <Database>: os tipos das tabelas e funções, gerados a partir da base de dados pela Supabase CLI
// (npm run tipos:bd → modelos/base-de-dados.ts). Assim o TypeScript avisa se uma coluna estiver errada.
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly cliente: SupabaseClient<Database> = createClient<Database>(environment.supabaseUrl, environment.supabaseChave, {
    auth: { storageKey: CHAVE_SESSAO },
  });

  // A sessão que o cliente guardou no aparelho, lida diretamente do localStorage: não espera
  // pela rede, mesmo que o token já tenha expirado (ver o AuthService.carregar)
  sessaoGuardada(): Session | null {
    try {
      const sessao = JSON.parse(localStorage.getItem(CHAVE_SESSAO) ?? 'null') as Session | null;
      return sessao?.access_token && sessao.refresh_token && sessao.user?.id ? sessao : null;
    } catch {
      return null;
    }
  }

  // As consultas do Supabase respondem com { data, error }. Aqui passam a Observable (como o resto
  // da app): os dados seguem para o next e um erro chega ao error do subscribe, já em português.
  // Uma consulta só vai para a rede quando se chama o .then() dela, e o from() só o chama no
  // subscribe: sem subscribe, não há pedido.
  pedido<R extends PostgrestSingleResponse<unknown>>(consulta: PromiseLike<R>): Observable<Extract<R, { error: null }>['data']> {
    return from(consulta).pipe(
      map((resposta) => {
        if (resposta.error) {
          throw new Error(traduzirErroBd(resposta.error, resposta.status));
        }
        return resposta.data as Extract<R, { error: null }>['data'];
      }),
    );
  }
}
