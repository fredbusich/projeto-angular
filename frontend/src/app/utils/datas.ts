const UM_DIA = 24 * 60 * 60 * 1000;

// Segunda-feira às 00:00 da semana da data indicada
export function inicioDaSemana(data: Date = new Date()): Date {
  const dia = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const diasDesdeSegunda = (dia.getDay() + 6) % 7; // getDay(): 0 = domingo; aqui 0 = segunda
  dia.setDate(dia.getDate() - diasDesdeSegunda);
  return dia;
}

// Quantos dias passaram desde a data (0 = hoje, 1 = ontem…)
export function diasAtras(dataIso: string, agora: Date = new Date()): number {
  const data = new Date(dataIso);
  const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((inicioDoDia(agora) - inicioDoDia(data)) / UM_DIA);
}

// "hoje", "ontem", "há 3 dias"
export function textoDiasAtras(dataIso: string, agora: Date = new Date()): string {
  const dias = diasAtras(dataIso, agora);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}
