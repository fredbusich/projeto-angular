import { Component, Signal, computed, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Cabecalho } from './layout/cabecalho/cabecalho';
import { MenuLateral } from './layout/menu-lateral/menu-lateral';
import { AuthService } from './servicos/auth-service';
import { FichaService } from './servicos/ficha-service';
import { TreinoService } from './servicos/treino-service';

@Component({
  imports: [RouterOutlet, Cabecalho, MenuLateral],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  // O App é o pai: guarda se o menu está aberto e passa essa informação aos filhos
  protected readonly menuAberto = signal(false);
  // Com sessão: menu e cabeçalho. Sem sessão: só as páginas de entrar e criar conta.
  protected readonly autenticado: Signal<boolean>;
  // A base de dados não respondeu: as fichas ou o histórico são a cópia guardada no aparelho
  protected readonly semLigacao = computed(() => this.fichaService.semLigacao() || this.treinoService.semLigacao());

  constructor(
    auth: AuthService,
    private fichaService: FichaService,
    private treinoService: TreinoService,
  ) {
    this.autenticado = auth.autenticado;
  }

  protected abrirMenu(): void {
    this.menuAberto.set(true);
  }

  protected fecharMenu(): void {
    this.menuAberto.set(false);
  }
}
