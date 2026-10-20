import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SerieLinha } from '../../componentes/serie-linha/serie-linha';
import { TemporizadorDescanso } from '../../componentes/temporizador-descanso/temporizador-descanso';
import { NOMES_GRUPOS } from '../../modelos/exercicio';
// "as TreinoDados": a interface chama-se Treino, tal como esta página; o alias evita a confusão
import { Serie, Treino as TreinoDados } from '../../modelos/treino';
import { DuracaoPipe } from '../../pipes/duracao-pipe';
import { FichaService } from '../../servicos/ficha-service';
import { TreinoService } from '../../servicos/treino-service';

type EstadoPagina = 'a-decorrer' | 'outro-em-curso' | 'ficha-inexistente';
type Confirmacao = 'terminar' | 'cancelar';

@Component({
  imports: [RouterLink, DatePipe, DecimalPipe, DuracaoPipe, SerieLinha, TemporizadorDescanso],
  selector: 'app-treino',
  styleUrl: './treino.css',
  templateUrl: './treino.html',
})
export class Treino implements OnInit, OnDestroy {
  protected readonly nomesGrupos = NOMES_GRUPOS;
  protected readonly segundosDescanso = 90;

  protected readonly estado = signal<EstadoPagina>('a-decorrer');
  protected readonly treino = signal<TreinoDados | null>(null);
  protected readonly agora = signal(Date.now());                 // muda a cada segundo (cronómetro)
  protected readonly descansoInicio = signal<number | null>(null); // null = sem descanso a decorrer
  protected readonly confirmacao = signal<Confirmacao | null>(null);

  // Quando já há outro treino a decorrer (só pode haver um de cada vez)
  protected outroTreino: TreinoDados | null = null;
  // Calculados uma vez ao abrir o treino: o "anterior" e o recorde de cada exercício
  protected anteriores: Record<number, Serie[]> = {};
  protected recordes: Record<number, number> = {};

  // ---------- Valores calculados (computed) ----------
  protected readonly segundosDecorridos = computed(() => {
    const treino = this.treino();
    return treino ? Math.max(0, (this.agora() - Date.parse(treino.inicio)) / 1000) : 0;
  });
  protected readonly todasAsSeries = computed(() => this.treino()?.exercicios.flatMap((e) => e.series) ?? []);
  protected readonly seriesFeitas = computed(() => this.todasAsSeries().filter((s) => s.feita).length);
  protected readonly percentagem = computed(() =>
    this.todasAsSeries().length ? (this.seriesFeitas() / this.todasAsSeries().length) * 100 : 0,
  );
  protected readonly volume = computed(() => {
    const treino = this.treino();
    return treino ? this.treinoService.volume(treino) : 0;
  });
  // A próxima série a fazer, como "exercício-série" (ex.: "0-2"), para a destacar
  protected readonly proxima = computed(() => {
    const exercicios = this.treino()?.exercicios ?? [];
    for (let e = 0; e < exercicios.length; e++) {
      const s = exercicios[e].series.findIndex((serie) => !serie.feita);
      if (s !== -1) {
        return `${e}-${s}`;
      }
    }
    return null;
  });

  private fichaId = '';
  private parametros?: Subscription;
  private relogio?: ReturnType<typeof setInterval>;

  constructor(
    private rota: ActivatedRoute,
    private router: Router,
    private fichaService: FichaService,
    private treinoService: TreinoService,
  ) {}

  // OnInit: lê o :fichaId do endereço. É um Observable porque o Angular reaproveita esta
  // página se se passar de /treino/A para /treino/B (e aí o ngOnInit não corre outra vez).
  ngOnInit(): void {
    this.parametros = this.rota.paramMap.subscribe((parametros) => {
      this.fichaId = parametros.get('fichaId') ?? '';
      this.carregar();
    });
  }

  // OnDestroy: parar o cronómetro e deixar de ouvir o endereço
  ngOnDestroy(): void {
    clearInterval(this.relogio);
    this.parametros?.unsubscribe();
  }

  private carregar(): void {
    clearInterval(this.relogio);
    this.descansoInicio.set(null);
    this.confirmacao.set(null);

    const emCurso = this.treinoService.treinoEmCurso();
    if (emCurso && emCurso.fichaId !== this.fichaId) {
      this.outroTreino = emCurso;
      this.estado.set('outro-em-curso');
      return;
    }
    if (emCurso) {
      this.abrir(emCurso); // o treino já estava a decorrer (ex.: a página recarregou)
      return;
    }
    const ficha = this.fichaService.obter(this.fichaId);
    if (!ficha) {
      this.estado.set('ficha-inexistente');
      return;
    }
    this.abrir(this.treinoService.iniciar(ficha));
  }

