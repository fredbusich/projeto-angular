import { DatePipe, DecimalPipe, I18nPluralPipe } from '@angular/common';
import { Component, Signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TreinoCard } from '../../componentes/treino-card/treino-card';
import { nomesDosGrupos } from '../../modelos/exercicio';
import { Ficha, NOMES_TIPOS } from '../../modelos/ficha';
import { ResumoSemana, TREINO_LIVRE, Treino } from '../../modelos/treino';
import { DuracaoPipe } from '../../pipes/duracao-pipe';
import { FichaService } from '../../servicos/ficha-service';
import { TreinoService } from '../../servicos/treino-service';
import { textoDiasAtras } from '../../utils/datas';

@Component({
  imports: [RouterLink, DatePipe, DecimalPipe, I18nPluralPipe, DuracaoPipe, TreinoCard],
  selector: 'app-inicio',
  styleUrl: './inicio.css',
  templateUrl: './inicio.html',
})
export class Inicio {
  protected readonly hoje = new Date();
  protected readonly saudacao = this.escolherSaudacao(this.hoje.getHours());
  protected readonly nomesTipos = NOMES_TIPOS;
  protected readonly treinoLivre = TREINO_LIVRE;
  protected readonly plural = { '=1': '# exercício', other: '# exercícios' };
  protected readonly pluralTreinos = { '=1': 'treino', other: 'treinos' };

  // Dados que vêm dos services (signals: o ecrã atualiza sozinho)
  protected readonly emCurso: Signal<Treino | null>;
  protected readonly semana: Signal<ResumoSemana>;

  // computed: recalculam-se quando as fichas ou os treinos mudam
  protected readonly proxima = computed(() => this.treinoService.sugerirProxima(this.fichaService.fichas()));
  protected readonly ultimos = computed(() => this.treinoService.treinos().slice(0, 3));

  constructor(
    private fichaService: FichaService,
    private treinoService: TreinoService,
  ) {
    this.emCurso = this.treinoService.treinoEmCurso;
    this.semana = this.treinoService.resumoDaSemana;
  }

  protected grupos(ficha: Ficha): string {
    return nomesDosGrupos(ficha.exercicios);
  }

  // "Último: há 3 dias" ou "Ainda não feito"
  protected ultimaVez(ficha: Ficha): string {
    const ultimo = this.treinoService.ultimoTreinoDaFicha(ficha.id);
    return ultimo ? `Último: ${textoDiasAtras(ultimo.inicio)}` : 'Ainda não feito';
  }

  protected seriesFeitas(treino: Treino): number {
    return this.treinoService.seriesFeitas(treino);
  }

  protected totalSeries(treino: Treino): number {
    return treino.exercicios.reduce((total, exercicio) => total + exercicio.series.length, 0);
  }

  private escolherSaudacao(hora: number): string {
    if (hora >= 6 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 20) return 'Boa tarde';
    return 'Boa noite';
  }
}
