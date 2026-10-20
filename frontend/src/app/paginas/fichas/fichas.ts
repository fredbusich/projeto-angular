import { Component, HostListener, Signal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FichaCard } from '../../componentes/ficha-card/ficha-card';
import { Ficha } from '../../modelos/ficha';
import { FichaService } from '../../servicos/ficha-service';

@Component({
  imports: [RouterLink, FichaCard],
  selector: 'app-fichas',
  styleUrl: './fichas.css',
  templateUrl: './fichas.html',
})
export class Fichas {
  // A lista vem do service (signal): quando muda, o ecrã atualiza sozinho
  protected readonly fichas: Signal<Ficha[]>;

  // Ficha à espera de confirmação para ser apagada (null = nenhuma)
  protected readonly paraApagar = signal<Ficha | null>(null);

  constructor(
    private fichaService: FichaService,
    private router: Router,
  ) {
    this.fichas = this.fichaService.fichas;
  }

  // Respostas aos eventos (@Output) do FichaCard
  protected comecar(ficha: Ficha): void {
    this.router.navigate(['/treino', ficha.id]);
  }

  protected editar(ficha: Ficha): void {
    this.router.navigate(['/fichas', ficha.id, 'editar']);
  }

  protected pedirParaApagar(ficha: Ficha): void {
    this.paraApagar.set(ficha);
  }

  protected confirmarApagar(): void {
    const ficha = this.paraApagar();
    if (ficha) {
      this.fichaService.apagar(ficha.id);
    }
    this.paraApagar.set(null);
  }

  @HostListener('document:keydown.escape')
  protected cancelarApagar(): void {
    this.paraApagar.set(null);
  }

  protected usarExemplos(): void {
    this.fichaService.criarExemplos();
  }
}
