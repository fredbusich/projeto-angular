import { I18nPluralPipe } from '@angular/common';
import { Component, HostListener, OnDestroy, Signal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ListaExercicios } from '../../componentes/lista-exercicios/lista-exercicios';
import { Painel } from '../../diretivas/painel';
import { NomeExercicioPipe } from '../../pipes/nome-exercicio-pipe';
import { Exercicio } from '../../modelos/exercicio';
import { Ficha } from '../../modelos/ficha';
import { FichaService } from '../../servicos/ficha-service';
import { EstadoDados } from '../../servicos/supabase-service';
import { TraducaoService } from '../../servicos/traducao-service';

@Component({
  imports: [RouterLink, I18nPluralPipe, ListaExercicios, Painel, NomeExercicioPipe],
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
  protected readonly aAdicionar = signal(false);
  protected readonly fichas: Signal<Ficha[]>;
  protected readonly estadoFichas: Signal<EstadoDados>;

  private temporizadorAviso?: ReturnType<typeof setTimeout>;

  constructor(
    private fichaService: FichaService,
    private traducao: TraducaoService,
  ) {
    this.fichas = this.fichaService.fichas;
    this.estadoFichas = this.fichaService.estado;
  }

  protected carregarFichas(): void {
    this.fichaService.carregar();
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
    if (!this.aAdicionar()) {
      this.escolhido.set(null);
    }
  }

  @HostListener('document:keydown.escape')
  protected aoCarregarEscape(): void {
    this.fecharPainel();
  }

  protected adicionarAFicha(ficha: Ficha, exercicio: Exercicio): void {
    const nome = this.traducao.nome(exercicio.nome); // o nome guarda-se em inglês; o aviso mostra-o na língua escolhida
    if (ficha.exercicios.some((e) => e.exercicioId === exercicio.id)) {
      this.mostrarAviso(`«${nome}» já está na ficha ${ficha.nome}.`);
      this.fecharPainel();
      return;
    }
    // O painel fica aberto (com os botões desativados) até a base de dados responder
    this.aAdicionar.set(true);
    this.fichaService
      .atualizar(ficha.id, {
        nome: ficha.nome,
        tipo: ficha.tipo,
        exercicios: [
          ...ficha.exercicios,
          { exercicioId: exercicio.id, nome: exercicio.nome, grupo: exercicio.grupo, series: 3, repeticoes: 10 },
        ],
      })
      .pipe(
        // finalize: corre no fim, tanto se correu bem como se falhou
        finalize(() => {
          this.aAdicionar.set(false);
          this.fecharPainel();
        }),
      )
      .subscribe({
        next: () => this.mostrarAviso(`«${nome}» adicionado à ficha ${ficha.nome} (3 × 10).`),
        error: (erro: Error) => this.mostrarAviso(`«${nome}» não foi adicionado. ${erro.message}`),
      });
  }

  private mostrarAviso(texto: string): void {
    this.aviso.set(texto);
    clearTimeout(this.temporizadorAviso);
    this.temporizadorAviso = setTimeout(() => this.aviso.set(''), 4000);
  }
}
