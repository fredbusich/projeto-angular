// Formato das respostas da API wger (só com os campos que a app usa)

// Generic <T>: a mesma "embalagem" de paginação serve para qualquer tipo de resultado
export interface RespostaPaginada<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ExercicioWger {
  id: number;
  category: { id: number; name: string };
  equipment: { id: number; name: string }[];
  images: { image: string; is_main: boolean }[];
  translations: { language: number; name: string }[];
}
