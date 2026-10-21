// Tipo união: o grupo muscular só pode ser um destes valores
export type GrupoMuscular =
  | 'peito'
  | 'costas'
  | 'pernas'
  | 'ombros'
  | 'bracos'
  | 'abdominais'
  | 'gemeos'
  | 'cardio';

// Record<Chave, Valor>: um nome para mostrar no ecrã por cada grupo muscular
export const NOMES_GRUPOS: Record<GrupoMuscular, string> = {
  peito: 'Peito',
  costas: 'Costas',
  pernas: 'Pernas',
  ombros: 'Ombros',
  bracos: 'Braços',
  abdominais: 'Abdominais',
  gemeos: 'Gémeos',
  cardio: 'Cardio',
};

// "Peito · Ombros · Braços": os grupos de uma lista de exercícios, cada um só uma vez
export function nomesDosGrupos(exercicios: { grupo: GrupoMuscular }[]): string {
  const unicos = new Set(exercicios.map((e) => NOMES_GRUPOS[e.grupo]));
  return [...unicos].join(' · ');
}

// Um exercício da biblioteca, já no formato da nossa app
export interface Exercicio {
  id: string;              // id na API ExerciseDB (ex.: "EIeI8Vf")
  nome: string;
  grupo: GrupoMuscular;
  equipamento: string[];
  imagem?: string;         // animação do exercício
}

// Uma página de resultados da biblioteca
export interface PaginaExercicios {
  total: number;           // quantos exercícios há com estes filtros
  proximo: string | null;  // marcador da página seguinte (null = não há mais)
  exercicios: Exercicio[];
}
