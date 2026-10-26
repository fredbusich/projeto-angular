import { DatePipe, I18nPluralPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { chaveDoDia } from '../../utils/datas';

interface DiaDoCalendario {
  numero: number;
  chave: string;        // "2026-10-22" (dia local), para encontrar os treinos desse dia
  treinos: number;
  hoje: boolean;
}

// Calendário de um mês, com os dias em que se treinou marcados. As setas andam para trás até ao
// mês do primeiro treino e para a frente até ao mês atual. Carregar num dia com treino avisa o pai.
@Component({
  imports: [DatePipe, I18nPluralPipe],
  selector: 'app-calendario-treinos',
  styleUrl: './calendario-treinos.css',
  templateUrl: './calendario-treinos.html',
})
export class CalendarioTreinos {
  // pai -> filho: quantos treinos houve em cada dia ("2026-10-22" -> 1) e quando foi o primeiro
  @Input({ required: true }) treinosPorDia = new Map<string, number>();
  @Input() primeiroTreino: string | null = null;

  // filho -> pai: o dia em que se carregou
  @Output() escolherDia = new EventEmitter<string>();

  protected readonly diasDaSemana = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  protected readonly plural = { '=0': 'Nenhum treino', '=1': '1 treino', other: '# treinos' };

  // O mês à vista: o dia 1 desse mês
  protected readonly mes = signal(inicioDoMes(new Date()));

  protected get podeRecuar(): boolean {
    return this.primeiroTreino !== null && this.mes() > inicioDoMes(new Date(this.primeiroTreino));
  }

  protected get podeAvancar(): boolean {
    return this.mes() < inicioDoMes(new Date());
  }

  // As semanas do mês, de segunda a domingo; null = espaço antes do dia 1 ou depois do último
  protected get semanas(): (DiaDoCalendario | null)[][] {
    const mes = this.mes();
    const ano = mes.getFullYear();
    const numeroMes = mes.getMonth();
    const diasNoMes = new Date(ano, numeroMes + 1, 0).getDate();
    const antes = (mes.getDay() + 6) % 7; // segunda = 0
    const hoje = chaveDoDia(new Date());

    const celulas: (DiaDoCalendario | null)[] = Array(antes).fill(null);
    for (let numero = 1; numero <= diasNoMes; numero++) {
      const chave = chaveDoDia(new Date(ano, numeroMes, numero));
      celulas.push({ numero, chave, treinos: this.treinosPorDia.get(chave) ?? 0, hoje: chave === hoje });
    }
    while (celulas.length % 7 !== 0) {
      celulas.push(null);
    }
    const semanas: (DiaDoCalendario | null)[][] = [];
    for (let i = 0; i < celulas.length; i += 7) {
      semanas.push(celulas.slice(i, i + 7));
    }
    return semanas;
  }

  protected get treinosNoMes(): number {
    return this.semanas.flat().reduce((total, dia) => total + (dia?.treinos ?? 0), 0);
  }

  protected mudarMes(direcao: -1 | 1): void {
    const mes = this.mes();
    this.mes.set(new Date(mes.getFullYear(), mes.getMonth() + direcao, 1));
  }
}

function inicioDoMes(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}
