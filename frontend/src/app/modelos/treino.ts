import { GrupoMuscular } from './exercicio';

export interface Serie {
  numero: number;
  carga: number;           // kg
  repeticoes: number;
  feita: boolean;
}

// Um exercício dentro de um treino: o que se fez de verdade, série a série
export interface ExercicioNoTreino {
  exercicioId: string;
  nome: string;
  grupo: GrupoMuscular;
  notas?: string;
  series: Serie[];
}

// Um exercício de um treino resumido (Histórico, partilha e recordes)
export interface ResumoExercicio {
  exercicioId: string;
  nome: string;
  feitas: number;          // séries feitas
  melhor: Serie;           // a série com mais carga (e, em empate, mais repetições)
  anterior: number;        // maior carga deste exercício nos treinos anteriores (0 = nunca feito)
  recorde: boolean;        // passou a carga anterior
}

// Os números da semana (de segunda a domingo) para a página Início e o Histórico
export interface ResumoSemana {
  treinos: number;
  volume: number;          // kg
  segundos: number;        // tempo a treinar
  dias: number[];          // dias com treino: 0 = segunda … 6 = domingo
}

// fichaId de um treino começado sem ficha ("Começar treino vazio"); o endereço é /treino/livre
export const TREINO_LIVRE = 'livre';

export interface Treino {
  id: string;
  fichaId: string;         // id da ficha, ou TREINO_LIVRE
  nomeFicha: string;
  inicio: string;          // data ISO
  fim?: string;            // só existe depois de o treino terminar
  exercicios: ExercicioNoTreino[];
}
