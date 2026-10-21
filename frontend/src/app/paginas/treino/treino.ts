import { DatePipe, DecimalPipe, I18nPluralPipe } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CalculadoraDiscos } from '../../componentes/calculadora-discos/calculadora-discos';
import { ExerciciosParecidos } from '../../componentes/exercicios-parecidos/exercicios-parecidos';
import { ListaExercicios } from '../../componentes/lista-exercicios/lista-exercicios';
import { SerieLinha } from '../../componentes/serie-linha/serie-linha';
import { TemporizadorDescanso } from '../../componentes/temporizador-descanso/temporizador-descanso';
import { Painel } from '../../diretivas/painel';
import { Exercicio, NOMES_GRUPOS } from '../../modelos/exercicio';
import { imagemDoExercicio } from '../../modelos/exercisedb';
// "as TreinoDados": a interface chama-se Treino, tal como esta página; o alias evita a confusão
import { Serie, TREINO_LIVRE, Treino as TreinoDados } from '../../modelos/treino';
import { DuracaoPipe } from '../../pipes/duracao-pipe';
import { barraDoExercicio } from '../../utils/discos';
import { NomeExercicioPipe } from '../../pipes/nome-exercicio-pipe';
import { FichaService } from '../../servicos/ficha-service';
import { TreinoService } from '../../servicos/treino-service';

type EstadoPagina = 'a-decorrer' | 'outro-em-curso' | 'ficha-inexistente';
type Confirmacao = 'terminar' | 'cancelar';
// Lista de exercícios aberta: para acrescentar ao treino, ou para substituir o exercício nesta posição
type Seletor = { modo: 'adicionar' } | { modo: 'substituir'; indice: number };
interface NovoRecorde {
  nome: string;
  carga: number;
  anterior: number;
}

@Component({
  imports: [
    RouterLink, DatePipe, DecimalPipe, I18nPluralPipe, DuracaoPipe, NomeExercicioPipe,
    CalculadoraDiscos, ExerciciosParecidos, ListaExercicios, SerieLinha, TemporizadorDescanso, Painel,
  ],
  selector: 'app-treino',
  styleUrl: './treino.css',
  templateUrl: './treino.html',
})
export class Treino implements OnInit, OnDestroy {
  protected readonly nomesGrupos = NOMES_GRUPOS;
  protected readonly imagem = imagemDoExercicio;
  protected readonly treinoLivre = TREINO_LIVRE;
  protected readonly segundosDescanso = 90;
  protected readonly pluralFeitas = { '=1': 'uma série feita', other: '# séries feitas' };
  protected readonly pluralRecordes = { '=1': 'Bateste 1 recorde', other: 'Bateste # recordes' };

  protected readonly estado = signal<EstadoPagina>('a-decorrer');
  protected readonly treino = signal<TreinoDados | null>(null);
  protected readonly agora = signal(Date.now());                 // muda a cada segundo (cronómetro)
  protected readonly descansoInicio = signal<number | null>(null); // null = sem descanso a decorrer
  protected readonly confirmacao = signal<Confirmacao | null>(null);
  protected readonly opcoes = signal<number | null>(null);       // exercício com o painel de opções aberto
  protected readonly seletor = signal<Seletor | null>(null);     // lista de exercícios aberta
  protected readonly novoRecorde = signal<NovoRecorde | null>(null); // aviso que aparece durante 5 s
  protected readonly discos = signal<{ nome: string; carga: number; barra: number } | null>(null); // calculadora aberta
  protected readonly barra = barraDoExercicio;

  // Quando já há outro treino a decorrer (só pode haver um de cada vez)
  protected outroTreino: TreinoDados | null = null;
  // Calculados uma vez ao abrir o treino: o "anterior" e o recorde de cada exercício
  protected anteriores: Record<string, Serie[]> = {};
  protected recordes: Record<string, number> = {};

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

