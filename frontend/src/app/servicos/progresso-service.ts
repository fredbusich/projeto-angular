import { Injectable, computed } from '@angular/core';
import { GrupoMuscular } from '../modelos/exercicio';
import { Serie } from '../modelos/treino';
import { TreinoService } from './treino-service';

// Um exercício que já foi treinado (para escolher no Progresso)
export interface ExercicioFeito {
  exercicioId: string;
  nome: string;
  grupo: GrupoMuscular;
  vezes: number;        // em quantos treinos
}

// Um ponto do gráfico: a melhor série de um exercício num treino
export interface PontoProgresso {
  data: string;         // início do treino (ISO)
  carga: number;        // kg da melhor série
  repeticoes: number;
}

// O melhor de sempre num exercício
export interface RecordePessoal {
  exercicioId: string;
  nome: string;
  grupo: GrupoMuscular;
  melhor: Serie;
  data: string;         // quando foi feito
}

export interface ResumoTotal {
  treinos: number;
  volume: number;       // kg
  segundos: number;
  desde: string | null; // início do primeiro treino (ISO)
}

// Números do histórico todo: o resumo desde o início, a evolução de cada exercício e os recordes.
// São computed sobre o histórico do TreinoService: quando um treino é gravado, editado ou apagado,
// tudo se recalcula sozinho.
@Injectable({ providedIn: 'root' })
export class ProgressoService {
  constructor(private treinoService: TreinoService) {}

  readonly resumoTotal = computed<ResumoTotal>(() => {
    const treinos = this.treinoService.treinos();
    return {
      treinos: treinos.length,
      volume: treinos.reduce((total, treino) => total + this.treinoService.volume(treino), 0),
      segundos: treinos.reduce((total, treino) => total + this.treinoService.duracao(treino), 0),
      desde: treinos.at(-1)?.inicio ?? null, // o histórico vem do mais recente para o mais antigo
    };
  });

  // Os exercícios com séries feitas, do mais treinado para o menos
  readonly exercicios = computed<ExercicioFeito[]>(() => {
    const porId = new Map<string, ExercicioFeito>();
    for (const treino of this.treinoService.treinos()) {
      for (const exercicio of treino.exercicios) {
        if (!exercicio.series.some((serie) => serie.feita)) {
          continue;
        }
        const visto = porId.get(exercicio.exercicioId);
        if (visto) {
          visto.vezes++;
        } else {
          porId.set(exercicio.exercicioId, { exercicioId: exercicio.exercicioId, nome: exercicio.nome, grupo: exercicio.grupo, vezes: 1 });
        }
      }
    }
    return [...porId.values()].sort((a, b) => b.vezes - a.vezes);
  });

  // O melhor de sempre em cada exercício; os mais recentes primeiro
  readonly recordes = computed<RecordePessoal[]>(() => {
    const porId = new Map<string, RecordePessoal>();
    // do mais antigo para o mais recente: num empate, fica a primeira vez que se chegou lá
    for (const treino of [...this.treinoService.treinos()].reverse()) {
      for (const exercicio of treino.exercicios) {
        const melhor = melhorSerie(exercicio.series);
        const atual = porId.get(exercicio.exercicioId);
        if (melhor && (!atual || melhorQue(melhor, atual.melhor))) {
          porId.set(exercicio.exercicioId, { exercicioId: exercicio.exercicioId, nome: exercicio.nome, grupo: exercicio.grupo, melhor, data: treino.inicio });
        }
      }
    }
    return [...porId.values()].sort((a, b) => Date.parse(b.data) - Date.parse(a.data));
  });

  // A melhor série de um exercício em cada treino em que foi feito, do mais antigo para o mais recente
  evolucao(exercicioId: string): PontoProgresso[] {
    const pontos: PontoProgresso[] = [];
    for (const treino of this.treinoService.treinos()) {
      const exercicio = treino.exercicios.find((e) => e.exercicioId === exercicioId);
      const melhor = exercicio ? melhorSerie(exercicio.series) : null;
      if (melhor) {
        pontos.push({ data: treino.inicio, carga: melhor.carga, repeticoes: melhor.repeticoes });
      }
    }
    return pontos.reverse();
  }
}

// A série feita com mais carga (num empate, a com mais repetições); null se nenhuma foi feita
function melhorSerie(series: Serie[]): Serie | null {
  return series.filter((serie) => serie.feita).reduce<Serie | null>((melhor, serie) => (!melhor || melhorQue(serie, melhor) ? serie : melhor), null);
}

function melhorQue(a: Serie, b: Serie): boolean {
  return a.carga > b.carga || (a.carga === b.carga && a.repeticoes > b.repeticoes);
}
