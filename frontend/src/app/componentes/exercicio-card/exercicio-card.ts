import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Exercicio, NOMES_GRUPOS } from '../../modelos/exercicio';

// Cartão reutilizável de um exercício: usado na biblioteca e, mais tarde, no formulário da ficha.
@Component({
  imports: [],
  selector: 'app-exercicio-card',
  styleUrl: './exercicio-card.css',
  templateUrl: './exercicio-card.html',
})
export class ExercicioCard {
  // pai -> filho: o exercício a mostrar (obrigatório)
  @Input({ required: true }) exercicio!: Exercicio;

  // filho -> pai: o utilizador quer adicionar este exercício a uma ficha
  @Output() adicionar = new EventEmitter<Exercicio>();

  // "Peito · Barra · Banco"
  protected get detalhe(): string {
    return [NOMES_GRUPOS[this.exercicio.grupo], ...this.exercicio.equipamento].join(' · ');
  }

  // Sem imagem, mostra as duas primeiras letras do grupo ("PE", "CO"…)
  protected get sigla(): string {
    return NOMES_GRUPOS[this.exercicio.grupo].slice(0, 2).toUpperCase();
  }
}
