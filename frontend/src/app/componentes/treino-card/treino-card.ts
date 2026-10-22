import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ResumoExercicio, Treino } from '../../modelos/treino';
import { DuracaoPipe } from '../../pipes/duracao-pipe';
import { NomeExercicioPipe } from '../../pipes/nome-exercicio-pipe';
import { TreinoService } from '../../servicos/treino-service';

// Cartão de um treino terminado: curto no Início, detalhado no Histórico.
@Component({
  imports: [DatePipe, DecimalPipe, DuracaoPipe, NomeExercicioPipe],
  selector: 'app-treino-card',
  styleUrl: './treino-card.css',
  templateUrl: './treino-card.html',
})
export class TreinoCard {
  // pai -> filho
  @Input({ required: true }) treino!: Treino;
  @Input() detalhado = false;   // true no Histórico: mostra os exercícios e o botão de apagar

  // filho -> pai: pedir para apagar ou partilhar este treino
  @Output() apagar = new EventEmitter<Treino>();
  @Output() partilhar = new EventEmitter<Treino>();

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

  // Terminado sem rede: ainda só está neste aparelho
  protected get porEnviar(): boolean {
    return this.treinoService.estaPorEnviar(this.treino.id);
  }

  // Só os exercícios com pelo menos uma série feita, cada um com a sua melhor série e se foi recorde
  protected get exercicios(): ResumoExercicio[] {
    return this.treinoService.resumoPorExercicio(this.treino);
  }
}
