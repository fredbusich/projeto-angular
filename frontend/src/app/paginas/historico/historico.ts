import { DatePipe } from '@angular/common';
import { Component, HostListener, Signal, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TreinoCard } from '../../componentes/treino-card/treino-card';
import { Painel } from '../../diretivas/painel';
import { Treino } from '../../modelos/treino';
import { TreinoService } from '../../servicos/treino-service';
import { inicioDaSemana } from '../../utils/datas';

interface DiaDaSemana {
  data: Date;
  treinou: boolean;
  hoje: boolean;
}

interface GrupoDoMes {
  chave: string;      // "2026-9" (ano-mês), para o track do @for
  data: Date;         // um dia desse mês, para o pipe date escrever "outubro 2026"
  treinos: Treino[];
}

@Component({
  imports: [RouterLink, DatePipe, TreinoCard, Painel],
  selector: 'app-historico',
  styleUrl: './historico.css',
  templateUrl: './historico.html',
})
export class Historico {
  protected readonly treinos: Signal<Treino[]>;
  protected readonly paraApagar = signal<Treino | null>(null);

  // Os 7 dias desta semana (segunda a domingo), com os dias em que se treinou
  protected readonly dias = computed<DiaDaSemana[]>(() => {
    const segunda = inicioDaSemana();
    const comTreino = this.treinoService.resumoDaSemana().dias;
    const hoje = new Date().toDateString();
    return Array.from({ length: 7 }, (_, i) => {
      const data = new Date(segunda);
      data.setDate(segunda.getDate() + i);
      return { data, treinou: comTreino.includes(i), hoje: data.toDateString() === hoje };
    });
  });

  // Os treinos agrupados por mês (já vêm do mais recente para o mais antigo)
  protected readonly meses = computed<GrupoDoMes[]>(() => {
    const grupos: GrupoDoMes[] = [];
    for (const treino of this.treinos()) {
      const data = new Date(treino.inicio);
      const chave = `${data.getFullYear()}-${data.getMonth()}`;
      const ultimo = grupos.at(-1);
      if (ultimo && ultimo.chave === chave) {
        ultimo.treinos.push(treino);
      } else {
        grupos.push({ chave, data, treinos: [treino] });
      }
    }
    return grupos;
  });

  constructor(private treinoService: TreinoService) {
    this.treinos = this.treinoService.treinos;
  }

  // O TreinoCard emitiu (apagar): pede confirmação primeiro
  protected pedirParaApagar(treino: Treino): void {
    this.paraApagar.set(treino);
  }

  protected confirmarApagar(): void {
    const treino = this.paraApagar();
    if (treino) {
      this.treinoService.apagar(treino.id);
    }
    this.paraApagar.set(null);
  }

  @HostListener('document:keydown.escape')
  protected cancelarApagar(): void {
    this.paraApagar.set(null);
  }
}
