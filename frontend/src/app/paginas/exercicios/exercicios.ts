import { I18nPluralPipe } from '@angular/common';
import { Component, HostListener, OnDestroy, Signal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ListaExercicios } from '../../componentes/lista-exercicios/lista-exercicios';
import { Exercicio } from '../../modelos/exercicio';
import { Ficha } from '../../modelos/ficha';
import { FichaService } from '../../servicos/ficha-service';

@Component({
  imports: [RouterLink, I18nPluralPipe, ListaExercicios],
  selector: 'app-exercicios',
  styleUrl: './exercicios.css',
  templateUrl: './exercicios.html',
})
export class Exercicios implements OnDestroy {
  // Para o pipe i18nPlural: "1 exercício", "3 exercícios"
  protected readonly plural = { '=1': '# exercício', other: '# exercícios' };

  // Painel "Adicionar à ficha" e aviso de confirmação
  protected readonly escolhido = signal<Exercicio | null>(null);
  protected readonly aviso = signal('');
  protected readonly fichas: Signal<Ficha[]>;

  private temporizadorAviso?: ReturnType<typeof setTimeout>;

  constructor(private fichaService: FichaService) {
    this.fichas = this.fichaService.fichas;
  }

  // OnDestroy: ao sair da página, o temporizador do aviso já não faz falta
  ngOnDestroy(): void {
    clearTimeout(this.temporizadorAviso);
  }

  // A lista emitiu "escolher": abre o painel para escolher a ficha
  protected abrirPainel(exercicio: Exercicio): void {
    this.escolhido.set(exercicio);
  }

  protected fecharPainel(): void {
    this.escolhido.set(null);
  }

  @HostListener('document:keydown.escape')
  protected aoCarregarEscape(): void {
    this.fecharPainel();
  }

  protected adicionarAFicha(ficha: Ficha, exercicio: Exercicio): void {
    if (ficha.exercicios.some((e) => e.exercicioId === exercicio.id)) {
      this.mostrarAviso(`«${exercicio.nome}» já está na ficha ${ficha.nome}.`);
    } else {
      this.fichaService.atualizar(ficha.id, {
        nome: ficha.nome,
        tipo: ficha.tipo,
        exercicios: [
          ...ficha.exercicios,
          { exercicioId: exercicio.id, nome: exercicio.nome, grupo: exercicio.grupo, series: 3, repeticoes: 10 },
        ],
      });
      this.mostrarAviso(`«${exercicio.nome}» adicionado à ficha ${ficha.nome} (3 × 10).`);
    }
    this.fecharPainel();
  }

  private mostrarAviso(texto: string): void {
    this.aviso.set(texto);
    clearTimeout(this.temporizadorAviso);
    this.temporizadorAviso = setTimeout(() => this.aviso.set(''), 4000);
  }
}
