import { DadosFicha } from './ficha';

// Plano Push · Pull · Legs para quem quer começar depressa.
// Os ids são os dos exercícios na API wger (confirmados a 20/10/2026).
export const FICHAS_EXEMPLO: DadosFicha[] = [
  {
    nome: 'Push A',
    tipo: 'push',
    exercicios: [
      { exercicioId: 73, nome: 'Bench Press', grupo: 'peito', series: 4, repeticoes: 8 },
      { exercicioId: 537, nome: 'Supino Inclinado com Halteres', grupo: 'peito', series: 3, repeticoes: 10 },
      { exercicioId: 567, nome: 'Shoulder Press, Dumbbells', grupo: 'ombros', series: 3, repeticoes: 10 },
      { exercicioId: 348, nome: 'Lateral Raises', grupo: 'ombros', series: 3, repeticoes: 12 },
      { exercicioId: 1185, nome: 'Triceps Pushdown', grupo: 'bracos', series: 3, repeticoes: 12 },
    ],
  },
  {
    nome: 'Pull A',
    tipo: 'pull',
    exercicios: [
      { exercicioId: 355, nome: 'Puxada Alta', grupo: 'costas', series: 4, repeticoes: 10 },
      { exercicioId: 83, nome: 'Remada Curvada', grupo: 'costas', series: 4, repeticoes: 8 },
      { exercicioId: 394, nome: 'Remada baixa', grupo: 'costas', series: 3, repeticoes: 10 },
      { exercicioId: 1639, nome: 'Dumbbell Bent Over Face Pull', grupo: 'costas', series: 3, repeticoes: 12 },
      { exercicioId: 91, nome: 'Rosca direta com barra reta', grupo: 'bracos', series: 3, repeticoes: 10 },
      { exercicioId: 272, nome: 'Biceps Martelo', grupo: 'bracos', series: 3, repeticoes: 12 },
    ],
  },
  {
    nome: 'Legs A',
    tipo: 'legs',
    exercicios: [
      { exercicioId: 615, nome: 'Agachamentos', grupo: 'pernas', series: 4, repeticoes: 8 },
      { exercicioId: 371, nome: 'Leg Press', grupo: 'pernas', series: 3, repeticoes: 10 },
      { exercicioId: 507, nome: 'Romanian Deadlift', grupo: 'pernas', series: 3, repeticoes: 10 },
      { exercicioId: 369, nome: 'Leg Extension', grupo: 'pernas', series: 3, repeticoes: 12 },
      { exercicioId: 364, nome: 'Leg Curl', grupo: 'pernas', series: 3, repeticoes: 12 },
      { exercicioId: 622, nome: 'Standing Calf Raises', grupo: 'gemeos', series: 4, repeticoes: 15 },
    ],
  },
];
