import { Injectable, signal } from '@angular/core';

export type Tema = 'escuro' | 'claro';

// Guarda e aplica o tema (escuro ou claro) escolhido pelo utilizador.
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly chave = 'replog-tema';

  // signal: quando muda, o Angular atualiza sozinho tudo o que o lê no HTML
  readonly tema = signal<Tema>(this.lerTemaGuardado());

  constructor() {
    this.aplicar(this.tema());
  }

  alternar(): void {
    const novo: Tema = this.tema() === 'escuro' ? 'claro' : 'escuro';
    this.tema.set(novo);
    this.aplicar(novo);
    try {
      localStorage.setItem(this.chave, novo);
    } catch {
      // sem localStorage (ex.: navegação privada): o tema só não fica guardado
    }
  }

  private lerTemaGuardado(): Tema {
    try {
      return localStorage.getItem(this.chave) === 'claro' ? 'claro' : 'escuro';
    } catch {
      return 'escuro';
    }
  }

  // Põe data-tema="..." no <html>; o styles.css troca as cores a partir daí
  private aplicar(tema: Tema): void {
    document.documentElement.dataset['tema'] = tema;
  }
}
