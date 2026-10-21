// Formato das respostas da API ExerciseDB (só com os campos que a app usa)

// Generic <T>: a mesma "embalagem" serve para qualquer tipo de resultado
export interface RespostaExerciseDb<T> {
  success: boolean;
  meta: {
    total: number;
    hasNextPage: boolean;
    nextCursor?: string;   // marcador para pedir a página seguinte
  };
  data: T[];
}

// Resposta de /exercises/{id}: um só exercício
export interface RespostaExercicio<T> {
  success: boolean;
  data: T;
}

// Todas as animações da ExerciseDB estão neste endereço (é o gifUrl de cada exercício).
// As fichas e os treinos só guardam o id do exercício, por isso a imagem calcula-se a partir dele.
export function imagemDoExercicio(exercicioId: string): string {
  return `https://static.exercisedb.dev/media/${exercicioId}.gif`;
}

export interface ExercicioExerciseDb {
  exerciseId: string;
  name: string;
  gifUrl: string;          // animação do exercício (pessoa em branco, músculo a vermelho)
  bodyParts: string[];     // "chest", "back", "upper legs"…
  equipments: string[];    // "barbell", "dumbbell", "cable"…
  targetMuscles: string[];
}
