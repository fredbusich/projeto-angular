import { DecimalPipe, I18nPluralPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, computed, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged, map, skip } from 'rxjs';
import { Exercicio, GrupoMuscular, NOMES_GRUPOS } from '../../modelos/exercicio';
import { ExercicioService } from '../../servicos/exercicio-service';
import { normalizar } from '../../utils/normalizar';
import { ExercicioCard } from '../exercicio-card/exercicio-card';

type EstadoPedido = 'a-carregar' | 'erro' | 'pronto';

// Lista de exercícios da ExerciseDB com filtro, pesquisa e "carregar mais".
// Usada na página Exercícios e no formulário da ficha (para escolher exercícios).
@Component({
  imports: [FormsModule, DecimalPipe, I18nPluralPipe, ExercicioCard],
  selector: 'app-lista-exercicios',
  styleUrl: './lista-exercicios.css',
  templateUrl: './lista-exercicios.html',
})
export class ListaExercicios implements OnInit, OnDestroy {
  // pai -> filho: ids dos exercícios já escolhidos (aparecem com ✓)
  @Input() escolhidos: string[] = [];

  // pai -> filho: grupo muscular escolhido ao abrir (ex.: ao substituir um exercício de peito)
  @Input() grupoInicial: GrupoMuscular | null = null;

  // filho -> pai: o utilizador escolheu um exercício
  @Output() escolher = new EventEmitter<Exercicio>();

  protected readonly nomesGrupos = NOMES_GRUPOS;
  protected readonly grupos = Object.keys(NOMES_GRUPOS) as GrupoMuscular[];
  protected readonly pluralResultados = { '=1': '1 resultado', other: '# resultados' };

  // Signals: a app não usa zone.js, por isso os dados que chegam por HTTP
  // vão para signals, e o Angular atualiza o ecrã quando eles mudam
  protected readonly estado = signal<EstadoPedido>('a-carregar');
  protected readonly exercicios = signal<Exercicio[]>([]);
  protected readonly total = signal(0);
  protected readonly grupo = signal<GrupoMuscular | null>(null);   // null = todos
  protected readonly pesquisa = signal('');                         // ligado ao campo com [(ngModel)]
  protected readonly pesquisaFeita = signal('');                    // a pesquisa da lista que está no ecrã
  protected readonly aCarregarMais = signal(false);
  protected readonly erroAoCarregarMais = signal(false);

  private readonly proximo = signal<string | null>(null);           // marcador da página seguinte
  protected readonly haMais = computed(() => this.proximo() !== null);

  // A pesquisa só vai à API 400 ms depois de se parar de escrever
  // (sem isto, "bench press" faria 11 pedidos, um por cada letra)
  private readonly pesquisaComPausa = toObservable(this.pesquisa).pipe(
    skip(1),                       // ignora o valor inicial (a lista já carrega no ngOnInit)
    map((texto) => texto.trim()),
    debounceTime(400),
    distinctUntilChanged(),
  );

  private pedido?: Subscription;
  private subscricaoPesquisa?: Subscription;

  constructor(private exercicioService: ExercicioService) {}

  // OnInit: carrega a primeira página e começa a ouvir a pesquisa
  // (é aqui, e não no construtor, que os @Input já têm o valor que o pai passou)
  ngOnInit(): void {
    this.grupo.set(this.grupoInicial);
    this.carregar();
    this.subscricaoPesquisa = this.pesquisaComPausa.subscribe(() => this.carregar());
  }

  // OnDestroy: cancela o pedido HTTP que ainda esteja a decorrer e deixa de ouvir a pesquisa
  ngOnDestroy(): void {
    this.pedido?.unsubscribe();
    this.subscricaoPesquisa?.unsubscribe();
  }

  protected escolherGrupo(grupo: GrupoMuscular | null): void {
    if (grupo !== this.grupo()) {
      this.grupo.set(grupo);
      this.carregar();
    }
  }

  // Primeira página (ao abrir, ao pesquisar, ao mudar de grupo ou ao tentar outra vez)
  protected carregar(): void {
    this.pedido?.unsubscribe(); // se ainda havia um pedido antigo, já não interessa
    const pesquisa = this.pesquisa().trim();
    this.estado.set('a-carregar');
    this.erroAoCarregarMais.set(false);
    this.pedido = this.exercicioService.listar({ grupo: this.grupo() ?? undefined, pesquisa }).subscribe({
      next: (resultado) => {
        this.exercicios.set(resultado.exercicios);
        this.total.set(resultado.total);
        this.proximo.set(resultado.proximo);
        this.pesquisaFeita.set(pesquisa);
        this.estado.set('pronto');
      },
      error: () => this.estado.set('erro'),
    });
  }

  protected carregarMais(): void {
    const depois = this.proximo();
    if (!depois) {
      return;
    }
    this.pedido?.unsubscribe();
    this.aCarregarMais.set(true);
    this.erroAoCarregarMais.set(false);
    const filtro = { grupo: this.grupo() ?? undefined, pesquisa: this.pesquisaFeita(), depois };
    this.pedido = this.exercicioService.listar(filtro).subscribe({
      next: (resultado) => {
        // junta à lista, sem repetir exercícios (nem nomes) que já lá estejam
        const ids = new Set(this.exercicios().map((e) => e.id));
        const nomes = new Set(this.exercicios().map((e) => normalizar(e.nome)));
        const novos = resultado.exercicios.filter((e) => !ids.has(e.id) && !nomes.has(normalizar(e.nome)));
        this.exercicios.update((lista) => [...lista, ...novos]);
        this.proximo.set(resultado.proximo);
        this.aCarregarMais.set(false);
      },
      error: () => {
        this.aCarregarMais.set(false);
        this.erroAoCarregarMais.set(true);
      },
    });
  }
}
