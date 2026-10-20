import { DatePipe, I18nPluralPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { nomesDosGrupos } from '../../modelos/exercicio';
import { Ficha, NOMES_TIPOS } from '../../modelos/ficha';

// Cartão reutilizável de uma ficha de treino.
@Component({
  imports: [DatePipe, I18nPluralPipe],
  selector: 'app-ficha-card',
  styleUrl: './ficha-card.css',
  templateUrl: './ficha-card.html',
})
export class FichaCard {
  // pai -> filho: a ficha a mostrar (obrigatória)
  @Input({ required: true }) ficha!: Ficha;

  // filho -> pai: o que o utilizador quer fazer com a ficha
  @Output() comecar = new EventEmitter<Ficha>();
  @Output() editar = new EventEmitter<Ficha>();
  @Output() apagar = new EventEmitter<Ficha>();

  protected readonly nomesTipos = NOMES_TIPOS;
  protected readonly plural = { '=1': '# exercício', other: '# exercícios' };

  // "Peito · Ombros · Braços" (cada grupo só uma vez)
  protected get grupos(): string {
    return nomesDosGrupos(this.ficha.exercicios);
  }

  // Os primeiros 4 exercícios e "+2" se houver mais
  // (separados por "·" porque há nomes com vírgulas, como "Shoulder Press, Dumbbells")
  protected get resumo(): string {
    const nomes = this.ficha.exercicios.map((e) => e.nome);
    const extra = nomes.length > 4 ? ` +${nomes.length - 4}` : '';
    return nomes.slice(0, 4).join(' · ') + extra;
  }
}