  // O exercício do painel de opções, a posição dele e quantas séries já tem feitas
  protected readonly comOpcoes = computed(() => {
    const indice = this.opcoes();
    const exercicio = indice === null ? undefined : this.treino()?.exercicios[indice];
    if (indice === null || !exercicio) {
      return null;
    }
    return { indice, exercicio, feitas: exercicio.series.filter((s) => s.feita).length };
  });
  // O exercício que se vai substituir (quando a lista está aberta para isso)
  protected readonly aSubstituir = computed(() => {
    const seletor = this.seletor();
    return seletor?.modo === 'substituir' ? (this.treino()?.exercicios[seletor.indice] ?? null) : null;
  });
  // Ids dos exercícios que já estão no treino (aparecem com ✓ na lista)
  protected readonly idsNoTreino = computed(() => this.treino()?.exercicios.map((e) => e.exercicioId) ?? []);
  // Exercícios em que este treino já passou a maior carga de sempre
  protected readonly recordesBatidos = computed(() => {
    const treino = this.treino();
    return treino ? this.treinoService.resumoPorExercicio(treino).filter((r) => r.recorde) : [];
  });

  private fichaId = '';
  private parametros?: Subscription;
  private relogio?: ReturnType<typeof setInterval>;
  private temporizadorRecorde?: ReturnType<typeof setTimeout>;

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

  // OnDestroy: parar o cronómetro e o aviso de recorde, e deixar de ouvir o endereço
  ngOnDestroy(): void {
    clearInterval(this.relogio);
    clearTimeout(this.temporizadorRecorde);
    this.parametros?.unsubscribe();
  }

