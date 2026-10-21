import { DadosFicha } from './ficha';

// Plano Push · Pull · Legs para quem quer começar depressa.
// Os ids são os dos exercícios na API ExerciseDB (confirmados a 20/10/2026).
export const FICHAS_EXEMPLO: DadosFicha[] = [
  {
    nome: 'Push A',
    tipo: 'push',
    exercicios: [
      { exercicioId: 'EIeI8Vf', nome: 'Barbell bench press', grupo: 'peito', series: 4, repeticoes: 8 },
      { exercicioId: 'ns0SIbU', nome: 'Dumbbell incline bench press', grupo: 'peito', series: 3, repeticoes: 10 },
      { exercicioId: 'znQUdHY', nome: 'Dumbbell seated shoulder press', grupo: 'ombros', series: 3, repeticoes: 10 },
      { exercicioId: 'DsgkuIt', nome: 'Dumbbell lateral raise', grupo: 'ombros', series: 3, repeticoes: 12 },
      { exercicioId: '3ZflifB', nome: 'Cable pushdown', grupo: 'bracos', series: 3, repeticoes: 12 },
    ],
  },
  {
    nome: 'Pull A',
    tipo: 'pull',
    exercicios: [
      { exercicioId: 'LEprlgG', nome: 'Cable lat pulldown full range of motion', grupo: 'costas', series: 4, repeticoes: 10 },
      { exercicioId: 'eZyBC3j', nome: 'Barbell bent over row', grupo: 'costas', series: 4, repeticoes: 8 },
      { exercicioId: 'A3P4O0R', nome: 'Cable seated row', grupo: 'costas', series: 3, repeticoes: 10 },
      { exercicioId: 'EKXOMEh', nome: 'Dumbbell rear delt row (shoulder)', grupo: 'ombros', series: 3, repeticoes: 12 },
      { exercicioId: '25GPyDY', nome: 'Barbell curl', grupo: 'bracos', series: 3, repeticoes: 10 },
      { exercicioId: '2NpxjC1', nome: 'Dumbbell hammer curl', grupo: 'bracos', series: 3, repeticoes: 12 },
    ],
  },
  {
    nome: 'Legs A',
    tipo: 'legs',
    exercicios: [
      { exercicioId: 'qXTaZnJ', nome: 'Barbell full squat', grupo: 'pernas', series: 4, repeticoes: 8 },
      { exercicioId: '10Z2DXU', nome: 'Sled 45° leg press', grupo: 'pernas', series: 3, repeticoes: 10 },
      { exercicioId: 'o6LqKKP', nome: 'Barbell romanian deadlift', grupo: 'pernas', series: 3, repeticoes: 10 },
      { exercicioId: 'my33uHU', nome: 'Machine Leg Extension', grupo: 'pernas', series: 3, repeticoes: 12 },
      { exercicioId: '17lJ1kr', nome: 'Machine Lying Leg Curl', grupo: 'pernas', series: 3, repeticoes: 12 },
      { exercicioId: '8ozhUIZ', nome: 'Barbell standing calf raise', grupo: 'gemeos', series: 4, repeticoes: 15 },
    ],
  },
];
