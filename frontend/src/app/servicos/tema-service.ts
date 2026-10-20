import { Injectable, signal } from '@angular/core';
import { ArmazenamentoService } from './armazenamento-service';

export type Tema = 'escuro' | 'claro';

// Guarda e aplica o tema (escuro ou claro) escolhido pelo utilizador.
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly chave = 'tema';

  // signal: quando muda, o Angular atualiza sozinho tudo o que o lê no HTML
  readonly tema = signal<Tema>('escuro');

  constructor(private armazenamento: ArmazenamentoService) {
    if (this.armazenamento.ler<Tema>(this.chave, 'escuro') === 'claro') {
      this.tema.set('claro');
    }
    this.aplicar(this.tema());
  }

  alternar(): void {
    const novo: Tema = this.tema() === 'escuro' ? 'claro' : 'escuro';
    this.tema.set(novo);
    this.aplicar(novo);
    this.armazenamento.guardar(this.chave, novo);
  }

  // Põe data-tema="..." no <html>; o styles.css troca as cores a partir daí.
  // Também muda a cor da barra do telemóvel (meta theme-color) para acompanhar o fundo.
  private aplicar(tema: Tema): void {
    document.documentElement.dataset['tema'] = tema;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', tema === 'claro' ? '#F2F2EF' : '#0B0B0C');
  }
}