  private carregar(): void {
    clearInterval(this.relogio);
    this.descansoInicio.set(null);
    this.confirmacao.set(null);
    this.opcoes.set(null);
    this.seletor.set(null);

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
    if (this.fichaId === TREINO_LIVRE) {
      this.abrir(this.treinoService.iniciarVazio()); // "Começar treino vazio"
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
    treino.exercicios.forEach((exercicio) => this.lerHistorico(exercicio.exercicioId));
    this.agora.set(Date.now());
    this.relogio = setInterval(() => this.agora.set(Date.now()), 1000);
  }

  // O "anterior" e o recorde de um exercício (ao abrir o treino e ao acrescentar ou trocar exercícios)
  private lerHistorico(exercicioId: string): void {
    this.anteriores[exercicioId] = this.treinoService.ultimasSeries(exercicioId);
    this.recordes[exercicioId] = this.treinoService.maiorCarga(exercicioId);
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
    if (!serie.feita) {
      this.verificarRecorde(indiceExercicio, indiceSerie);
    }
    this.alterarSerie(indiceExercicio, indiceSerie, { ...serie, feita: !serie.feita });
    this.descansoInicio.set(serie.feita ? null : Date.now());
  }

  // A série acabada de fazer passa a maior carga de sempre (e as já feitas hoje)? Então é recorde.
  // Na primeira vez que se faz um exercício não há aviso: ainda não havia recorde para bater.
  private verificarRecorde(indiceExercicio: number, indiceSerie: number): void {
    const exercicio = this.treino()?.exercicios[indiceExercicio];
    const serie = exercicio?.series[indiceSerie];
    if (!exercicio || !serie) {
      return;
    }
    const anterior = this.recordes[exercicio.exercicioId] ?? 0;
    const melhorHoje = Math.max(0, ...exercicio.series.filter((s, i) => s.feita && i !== indiceSerie).map((s) => s.carga));
    if (anterior > 0 && serie.carga > Math.max(anterior, melhorHoje)) {
      this.novoRecorde.set({ nome: exercicio.nome, carga: serie.carga, anterior: Math.max(anterior, melhorHoje) });
      clearTimeout(this.temporizadorRecorde);
      this.temporizadorRecorde = setTimeout(() => this.novoRecorde.set(null), 5000);
    }
  }

  // A série passou o recorde que havia antes deste treino (mostra um troféu na linha)
  protected eRecorde(exercicioId: string, serie: Serie): boolean {
    const anterior = this.recordes[exercicioId] ?? 0;
    return serie.feita && anterior > 0 && serie.carga > anterior;
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

  // Calculadora de discos com a carga da próxima série por fazer (ou da última, se já fez todas)
  protected abrirDiscos(indiceExercicio: number): void {
    const exercicio = this.treino()?.exercicios[indiceExercicio];
    if (!exercicio) {
      return;
    }
    const serie = exercicio.series.find((s) => !s.feita) ?? exercicio.series.at(-1);
    this.discos.set({ nome: exercicio.nome, carga: serie?.carga ?? 0, barra: barraDoExercicio(exercicio.nome) ?? 20 });
  }

  // ---------- Exercícios: acrescentar, substituir, mudar a ordem, remover ----------
  // As alterações são só neste treino: a ficha fica como estava.

  protected abrirOpcoes(indice: number): void {
    this.opcoes.set(indice);
  }

  protected fecharOpcoes(): void {
    this.opcoes.set(null);
  }

  protected abrirSeletor(seletor: Seletor): void {
    this.opcoes.set(null);
    this.seletor.set(seletor);
  }

  protected fecharSeletor(): void {
    this.seletor.set(null);
  }

  // A ListaExercicios emitiu "escolher"
  protected escolherExercicio(escolhido: Exercicio): void {
    const seletor = this.seletor();
    const treino = this.treino();
    if (!seletor || !treino) {
      return;
    }
    const exercicio = { exercicioId: escolhido.id, nome: escolhido.nome, grupo: escolhido.grupo };
    this.lerHistorico(escolhido.id);

    if (seletor.modo === 'adicionar') {
      // vai para o fim do treino; a lista fica aberta para se acrescentarem mais
      const novo = this.treinoService.criarExercicio(exercicio);
      this.atualizar((t) => ({ ...t, exercicios: [...t.exercicios, novo] }));
      return;
    }

    // Substituir: o novo fica no mesmo lugar, com as mesmas séries e repetições do que sai
    const antigo = treino.exercicios[seletor.indice];
    const plano = { series: antigo.series.length, repeticoes: antigo.series[0]?.repeticoes ?? 10 };
    const novo = this.treinoService.criarExercicio(exercicio, plano);
    this.atualizar((t) => ({
      ...t,
      exercicios: t.exercicios.map((e, i) => (i === seletor.indice ? novo : e)),
    }));
    this.seletor.set(null);
  }

  // Sobe (-1) ou desce (+1) um exercício; o painel de opções acompanha-o
  protected moverExercicio(indice: number, direcao: -1 | 1): void {
    const destino = indice + direcao;
    this.atualizar((treino) => {
      const exercicios = [...treino.exercicios];
      [exercicios[indice], exercicios[destino]] = [exercicios[destino], exercicios[indice]];
      return { ...treino, exercicios };
    });
    this.opcoes.set(destino);
  }

  protected removerExercicio(indice: number): void {
    this.atualizar((treino) => ({ ...treino, exercicios: treino.exercicios.filter((_, i) => i !== indice) }));
    this.opcoes.set(null);
  }

  // ---------- Terminar e cancelar ----------

  protected pedirConfirmacao(tipo: Confirmacao): void {
    this.confirmacao.set(tipo);
  }

  protected fecharConfirmacao(): void {
    this.confirmacao.set(null);
  }

  // Escape fecha o painel que estiver aberto
  @HostListener('document:keydown.escape')
  protected aoCarregarEscape(): void {
    this.discos.set(null);
    this.seletor.set(null);
    this.opcoes.set(null);
    this.confirmacao.set(null);
  }

  protected terminar(): void {
    this.treinoService.terminar();
    this.router.navigate(['/historico']);
  }

  protected cancelar(): void {
    const livre = this.treino()?.fichaId === TREINO_LIVRE;
    this.treinoService.cancelar();
    this.router.navigate([livre ? '/' : '/fichas']);
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
