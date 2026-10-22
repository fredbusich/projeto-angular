import { Injectable } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Database } from '../modelos/base-de-dados';

// O cliente do Supabase, criado uma só vez para a app toda (providedIn: 'root').
// Os outros services (AuthService, FichaService, TreinoService) recebem-no por injeção de dependências.
// O cliente guarda a sessão no localStorage e renova o token sozinho.
//
// <Database>: os tipos das tabelas e funções, gerados a partir da base de dados pela Supabase CLI
// (npm run tipos:bd → modelos/base-de-dados.ts). Assim o TypeScript avisa se uma coluna estiver errada.
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly cliente: SupabaseClient<Database> = createClient<Database>(environment.supabaseUrl, environment.supabaseChave, {
    auth: { storageKey: 'replog-sessao' }, // o nome da chave no localStorage, com o prefixo da app
  });
}
