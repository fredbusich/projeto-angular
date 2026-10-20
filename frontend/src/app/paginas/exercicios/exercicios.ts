import { DecimalPipe, I18nPluralPipe } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, Signal, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ExercicioCard } from '../../componentes/exercicio-card/exercicio-card';
import { Exercicio, GrupoMuscular, NOMES_GRUPOS } from '../../modelos/exercicio';
import { Ficha } from '../../modelos/ficha';
import { ExercicioService } from '../../servicos/exercicio-service';
import { FichaService } from '../../servicos/ficha-service';
import { normalizar } from '../../utils/normalizar';

type EstadoPedido = 'a-carregar' | 'erro' | 'pronto';

@Component({
  imports: [FormsModule, RouterLink, DecimalPipe, I18nPluralPipe, ExercicioCard],
  selector: 'app-exercicios',
  styleUrl: './exercicios.css',
  templateUrl: './exercicios.html',
})
export class Exercicios implements OnInit, OnDestroy {
  protected readonly nomesGrupos = NOMES_GRUPOS;
  protected readonly grupos = Object.keys(NOMES_GRUPOS) as GrupoMuscular[];

  // Para o pipe i18nPlural: "1 exercício", "3 exercícios"
  protected readonly plural = { '=1': '# exercício', other: '# exercícios' };

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

  // Painel "Adicionar à ficha" e aviso de confirmação
  protected readonly escolhido = signal<Exercicio | null>(null);
  protected readonly aviso = signal('');
  protected readonly fichas: Signal<Ficha[]>;

  private pagina = 0;
  private pedido?: Subscription;
  private temporizadorAviso?: ReturnType<typeof setTimeout>;

  constructor(
    private exercicioService: ExercicioService,
    private fichaService: FichaService,
  ) {
    this.fichas = this.fichaService.fichas;
  }

  // OnInit: corre uma vez, quando a página é criada
  ngOnInit(): void {
    this.carregar();
  }

  // OnDestroy: corre quando se sai da página. Cancela o pedido em curso e o temporizador do aviso.
  ngOnDestroy(): void {
    this.pedido?.unsubscribe();
    clearTimeout(this.temporizadorAviso);
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

  // O ExercicioCard emitiu "adicionar": abre o painel para escolher a ficha
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
