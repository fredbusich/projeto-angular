import { Injectable, computed, effect, signal, untracked } from '@angular/core';
import { EMPTY, Observable, catchError, concatMap, from, map, of } from 'rxjs';
import { Tables } from '../modelos/base-de-dados';
import { GrupoMuscular } from '../modelos/exercicio';
import { Ficha } from '../modelos/ficha';
import { ExercicioNoTreino, ResumoExercicio, ResumoSemana, Serie, TREINO_LIVRE, Treino } from '../modelos/treino';
import { inicioDaSemana } from '../utils/datas';
import { ArmazenamentoService } from './armazenamento-service';
import { AuthService } from './auth-service';
import { EstadoDados, SupabaseService } from './supabase-service';

// Uma linha de "treinos" com os exercícios e as séries, como vem do select('*, treino_exercicios(*, series(*))')
type LinhaTreino = Tables<'treinos'> & {
  treino_exercicios: (Tables<'treino_exercicios'> & { series: Tables<'series'>[] })[];
};

// Treinos: o que está a decorrer agora e o histórico dos que já terminaram.
//
// - O histórico está na base de dados (tabelas treinos, treino_exercicios e series).
// - O treino em curso fica só no aparelho (localStorage), para se poder treinar sem rede.
// - Um treino terminado vai primeiro para a lista "por enviar" do aparelho e é enviado logo a
//   seguir. Sem rede, fica lá e é enviado quando ela voltar. Como o id é criado na app, um envio
//   repetido não duplica o treino (a função guardar_treino ignora um id que já existe).
@Injectable({ providedIn: 'root' })
export class TreinoService {
  // Treinos que já estão na base de dados
  private readonly guardados = signal<Treino[]>([]);
  // Treinos terminados que ainda não chegaram à base de dados
  private readonly porEnviar = signal<Treino[]>([]);
  private readonly estadoCarga = signal<EstadoDados>('a-carregar');
  private readonly aEnviar = signal(false);
  private readonly erroAoEnviar = signal('');

  readonly estado = this.estadoCarga.asReadonly();
  readonly enviando = this.aEnviar.asReadonly();
  readonly erroEnvio = this.erroAoEnviar.asReadonly();
  readonly quantosPorEnviar = computed(() => this.porEnviar().length);

  // O histórico todo, do mais recente para o mais antigo (os por enviar também contam).
  // Um treino pode estar nas duas listas se a resposta do envio se perdeu: aí conta uma vez só.
  readonly treinos = computed(() => {
    const guardados = this.guardados();
    const ids = new Set(guardados.map((treino) => treino.id));
    return [...this.porEnviar().filter((treino) => !ids.has(treino.id)), ...guardados].sort(
      (a, b) => Date.parse(b.inicio) - Date.parse(a.inicio),
    );
  });

  // Treino a decorrer (ou null). Fica guardado no aparelho para não se perder se a página recarregar.
  private readonly emCurso = signal<Treino | null>(null);
  readonly treinoEmCurso = this.emCurso.asReadonly();