  private abrir(treino: TreinoDados): void {
    this.treino.set(treino);
    this.estado.set('a-decorrer');
    for (const exercicio of treino.exercicios) {
      this.anteriores[exercicio.exercicioId] = this.treinoService.ultimasSeries(exercicio.exercicioId);
      this.recordes[exercicio.exercicioId] = this.treinoService.maiorCarga(exercicio.exercicioId);
    }
    this.agora.set(Date.now());
    this.relogio = setInterval(() => this.agora.set(Date.now()), 1000);
  }

  // ---------- Outro treino a decorrer ----------

  protected continuarOutro(): void {
    if (this.outroTreino) {
      this.router.navigate(['/treino', this.outroTreino.fichaId]);
    }
  }

  protected descartarOutro(): void {
    this.treinoService.cancelar();
    this.carregar();
  }

  // ---------- Séries ----------

  // Recebe o que o SerieLinha emitiu (alterada) e guarda logo
  protected alterarSerie(indiceExercicio: number, indiceSerie: number, serie: Serie): void {
    this.atualizar((treino) => ({
      ...treino,
      exercicios: treino.exercicios.map((exercicio, e) =>
        e !== indiceExercicio
          ? exercicio
          : { ...exercicio, series: exercicio.series.map((s, i) => (i === indiceSerie ? serie : s)) },
      ),
    }));
  }

  // O SerieLinha emitiu (alternarFeita): marca/desmarca e, se ficou feita, começa o descanso
  protected alternarFeita(indiceExercicio: number, indiceSerie: number): void {
    const serie = this.treino()?.exercicios[indiceExercicio].series[indiceSerie];
    if (!serie) {
      return;
    }
    this.alterarSerie(indiceExercicio, indiceSerie, { ...serie, feita: !serie.feita });
    this.descansoInicio.set(serie.feita ? null : Date.now());
  }

  // Nova série igual à última (carga e repetições)
  protected adicionarSerie(indiceExercicio: number): void {
    this.atualizar((treino) => ({
      ...treino,
      exercicios: treino.exercicios.map((exercicio, e) => {
        if (e !== indiceExercicio) {
          return exercicio;
        }
        const ultima = exercicio.series.at(-1);
        const nova: Serie = {
          numero: exercicio.series.length + 1,
          carga: ultima?.carga ?? 0,
          repeticoes: ultima?.repeticoes ?? 10,
          feita: false,
        };
        return { ...exercicio, series: [...exercicio.series, nova] };
      }),
    }));
  }

  protected removerSerie(indiceExercicio: number): void {
    this.atualizar((treino) => ({
      ...treino,
      exercicios: treino.exercicios.map((exercicio, e) =>
        e === indiceExercicio && exercicio.series.length > 1
          ? { ...exercicio, series: exercicio.series.slice(0, -1) }
          : exercicio,
      ),
    }));
  }

  protected alterarNotas(indiceExercicio: number, evento: Event): void {
    const notas = (evento.target as HTMLInputElement).value.trim();
    this.atualizar((treino) => ({
      ...treino,
      exercicios: treino.exercicios.map((exercicio, e) =>
        e === indiceExercicio ? { ...exercicio, notas: notas || undefined } : exercicio,
      ),
    }));
  }

  protected fimDoDescanso(): void {
    this.descansoInicio.set(null);
  }

  // ---------- Terminar e cancelar ----------

  protected pedirConfirmacao(tipo: Confirmacao): void {
    this.confirmacao.set(tipo);
  }

  @HostListener('document:keydown.escape')
  protected fecharConfirmacao(): void {
    this.confirmacao.set(null);
  }

  protected terminar(): void {
    this.treinoService.terminar();
    this.router.navigate(['/historico']);
  }

  protected cancelar(): void {
    this.treinoService.cancelar();
    this.router.navigate(['/fichas']);
  }

  // Muda o treino sem alterar o original (cria uma cópia) e guarda o progresso no service
  private atualizar(alterar: (treino: TreinoDados) => TreinoDados): void {
    const atual = this.treino();
    if (!atual) {
      return;
    }
    const novo = alterar(atual);
    this.treino.set(novo);
    this.treinoService.atualizarEmCurso(novo);
  }
}
