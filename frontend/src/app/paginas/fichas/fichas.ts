import { Component, HostListener, Signal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FichaCard } from '../../componentes/ficha-card/ficha-card';
import { Painel } from '../../diretivas/painel';
import { Ficha } from '../../modelos/ficha';
import { FichaService } from '../../servicos/ficha-service';
import { EstadoDados } from '../../servicos/supabase-service';

@Component({
  imports: [RouterLink, FichaCard, Painel],
  selector: 'app-fichas',
  styleUrl: './fichas.css',
  templateUrl: './fichas.html',
})
export class Fichas {
  // A lista e o estado vêm do service (signals): quando mudam, o ecrã atualiza sozinho
  protected readonly fichas: Signal<Ficha[]>;
  protected readonly estado: Signal<EstadoDados>;

  // Ficha à espera de confirmação para ser apagada (null = nenhuma)
  protected readonly paraApagar = signal<Ficha | null>(null);
  protected readonly aApagar = signal(false);
  protected readonly aCriarExemplos = signal(false);
  protected readonly erro = signal('');

  constructor(
    private fichaService: FichaService,
    private router: Router,
  ) {
    this.fichas = this.fichaService.fichas;
    this.estado = this.fichaService.estado;
  }

  protected tentarOutraVez(): void {
    this.fichaService.carregar();
  }

  // Respostas aos eventos (@Output) do FichaCard
  protected comecar(ficha: Ficha): void {
    this.router.navigate(['/treino', ficha.id]);
  }

  protected editar(ficha: Ficha): void {
    this.router.navigate(['/fichas', ficha.id, 'editar']);
  }

  protected pedirParaApagar(ficha: Ficha): void {
    this.erro.set('');
    this.paraApagar.set(ficha);
  }

  // O painel fica aberto até a base de dados responder; se falhar, mostra o erro lá dentro
  protected confirmarApagar(): void {
    const ficha = this.paraApagar();
    if (!ficha) {
      return;
    }
    this.aApagar.set(true);
    this.fichaService.apagar(ficha.id).subscribe({
      next: () => {
        this.aApagar.set(false);
        this.paraApagar.set(null);
      },
      error: (erro: Error) => {
        this.aApagar.set(false);
        this.erro.set(erro.message);
      },
    });
  }

  @HostListener('document:keydown.escape')
  protected cancelarApagar(): void {
    if (!this.aApagar()) {
      this.paraApagar.set(null);
    }
  }

  protected usarExemplos(): void {
    this.erro.set('');
    this.aCriarExemplos.set(true);
    this.fichaService.criarExemplos().subscribe({
      next: () => this.aCriarExemplos.set(false),
      error: (erro: Error) => {
        this.aCriarExemplos.set(false);
        this.erro.set(erro.message);
      },
    });
  }
}
