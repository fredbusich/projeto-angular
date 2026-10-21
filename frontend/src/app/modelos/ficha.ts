import { GrupoMuscular } from './exercicio';

export type TipoFicha = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full';

export const NOMES_TIPOS: Record<TipoFicha, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper',
  lower: 'Lower',
  full: 'Full body',
};

// Um exercício dentro de uma ficha: o que se planeia fazer
export interface ExercicioNaFicha {
  exercicioId: string;
  nome: string;
  grupo: GrupoMuscular;
  series: number;          // séries planeadas
  repeticoes: number;      // repetições alvo
}

export interface Ficha {
  id: string;
  nome: string;
  tipo: TipoFicha;
  exercicios: ExercicioNaFicha[];
  criadaEm: string;        // data ISO
}

// O que o formulário preenche: a Ficha sem o id e a data (o FichaService cria-os)
export type DadosFicha = Omit<Ficha, 'id' | 'criadaEm'>;
