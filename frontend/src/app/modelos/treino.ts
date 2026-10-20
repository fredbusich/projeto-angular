import { GrupoMuscular } from './exercicio';

export interface Serie {
  numero: number;
  carga: number;           // kg
  repeticoes: number;
  feita: boolean;
}

// Um exercício dentro de um treino: o que se fez de verdade, série a série
export interface ExercicioNoTreino {
  exercicioId: number;
  nome: string;
  grupo: GrupoMuscular;
  notas?: string;
  series: Serie[];
}

// Os números da semana (de segunda a domingo) para a página Início e o Histórico
export interface ResumoSemana {
  treinos: number;
  volume: number;          // kg
  segundos: number;        // tempo a treinar
  dias: number[];          // dias com treino: 0 = segunda … 6 = domingo
}

export interface Treino {
  id: string;
  fichaId: string;
  nomeFicha: string;
  inicio: string;          // data ISO
  fim?: string;            // só existe depois de o treino terminar
  exercicios: ExercicioNoTreino[];
}
