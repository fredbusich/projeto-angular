import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthError, Session } from '@supabase/supabase-js';
import { Observable, from, map } from 'rxjs';
import { traduzirErroAuth } from '../utils/erros-auth';
import { SupabaseService } from './supabase-service';

// Contas e sessão, com o Supabase Auth: registar, entrar, sair e recuperar a palavra-passe.
// A sessão fica guardada pelo cliente do Supabase e o token renova-se sozinho; aqui fica num
// signal, para o menu, os guards e os outros services reagirem quando se entra ou sai.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessao = signal<Session | null>(null);

  readonly utilizador = computed(() => this.sessao()?.user ?? null);
  readonly autenticado = computed(() => this.sessao() !== null);
  // Só muda quando muda a pessoa (o utilizador acima muda também sempre que o token é renovado).
  // O FichaService e o TreinoService seguem este signal para carregar ou esvaziar os dados.
  readonly idUtilizador = computed(() => this.sessao()?.user.id ?? null);
  // true depois de se abrir o link "mudar a palavra-passe" que vai por email
  readonly emRecuperacao = signal(false);

  constructor(
    private supabase: SupabaseService,
    private router: Router,
  ) {
    // Sempre que a sessão muda (entrar, token renovado, link do email), o signal acompanha
    this.supabase.cliente.auth.onAuthStateChange((evento, sessao) => {
      if (evento === 'PASSWORD_RECOVERY') {
        this.emRecuperacao.set(true);
      }
      if (sessao) {
        this.sessao.set(sessao);
        return;
      }
      // Sem sessão: só conta quando o Supabase a terminou de facto (saiu aqui ou noutro
      // separador, ou o servidor recusou a sessão). Sem rede para renovar o token, chega um
      // INITIAL_SESSION sem sessão, mas a sessão continua guardada no aparelho: fica a mesma.
      if (evento === 'SIGNED_OUT') {
        this.sessao.set(null);
        this.router.navigate(['/entrar']);
      }
    });
  }

  // No arranque da app (provideAppInitializer): a sessão guardada no aparelho, antes de os guards
  // decidirem. Não usa o getSession() porque, sem rede e com o token expirado (a app não foi
  // aberta na última hora), ele tenta renová-lo durante uns 25 segundos e acaba sem sessão: no
  // ginásio, a app ia parar à página de entrar. Assim abre logo; o cliente renova o token quando
  // houver rede (TOKEN_REFRESHED) e, se a sessão já não for válida, termina-a (SIGNED_OUT).
  carregar(): void {
    this.sessao.set(this.supabase.sessaoGuardada());
  }

  // Cria a conta. Devolve se ainda é preciso confirmar o email (com a confirmação ligada, a
  // sessão só começa depois de se abrir o link). Um email que já tem conta não dá erro: o
  // Supabase não diz que emails estão registados, para ninguém os poder descobrir assim.
  registar(email: string, palavraPasse: string): Observable<{ confirmarEmail: boolean }> {
    const pedido = this.supabase.cliente.auth.signUp({
      email,
      password: palavraPasse,
      options: { emailRedirectTo: enderecoDaApp('entrar') },
    });
    return this.resposta(pedido).pipe(
      map((dados) => {
        this.sessao.set(dados.session); // sem confirmação de email, a sessão começa logo
        return { confirmarEmail: dados.session === null };
      }),
    );
  }

  entrar(email: string, palavraPasse: string): Observable<void> {
    const pedido = this.supabase.cliente.auth.signInWithPassword({ email, password: palavraPasse });
    return this.resposta(pedido).pipe(
      map((dados) => {
        // guarda já a sessão, para os guards a verem na navegação que vem a seguir
        this.sessao.set(dados.session);
      }),
    );
  }

  // scope 'local': termina a sessão neste aparelho, mesmo sem rede (no ginásio pode não haver)
  sair(): Observable<void> {
    return from(this.supabase.cliente.auth.signOut({ scope: 'local' })).pipe(
      map(({ error }) => {
        if (error) {
          throw new Error(traduzirErroAuth(error));
        }
      }),
    );
  }

  // Envia o email com o link para escolher uma palavra-passe nova
  pedirRecuperacao(email: string): Observable<void> {
    const pedido = this.supabase.cliente.auth.resetPasswordForEmail(email, {
      redirectTo: enderecoDaApp('nova-palavra-passe'),
    });
    return this.resposta(pedido).pipe(map(() => undefined));
  }

  mudarPalavraPasse(nova: string): Observable<void> {
    const pedido = this.supabase.cliente.auth.updateUser({ password: nova });
    return this.resposta(pedido).pipe(
      map(() => {
        this.emRecuperacao.set(false);
      }),
    );
  }

  // Os métodos do Supabase devolvem uma Promise com { data, error }. Aqui passa a Observable
  // (como o resto da app) e um erro passa a mensagem em português, que chega ao error do subscribe.
  private resposta<R extends { data: unknown; error: AuthError | null }>(pedido: Promise<R>): Observable<R['data']> {
    return from(pedido).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(traduzirErroAuth(error));
        }
        return data;
      }),
    );
  }
}

// Endereço completo de uma página da app, para os links que vão por email.
// Usa o <base href>, por isso serve no computador (localhost:4200/…) e publicado (/projeto-angular/…).
function enderecoDaApp(caminho: string): string {
  return new URL(caminho, document.baseURI).href;
}
