import { Injectable, computed, signal } from '@angular/core';
import { Ficha } from '../modelos/ficha';
import { ExercicioNoTreino, ResumoExercicio, ResumoSemana, Serie, TREINO_LIVRE, Treino } from '../modelos/treino';
import { inicioDaSemana } from '../utils/datas';
import { gerarId } from '../utils/gerar-id';
import { ArmazenamentoService } from './armazenamento-service';

// Treinos: o que está a decorrer agora e o histórico dos que já terminaram.
@Injectable({ providedIn: 'root' })
export class TreinoService {
  private readonly chaveHistorico = 'treinos';
  private readonly chaveEmCurso = 'treino-em-curso';

  // Treinos terminados, do mais recente para o mais antigo
  private readonly historico = signal<Treino[]>([]);
  readonly treinos = this.historico.asReadonly();

  // Treino a decorrer (ou null). Fica guardado para não se perder se a página recarregar.
  private readonly emCurso = signal<Treino | null>(null);
  readonly treinoEmCurso = this.emCurso.asReadonly();

  constructor(private armazenamento: ArmazenamentoService) {
    this.historico.set(this.armazenamento.ler<Treino[]>(this.chaveHistorico, []));
    this.emCurso.set(this.armazenamento.ler<Treino | null>(this.chaveEmCurso, null));
  }

  obter(id: string): Treino | undefined {
    return this.historico().find((treino) => treino.id === id);
  }

  // Cria um treino a partir de uma ficha, já com as cargas da última vez
  iniciar(ficha: Ficha): Treino {
    const treino: Treino = {
      id: gerarId(),
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
      id: gerarId(),
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

  // Passa o treino em curso para o histórico
  terminar(): Treino | null {
    const treino = this.emCurso();
    if (!treino) {
      return null;
    }
    const terminado: Treino = { ...treino, fim: new Date().toISOString() };
    this.gravarHistorico([terminado, ...this.historico()]);
    this.definirEmCurso(null);
    return terminado;
  }

  cancelar(): void {
    this.definirEmCurso(null);
  }

  apagar(id: string): void {
    this.gravarHistorico(this.historico().filter((treino) => treino.id !== id));
  }

  // Séries feitas da última vez que se treinou este exercício (a coluna "anterior").
  // Os treinos em que o exercício ficou sem séries feitas não contam.
  ultimasSeries(exercicioId: string): Serie[] {
    for (const treino of this.historico()) {
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
    const cargas = this.historico()
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
    return this.historico().find((treino) => treino.fichaId === fichaId);
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
    const daSemana = this.historico().filter((treino) => new Date(treino.inicio) >= segunda);
    return {
      treinos: daSemana.length,
      volume: daSemana.reduce((total, treino) => total + this.volume(treino), 0),
      segundos: daSemana.reduce((total, treino) => total + this.duracao(treino), 0),
      dias: [...new Set(daSemana.map((treino) => (new Date(treino.inicio).getDay() + 6) % 7))],
    };
  });

  private definirEmCurso(treino: Treino | null): void {
    this.emCurso.set(treino);
    if (treino) {
      this.armazenamento.guardar(this.chaveEmCurso, treino);
    } else {
      this.armazenamento.apagar(this.chaveEmCurso);
    }
  }

  private gravarHistorico(treinos: Treino[]): void {
    this.historico.set(treinos);
    this.armazenamento.guardar(this.chaveHistorico, treinos);
  }
}
