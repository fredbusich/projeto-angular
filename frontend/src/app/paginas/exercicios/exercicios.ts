import { Component, OnInit, signal } from '@angular/core';
import { Exercicio, NOMES_GRUPOS } from '../../modelos/exercicio';
import { ExercicioService } from '../../servicos/exercicio-service';

type EstadoPedido = 'a-carregar' | 'erro' | 'pronto';

@Component({
  imports: [],
  selector: 'app-exercicios',
  styleUrl: './exercicios.css',
  templateUrl: './exercicios.html',
})
export class Exercicios implements OnInit {
  // Signals: a app não usa zone.js, por isso os dados que chegam por HTTP
  // vão para signals, e o Angular atualiza o ecrã quando eles mudam
  protected readonly estado = signal<EstadoPedido>('a-carregar');
  protected readonly exercicios = signal<Exercicio[]>([]);
  protected readonly total = signal(0);
  protected readonly nomesGrupos = NOMES_GRUPOS;

  constructor(private exercicioService: ExercicioService) {}

  // OnInit: corre uma vez, quando a página é criada
  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.estado.set('a-carregar');
    this.exercicioService.listar().subscribe({
      next: (pagina) => {
        this.exercicios.set(pagina.exercicios);
        this.total.set(pagina.total);
        this.estado.set('pronto');
      },
      error: () => this.estado.set('erro'),
    });
  }
}