  private idUtilizador: string | null = null;

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService,
    private armazenamento: ArmazenamentoService,
  ) {
    // effect: corre agora e sempre que muda quem tem a sessão (entrar, sair, outra conta)
    effect(() => {
      const id = this.auth.idUtilizador();
      untracked(() => this.mudarDeUtilizador(id));
    });
    // Quando a rede volta, envia o que ficou por enviar
    window.addEventListener('online', () => this.enviarPendentes());
  }

  // Também é chamado pelo botão "Tentar outra vez" das páginas
  carregar(): void {
    const id = this.idUtilizador;
    if (!id) {
      return;
    }
    this.estadoCarga.set('a-carregar');
    // Um só pedido traz os treinos, os exercícios de cada treino e as séries de cada exercício
    const consulta = this.supabase.cliente
      .from('treinos')
      .select('*, treino_exercicios(*, series(*))')
      .eq('user_id', id)
      .order('inicio', { ascending: false })
      .order('ordem', { referencedTable: 'treino_exercicios' })
      .order('numero', { referencedTable: 'treino_exercicios.series' });

    this.supabase.pedido(consulta).subscribe({
      next: (linhas) => {
        if (id === this.idUtilizador) { // entretanto pode ter entrado outra conta
          this.guardados.set(linhas.map(treinoDaBaseDeDados));
          this.estadoCarga.set('pronto');
          this.enviarPendentes();
        }
      },
      error: () => {
        if (id === this.idUtilizador) {
          this.estadoCarga.set('erro');
        }
      },
    });
  }

  obter(id: string): Treino | undefined {
    return this.treinos().find((treino) => treino.id === id);
  }

  estaPorEnviar(id: string): boolean {
    return this.porEnviar().some((treino) => treino.id === id);
  }

  // Cria um treino a partir de uma ficha, já com as cargas da última vez
  iniciar(ficha: Ficha): Treino {
    const treino: Treino = {
      id: crypto.randomUUID(), // o id definitivo: é com ele que o treino vai para a base de dados
      fichaId: ficha.id,
      nomeFicha: ficha.nome,
      inicio: new Date().toISOString(),
      exercicios: ficha.exercicios.map((exercicio) =>
        this.criarExercicio(exercicio, { series: exercicio.series, repeticoes: exercicio.repeticoes }),
      ),
    };
    this.definirEmCurso(treino);
    return treino;
  }

  // Treino sem ficha: começa sem exercícios e vão-se acrescentando durante o treino
  iniciarVazio(): Treino {
    const treino: Treino = {
      id: crypto.randomUUID(),
      fichaId: TREINO_LIVRE,
      nomeFicha: 'Treino livre',
      inicio: new Date().toISOString(),
      exercicios: [],
    };
    this.definirEmCurso(treino);
    return treino;
  }

  // Um exercício pronto a treinar, com as cargas da última vez.
  // Com plano (a ficha, ou o exercício que se substituiu), fica com essas séries e repetições;
  // sem plano (exercício acrescentado), repete as séries da última vez, ou uma só se for a primeira vez.
  criarExercicio(
    exercicio: Pick<ExercicioNoTreino, 'exercicioId' | 'nome' | 'grupo'>,
    plano?: { series: number; repeticoes: number },
  ): ExercicioNoTreino {
    const anteriores = this.ultimasSeries(exercicio.exercicioId);
    const quantas = plano?.series ?? Math.max(anteriores.length, 1);
    return {
      exercicioId: exercicio.exercicioId,
      nome: exercicio.nome,
      grupo: exercicio.grupo,
      series: Array.from({ length: quantas }, (_, i) => {
        // a mesma série da última vez (ou a última série, se agora houver mais)
        const anterior = anteriores[i] ?? anteriores.at(-1);
        return {
          numero: i + 1,
          carga: anterior?.carga ?? 0,
          repeticoes: plano?.repeticoes ?? anterior?.repeticoes ?? 10,
          feita: false,
        };
      }),
    };
  }

  // Chamado sempre que uma série muda, para o progresso ficar guardado
  atualizarEmCurso(treino: Treino): void {
    this.definirEmCurso(treino);
  }

  // Passa o treino em curso para o histórico: primeiro para a lista "por enviar" (assim não se
  // perde, mesmo sem rede) e logo a seguir para a base de dados
  terminar(): Treino | null {
    const treino = this.emCurso();
    if (!treino) {
      return null;
    }
    const terminado: Treino = { ...treino, fim: new Date().toISOString() };
    this.gravarPorEnviar([...this.porEnviar(), terminado]);
    this.definirEmCurso(null);
    this.enviarPendentes();
    return terminado;
  }

  // Treinos da fase 1 (que estavam só no aparelho) a importar para a conta: seguem o mesmo
  // caminho de um treino terminado sem rede
  adicionarPorEnviar(treinos: Treino[]): void {
    this.gravarPorEnviar([...this.porEnviar(), ...treinos]);
    this.enviarPendentes();
  }

  cancelar(): void {
    this.definirEmCurso(null);
  }

  apagar(id: string): Observable<void> {
    // Ainda não foi enviado: basta tirá-lo do aparelho
    if (this.estaPorEnviar(id)) {
      this.gravarPorEnviar(this.porEnviar().filter((treino) => treino.id !== id));
      return of(undefined);
    }
    // Os exercícios e as séries vão com ele (on delete cascade)
    const consulta = this.supabase.cliente.from('treinos').delete().eq('id', id);
    return this.supabase.pedido(consulta).pipe(
      map(() => {
        this.guardados.update((treinos) => treinos.filter((treino) => treino.id !== id));
      }),
    );
  }

  // Envia os treinos por enviar, um de cada vez (concatMap). Cada um que chega à base de dados
  // passa para os guardados. Se um falhar, os outros continuam; os que falharam ficam para a próxima.
  enviarPendentes(): void {
    const id = this.idUtilizador;
    if (!id || this.aEnviar() || this.porEnviar().length === 0) {
      return;
    }
    this.aEnviar.set(true);
    let erro = '';
    const lote = this.porEnviar();
    from(lote)
      .pipe(
        concatMap((treino) =>
          this.enviar(treino).pipe(
            map(() => treino),
            catchError((falha: Error) => {
              erro = falha.message;
              return EMPTY; // este fica por enviar; passa ao seguinte
            }),
          ),
        ),
      )
      .subscribe({
        next: (treino) => {
          if (id !== this.idUtilizador) { // saiu entretanto: na próxima vez é reenviado sem duplicar
            return;
          }
          this.gravarPorEnviar(this.porEnviar().filter((t) => t.id !== treino.id));
          this.guardados.update((guardados) => (guardados.some((t) => t.id === treino.id) ? guardados : [treino, ...guardados]));
        },
        complete: () => {
          this.aEnviar.set(false);
          this.erroAoEnviar.set(erro);
          // Chegaram treinos novos enquanto se enviava (terminou outro, ou importou)? Seguem já.
          // Os que falharam agora não contam, para não ficar a tentar sem parar.
          if (id === this.idUtilizador && this.porEnviar().some((treino) => !lote.includes(treino))) {
            this.enviarPendentes();
          }
        },
      });
  }

  // Séries feitas da última vez que se treinou este exercício (a coluna "anterior").
  // Os treinos em que o exercício ficou sem séries feitas não contam.
  ultimasSeries(exercicioId: string): Serie[] {
    for (const treino of this.treinos()) {
      const exercicio = treino.exercicios.find((e) => e.exercicioId === exercicioId && e.series.some((s) => s.feita));
      if (exercicio) {
        return exercicio.series.filter((serie) => serie.feita);
      }
    }
    return [];
  }

  // Maior carga já feita neste exercício (o recorde simples da fase 1).
  // Com "antesDe" (data ISO), só contam os treinos começados antes dessa data.
  maiorCarga(exercicioId: string, antesDe?: string): number {
    const cargas = this.treinos()
      .filter((treino) => !antesDe || treino.inicio < antesDe)
      .flatMap((treino) => treino.exercicios)
      .filter((exercicio) => exercicio.exercicioId === exercicioId)
      .flatMap((exercicio) => exercicio.series)
      .filter((serie) => serie.feita)
      .map((serie) => serie.carga);
    return cargas.length > 0 ? Math.max(...cargas) : 0;
  }

  // Os exercícios com séries feitas, cada um com a melhor série e se bateu o recorde.
  // A primeira vez que se faz um exercício não conta como recorde (ainda não havia nada para bater).
  resumoPorExercicio(treino: Treino): ResumoExercicio[] {
    const resumo: ResumoExercicio[] = [];
    for (const exercicio of treino.exercicios) {
      const feitas = exercicio.series.filter((serie) => serie.feita);
      if (feitas.length === 0) {
        continue;
      }
      const melhor = feitas.reduce((a, b) =>
        b.carga > a.carga || (b.carga === a.carga && b.repeticoes > a.repeticoes) ? b : a,
      );
      const anterior = this.maiorCarga(exercicio.exercicioId, treino.inicio);
      resumo.push({
        exercicioId: exercicio.exercicioId,
        nome: exercicio.nome,
        feitas: feitas.length,
        melhor,
        anterior,
        recorde: anterior > 0 && melhor.carga > anterior,
      });
    }
    return resumo;
  }

  // Volume = soma de carga × repetições de todas as séries feitas
  volume(treino: Treino): number {
    return treino.exercicios
      .flatMap((exercicio) => exercicio.series)
      .filter((serie) => serie.feita)
      .reduce((total, serie) => total + serie.carga * serie.repeticoes, 0);
  }

  seriesFeitas(treino: Treino): number {
    return treino.exercicios.flatMap((exercicio) => exercicio.series).filter((serie) => serie.feita).length;
  }

  // Duração em segundos (se ainda não terminou, conta até agora)
  duracao(treino: Treino): number {
    const fim = treino.fim ? Date.parse(treino.fim) : Date.now();
    return Math.max(0, (fim - Date.parse(treino.inicio)) / 1000);
  }

  // O treino mais recente feito com esta ficha (o histórico está do mais recente para o mais antigo)
  ultimoTreinoDaFicha(fichaId: string): Treino | undefined {
    return this.treinos().find((treino) => treino.fichaId === fichaId);
  }

  // Sugere a ficha a fazer a seguir: uma que nunca foi feita ou, se não houver,
  // a que foi feita há mais tempo. Numa rotação Push · Pull · Legs dá a ordem certa.
  sugerirProxima(fichas: Ficha[]): Ficha | undefined {
    let sugestao: Ficha | undefined;
    let maisAntiga = Infinity;
    for (const ficha of fichas) {
      const ultimo = this.ultimoTreinoDaFicha(ficha.id);
      const quando = ultimo ? Date.parse(ultimo.inicio) : -Infinity; // nunca feita: vem primeiro
      if (quando < maisAntiga) {
        maisAntiga = quando;
        sugestao = ficha;
      }
    }
    return sugestao;
  }

  // computed: os números da semana recalculam-se sozinhos quando o histórico muda
  readonly resumoDaSemana = computed<ResumoSemana>(() => {
    const segunda = inicioDaSemana();
    const daSemana = this.treinos().filter((treino) => new Date(treino.inicio) >= segunda);
    return {
      treinos: daSemana.length,
      volume: daSemana.reduce((total, treino) => total + this.volume(treino), 0),
      segundos: daSemana.reduce((total, treino) => total + this.duracao(treino), 0),
      dias: [...new Set(daSemana.map((treino) => (new Date(treino.inicio).getDay() + 6) % 7))],
    };
  });

  // Entrou outra pessoa (ou saiu): o treino em curso e os por enviar são os dela, guardados no
  // aparelho numa chave por utilizador; o histórico vem da base de dados
  private mudarDeUtilizador(id: string | null): void {
    this.idUtilizador = id;
    this.guardados.set([]);
    this.erroAoEnviar.set('');
    this.estadoCarga.set('a-carregar');
    this.emCurso.set(id ? this.armazenamento.ler<Treino | null>(this.chave('treino-em-curso'), null) : null);
    this.porEnviar.set(id ? this.armazenamento.ler<Treino[]>(this.chave('treinos-por-enviar'), []) : []);
    this.carregar();
  }

  // "treino-em-curso" → "treino-em-curso-<id do utilizador>"
  private chave(nome: string): string {
    return `${nome}-${this.idUtilizador}`;
  }

  // A função guardar_treino recebe o treino em JSON, com os nomes da app (ver a migração 4)
  private enviar(treino: Treino): Observable<string> {
    const consulta = this.supabase.cliente.rpc('guardar_treino', {
      p_treino: {
        id: treino.id,
        fichaId: treino.fichaId,
        nomeFicha: treino.nomeFicha,
        inicio: treino.inicio,
        fim: treino.fim,
        exercicios: treino.exercicios.map((exercicio) => ({
          exercicioId: exercicio.exercicioId,
          nome: exercicio.nome,
          grupo: exercicio.grupo,
          notas: exercicio.notas ?? null,
          series: exercicio.series.map((serie) => ({ ...serie })),
        })),
      },
    });
    return this.supabase.pedido(consulta);
  }

  private definirEmCurso(treino: Treino | null): void {
    this.emCurso.set(treino);
    if (treino) {
      this.armazenamento.guardar(this.chave('treino-em-curso'), treino);
    } else {
      this.armazenamento.apagar(this.chave('treino-em-curso'));
    }
  }

  private gravarPorEnviar(treinos: Treino[]): void {
    this.porEnviar.set(treinos);
    this.armazenamento.guardar(this.chave('treinos-por-enviar'), treinos);
  }
}

// Da base de dados (snake_case, três tabelas) para o modelo da app (camelCase, tudo junto).
// As datas passam pelo toISOString() para ficarem no mesmo formato das criadas na app
// (a base de dados escreve "+00:00" em vez de "Z"), porque há comparações entre elas.
function treinoDaBaseDeDados(linha: LinhaTreino): Treino {
  return {
    id: linha.id,
    fichaId: linha.ficha_id ?? TREINO_LIVRE, // treino livre, ou a ficha foi apagada
    nomeFicha: linha.nome_ficha,
    inicio: new Date(linha.inicio).toISOString(),
    fim: new Date(linha.fim).toISOString(),
    exercicios: linha.treino_exercicios.map((exercicio) => ({
      exercicioId: exercicio.exercicio_id,
      nome: exercicio.nome,
      grupo: exercicio.grupo as GrupoMuscular, // o "check" da tabela só aceita os grupos da app
      notas: exercicio.notas ?? undefined,
      series: exercicio.series.map((serie) => ({
        numero: serie.numero,
        carga: serie.carga,
        repeticoes: serie.repeticoes,
        feita: serie.feita,
      })),
    })),
  };
}
