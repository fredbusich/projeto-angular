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

// Um exercício da biblioteca, já no formato da nossa app
export interface Exercicio {
  id: number;              // id na API wger
  nome: string;
  grupo: GrupoMuscular;
  equipamento: string[];
  imagem?: string;         // opcional: nem todos têm imagem
}

// Uma página de resultados da biblioteca
export interface PaginaExercicios {
  total: number;           // quantos exercícios existem ao todo
  exercicios: Exercicio[];
}
