// Calculadora de discos: que discos pôr de cada lado da barra para chegar a uma carga.

export const DISCOS = [25, 20, 15, 10, 5, 2.5, 1.25]; // kg, os discos habituais de um ginásio

export interface Montagem {
  porLado: number[]; // discos de um lado, do maior (junto ao centro) para o menor
  falta: number;     // kg que não dá para fazer com estes discos (0 = conta certa)
}

// Vai pondo o maior disco que ainda cabe, como se faz no ginásio.
//   montarBarra(100, 20) -> { porLado: [25, 15], falta: 0 }     (20 + 2 × 40)
//   montarBarra(61, 20)  -> { porLado: [20], falta: 1 }         (com estes discos, 60 ou 62,5)
export function montarBarra(carga: number, barra: number): Montagem {
  let resto = Math.max(0, (carga - barra) / 2);
  const porLado: number[] = [];
  for (const disco of DISCOS) {
    while (resto >= disco - 0.001) {
      porLado.push(disco);
      resto -= disco;
    }
  }
  return { porLado, falta: Math.round(resto * 2 * 100) / 100 };
}

// Peso da barra que costuma ir com o exercício, pelo nome em inglês (0 = máquina, só contam os discos).
// null = o exercício não leva discos (halteres, polia, peso corporal…).
export function barraDoExercicio(nomeIngles: string): number | null {
  const nome = nomeIngles.toLowerCase();
  if (/\bez[- ]?bar/.test(nome)) return 10;
  if (/barbell|olympic|trap bar/.test(nome)) return 20;
  if (/smith|sled|lever|leg press|hack/.test(nome)) return 0;
  return null;
}
