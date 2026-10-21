import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { Exercicio } from '../../modelos/exercicio';
import { ExercicioService } from '../../servicos/exercicio-service';
import { ExercicioCard } from '../exercicio-card/exercicio-card';

type EstadoPedido = 'a-carregar' | 'erro' | 'pronto';

// Sugestões para substituir um exercício: o mesmo músculo e o mesmo movimento, com outro equipamento.
// Aparece por cima da lista completa quando se carrega em "Substituir" durante o treino.
@Component({
  imports: [ExercicioCard],
  selector: 'app-exercicios-parecidos',
  styleUrl: './exercicios-parecidos.css',
  templateUrl: './exercicios-parecidos.html',
})
export class ExerciciosParecidos implements OnInit, OnDestroy {
  // pai -> filho: o exercício a substituir e os que já estão no treino (aparecem com ✓)
  @Input({ required: true }) exercicioId!: string;
  @Input() escolhidos: string[] = [];

  // filho -> pai: o utilizador escolheu uma das sugestões
  @Output() escolher = new EventEmitter<Exercicio>();

  protected readonly estado = signal<EstadoPedido>('a-carregar');
  protected readonly exercicios = signal<Exercicio[]>([]);

  private pedido?: Subscription;

  constructor(private exercicioService: ExercicioService) {}

  // OnInit: o @Input exercicioId já tem valor; pede as sugestões
  ngOnInit(): void {
    this.pedido = this.exercicioService.parecidos(this.exercicioId).subscribe({
      next: (exercicios) => {
        this.exercicios.set(exercicios);
        this.estado.set('pronto');
      },
      error: () => this.estado.set('erro'),
    });
  }

  // OnDestroy: se o painel fechar antes da resposta, o pedido é cancelado
  ngOnDestroy(): void {
    this.pedido?.unsubscribe();
  }
}
