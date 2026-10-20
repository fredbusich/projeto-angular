import { DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Exercicio, GrupoMuscular, NOMES_GRUPOS } from '../../modelos/exercicio';
import { ExercicioService } from '../../servicos/exercicio-service';
import { normalizar } from '../../utils/normalizar';
import { ExercicioCard } from '../exercicio-card/exercicio-card';

type EstadoPedido = 'a-carregar' | 'erro' | 'pronto';

// Lista de exercícios da wger com filtro, pesquisa e "carregar mais".
// Usada na página Exercícios e no formulário da ficha (para escolher exercícios).
@Component({
  imports: [FormsModule, DecimalPipe, ExercicioCard],
  selector: 'app-lista-exercicios',
  styleUrl: './lista-exercicios.css',
  templateUrl: './lista-exercicios.html',
})
export class ListaExercicios implements OnInit, OnDestroy {
  // pai -> filho: ids dos exercícios já escolhidos (aparecem com ✓)
  @Input() escolhidos: number[] = [];

  // filho -> pai: o utilizador escolheu um exercício
  @Output() escolher = new EventEmitter<Exercicio>();

  protected readonly nomesGrupos = NOMES_GRUPOS;
  protected readonly grupos = Object.keys(NOMES_GRUPOS) as GrupoMuscular[];

  // Signals: a app não usa zone.js, por isso os dados que chegam por HTTP
  // vão para signals, e o Angular atualiza o ecrã quando eles mudam
  protected readonly estado = signal<EstadoPedido>('a-carregar');
  protected readonly exercicios = signal<Exercicio[]>([]);
  protected readonly total = signal(0);
  protected readonly grupo = signal<GrupoMuscular | null>(null);   // null = todos
  protected readonly pesquisa = signal('');                         // ligado ao campo com [(ngModel)]
  protected readonly aCarregarMais = signal(false);
  protected readonly erroAoCarregarMais = signal(false);

  // computed: recalcula sozinho quando a pesquisa ou a lista mudam
  protected readonly visiveis = computed(() => {
    const termo = normalizar(this.pesquisa().trim());
    if (!termo) {
      return this.exercicios();
    }
    return this.exercicios().filter((e) =>
      normalizar(e.nome + ' ' + e.equipamento.join(' ')).includes(termo),
    );
  });
  protected readonly haMais = computed(() => this.exercicios().length < this.total());

  private pagina = 0;
  private pedido?: Subscription;

  constructor(private exercicioService: ExercicioService) {}

  // OnInit: corre uma vez, quando o componente é criado
  ngOnInit(): void {
    this.carregar();
  }

  // OnDestroy: corre quando o componente sai do ecrã. Cancela o pedido HTTP que ainda esteja a decorrer.
  ngOnDestroy(): void {
    this.pedido?.unsubscribe();
  }

  protected escolherGrupo(grupo: GrupoMuscular | null): void {
    if (grupo !== this.grupo()) {
      this.grupo.set(grupo);
      this.carregar();
    }
  }

  // Primeira página (ao abrir, ao mudar de grupo ou ao tentar outra vez)
  protected carregar(): void {
    this.pedido?.unsubscribe(); // se ainda havia um pedido antigo, já não interessa
    this.pagina = 0;
    this.estado.set('a-carregar');
    this.erroAoCarregarMais.set(false);
    this.pedido = this.exercicioService.listar(this.grupo() ?? undefined).subscribe({
      next: (resultado) => {
        this.exercicios.set(resultado.exercicios);
        this.total.set(resultado.total);
        this.estado.set('pronto');
      },
      error: () => this.estado.set('erro'),
    });
  }

  protected carregarMais(): void {
    this.pedido?.unsubscribe();
    this.aCarregarMais.set(true);
    this.erroAoCarregarMais.set(false);
    this.pedido = this.exercicioService.listar(this.grupo() ?? undefined, this.pagina + 1).subscribe({
      next: (resultado) => {
        this.pagina++;
        // junta à lista, sem repetir exercícios que já lá estejam
        const ids = new Set(this.exercicios().map((e) => e.id));
        this.exercicios.update((lista) => [...lista, ...resultado.exercicios.filter((e) => !ids.has(e.id))]);
        this.aCarregarMais.set(false);
      },
      error: () => {
        this.aCarregarMais.set(false);
        this.erroAoCarregarMais.set(true);
      },
    });
  }
}
