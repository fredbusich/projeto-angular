import { Injectable, signal } from '@angular/core';
import { Ficha } from '../modelos/ficha';
import { Serie, Treino } from '../modelos/treino';
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
      exercicios: ficha.exercicios.map((exercicio) => {
        const anteriores = this.ultimasSeries(exercicio.exercicioId);
        return {
          exercicioId: exercicio.exercicioId,
          nome: exercicio.nome,
          grupo: exercicio.grupo,
          series: Array.from({ length: exercicio.series }, (_, i) => ({
            numero: i + 1,
            // a carga da mesma série da última vez (ou da última série, se agora houver mais)
            carga: (anteriores[i] ?? anteriores.at(-1))?.carga ?? 0,
            repeticoes: exercicio.repeticoes,
            feita: false,
          })),
        };
      }),
    };
    this.definirEmCurso(treino);
    return treino;
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

  // Séries feitas da última vez que se treinou este exercício (a coluna "anterior")
  ultimasSeries(exercicioId: number): Serie[] {
    for (const treino of this.historico()) {
      const exercicio = treino.exercicios.find((e) => e.exercicioId === exercicioId);
      if (exercicio) {
        return exercicio.series.filter((serie) => serie.feita);
      }
    }
    return [];
  }

  // Maior carga já feita neste exercício (o recorde simples da fase 1)
  maiorCarga(exercicioId: number): number {
    const cargas = this.historico()
      .flatMap((treino) => treino.exercicios)
      .filter((exercicio) => exercicio.exercicioId === exercicioId)
      .flatMap((exercicio) => exercicio.series)
      .filter((serie) => serie.feita)
      .map((serie) => serie.carga);
    return cargas.length > 0 ? Math.max(...cargas) : 0;
  }

  // Volume = soma de carga × repetições de todas as séries feitas
  volume(treino: Treino): number {
    return treino.exercicios
      .flatMap((exercicio) => exercicio.series)
      .filter((serie) => serie.feita)
      .reduce((total, serie) => total + serie.carga * serie.repeticoes, 0);
  }

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
