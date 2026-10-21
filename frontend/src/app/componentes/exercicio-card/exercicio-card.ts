import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { Exercicio, NOMES_GRUPOS } from '../../modelos/exercicio';
import { NomeExercicioPipe } from '../../pipes/nome-exercicio-pipe';

// Cartão reutilizável de um exercício: usado na biblioteca e, mais tarde, no formulário da ficha.
@Component({
  imports: [NomeExercicioPipe],
  selector: 'app-exercicio-card',
  styleUrl: './exercicio-card.css',
  templateUrl: './exercicio-card.html',
})
export class ExercicioCard {
  // pai -> filho: o exercício a mostrar (obrigatório)
  @Input({ required: true }) exercicio!: Exercicio;

  // pai -> filho: true quando o exercício já foi escolhido (o botão mostra ✓)
  @Input() adicionado = false;

  // filho -> pai: o utilizador quer adicionar este exercício a uma ficha
  @Output() adicionar = new EventEmitter<Exercicio>();

  // A imagem não carregou (ex.: sem rede e ainda não guardada): mostra a sigla no lugar dela
  protected readonly imagemFalhou = signal(false);

  // "Peito · Barra · Banco"
  protected get detalhe(): string {
    return [NOMES_GRUPOS[this.exercicio.grupo], ...this.exercicio.equipamento].join(' · ');
  }

  // Sem imagem, mostra as duas primeiras letras do grupo ("PE", "CO"…)
  protected get sigla(): string {
    return NOMES_GRUPOS[this.exercicio.grupo].slice(0, 2).toUpperCase();
  }
}
