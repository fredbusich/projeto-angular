import { DatePipe, DecimalPipe, I18nPluralPipe } from '@angular/common';
import { Component, Signal, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TreinoCard } from '../../componentes/treino-card/treino-card';
import { nomesDosGrupos } from '../../modelos/exercicio';
import { Ficha, NOMES_TIPOS } from '../../modelos/ficha';
import { ResumoSemana, TREINO_LIVRE, Treino } from '../../modelos/treino';
import { DuracaoPipe } from '../../pipes/duracao-pipe';
import { FichaService } from '../../servicos/ficha-service';
import { ImportacaoService } from '../../servicos/importacao-service';
import { EstadoDados } from '../../servicos/supabase-service';
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
  protected readonly estadoTreinos: Signal<EstadoDados>;

  // A sugestão precisa das fichas e do histórico: espera pelos dois
  protected readonly estadoSugestao = computed<EstadoDados>(() => {
    const estados = [this.fichaService.estado(), this.treinoService.estado()];
    if (estados.includes('a-carregar')) return 'a-carregar';
    if (estados.includes('erro')) return 'erro';
    return 'pronto';
  });

  // computed: recalculam-se quando as fichas ou os treinos mudam
  protected readonly proxima = computed(() => this.treinoService.sugerirProxima(this.fichaService.fichas()));
  protected readonly ultimos = computed(() => this.treinoService.treinos().slice(0, 3));

  // Dados da fase 1 neste aparelho: "3 fichas e 5 treinos guardados", com a concordância certa
  // ("5 fichas guardadas … importá-las", "1 treino guardado … importá-lo")
  protected readonly dadosAntigos = computed(() => {
    const fichas = this.importacao.quantasFichas();
    const treinos = this.importacao.quantosTreinos();
    const partes: string[] = [];
    if (fichas > 0) partes.push(fichas === 1 ? '1 ficha' : `${fichas} fichas`);
    if (treinos > 0) partes.push(treinos === 1 ? '1 treino' : `${treinos} treinos`);
    const terminacao = (treinos === 0 ? 'a' : 'o') + (fichas + treinos > 1 ? 's' : '');
    return { texto: partes.join(' e '), guardados: `guardad${terminacao}`, importar: `importá-l${terminacao}` };
  });
  protected readonly mostrarImportar: Signal<boolean>;
  protected readonly aImportar = signal(false);
  protected readonly erroImportar = signal('');
  protected readonly importado = signal(false);

  constructor(
    private fichaService: FichaService,
    private treinoService: TreinoService,
    private importacao: ImportacaoService,
  ) {
    this.emCurso = this.treinoService.treinoEmCurso;
    this.semana = this.treinoService.resumoDaSemana;
    this.estadoTreinos = this.treinoService.estado;
    this.mostrarImportar = this.importacao.mostrarAviso;
  }

  // "Tentar outra vez": volta a pedir só o que falhou
  protected tentarOutraVez(): void {
    if (this.fichaService.estado() === 'erro') {
      this.fichaService.carregar();
    }
    if (this.treinoService.estado() === 'erro') {
      this.treinoService.carregar();
    }
  }

  protected importar(): void {
    this.aImportar.set(true);
    this.erroImportar.set('');
    this.importacao.importar().subscribe({
      next: () => {
        this.aImportar.set(false);
        this.importado.set(true);
      },
      error: (erro: Error) => {
        this.aImportar.set(false);
        this.erroImportar.set(erro.message);
      },
    });
  }

  protected agoraNao(): void {
    this.importacao.agoraNao();
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
