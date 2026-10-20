import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Serie, Treino } from '../../modelos/treino';
import { DuracaoPipe } from '../../pipes/duracao-pipe';
import { TreinoService } from '../../servicos/treino-service';

interface ResumoExercicio {
  nome: string;
  feitas: number;
  melhor: Serie;     // a série com mais carga (e, em empate, mais repetições)
}

// Cartão de um treino terminado: curto no Início, detalhado no Histórico.
@Component({
  imports: [DatePipe, DecimalPipe, DuracaoPipe],
  selector: 'app-treino-card',
  styleUrl: './treino-card.css',
  templateUrl: './treino-card.html',
})
export class TreinoCard {
  // pai -> filho
  @Input({ required: true }) treino!: Treino;
  @Input() detalhado = false;   // true no Histórico: mostra os exercícios e o botão de apagar

  // filho -> pai: pedir para apagar este treino
  @Output() apagar = new EventEmitter<Treino>();

  constructor(private treinoService: TreinoService) {}

  protected get volume(): number {
    return this.treinoService.volume(this.treino);
  }

  protected get segundos(): number {
    return this.treinoService.duracao(this.treino);
  }

  protected get seriesFeitas(): number {
    return this.treinoService.seriesFeitas(this.treino);
  }

  // Só os exercícios com pelo menos uma série feita, cada um com a sua melhor série
  protected get exercicios(): ResumoExercicio[] {
    const resumo: ResumoExercicio[] = [];
    for (const exercicio of this.treino.exercicios) {
      const feitas = exercicio.series.filter((serie) => serie.feita);
      if (feitas.length > 0) {
        const melhor = feitas.reduce((a, b) =>
          b.carga > a.carga || (b.carga === a.carga && b.repeticoes > a.repeticoes) ? b : a,
        );
        resumo.push({ nome: exercicio.nome, feitas: feitas.length, melhor });
      }
    }
    return resumo;
  }
}
