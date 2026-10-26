import { DatePipe, DecimalPipe, I18nPluralPipe } from '@angular/common';
import { Component, HostListener, OnDestroy, Signal, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CalendarioTreinos } from '../../componentes/calendario-treinos/calendario-treinos';
import { TreinoCard } from '../../componentes/treino-card/treino-card';
import { Painel } from '../../diretivas/painel';
import { Treino } from '../../modelos/treino';
import { DuracaoPipe } from '../../pipes/duracao-pipe';
import { PartilhaService } from '../../servicos/partilha-service';
import { ProgressoService, ResumoTotal } from '../../servicos/progresso-service';
import { EstadoDados } from '../../servicos/supabase-service';
import { TreinoService } from '../../servicos/treino-service';
import { chaveDoDia } from '../../utils/datas';

interface GrupoDoMes {
  chave: string;      // "2026-9" (ano-mês), para o track do @for
  data: Date;         // um dia desse mês, para o pipe date escrever "outubro 2026"
  treinos: Treino[];
}

@Component({
  imports: [RouterLink, DatePipe, DecimalPipe, I18nPluralPipe, DuracaoPipe, CalendarioTreinos, TreinoCard, Painel],
  selector: 'app-historico',
  styleUrl: './historico.css',
  templateUrl: './historico.html',
})
export class Historico implements OnDestroy {
  protected readonly pluralPorEnviar = {
    '=1': '1 treino ainda não foi enviado para a tua conta. Está guardado neste aparelho e é enviado quando houver rede.',
    other: '# treinos ainda não foram enviados para a tua conta. Estão guardados neste aparelho e são enviados quando houver rede.',
  };
  protected readonly pluralTreinos = { '=1': '1 treino', other: '# treinos' };

  protected readonly treinos: Signal<Treino[]>;
  protected readonly estado: Signal<EstadoDados>;
  protected readonly quantosPorEnviar: Signal<number>;
  protected readonly enviando: Signal<boolean>;
  protected readonly erroEnvio: Signal<string>;
  // Desde o primeiro treino: quantos, o volume e o tempo a treinar
  protected readonly resumo: Signal<ResumoTotal>;

  protected readonly paraApagar = signal<Treino | null>(null);
  protected readonly aApagar = signal(false);
  protected readonly erroApagar = signal('');
  // Treino em destaque depois de se carregar no seu dia do calendário
  protected readonly destacado = signal<string | null>(null);
  private temporizadorDestaque?: ReturnType<typeof setTimeout>;

  // Quantos treinos houve em cada dia ("2026-10-22" -> 1), para o calendário marcar os dias
  protected readonly treinosPorDia = computed(() => {
    const porDia = new Map<string, number>();
    for (const treino of this.treinos()) {
      const chave = chaveDoDia(treino.inicio);
      porDia.set(chave, (porDia.get(chave) ?? 0) + 1);
    }
    return porDia;
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

  constructor(
    private treinoService: TreinoService,
    private partilhaService: PartilhaService,
    progressoService: ProgressoService,
    private router: Router,
  ) {
    this.treinos = this.treinoService.treinos;
    this.estado = this.treinoService.estado;
    this.quantosPorEnviar = this.treinoService.quantosPorEnviar;
    this.enviando = this.treinoService.enviando;
    this.erroEnvio = this.treinoService.erroEnvio;
    this.resumo = progressoService.resumoTotal;
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizadorDestaque);
  }

  protected tentarOutraVez(): void {
    this.treinoService.carregar();
  }

  protected enviarAgora(): void {
    this.treinoService.enviarPendentes();
  }

  // O calendário emitiu (escolherDia): desce até ao primeiro treino desse dia e destaca-o uns segundos
  protected irParaDia(chave: string): void {
    const treino = this.treinos().find((t) => chaveDoDia(t.inicio) === chave);
    if (!treino) {
      return;
    }
    document.getElementById(`treino-${treino.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.destacado.set(treino.id);
    clearTimeout(this.temporizadorDestaque);
    this.temporizadorDestaque = setTimeout(() => this.destacado.set(null), 2500);
  }

  // O TreinoCard emitiu (partilhar): cria a imagem e abre a partilha (ou descarrega-a)
  protected partilhar(treino: Treino): void {
    this.partilhaService.partilhar(treino);
  }

  // O TreinoCard emitiu (editar): abre a página de edição desse treino
  protected editar(treino: Treino): void {
    this.router.navigate(['/historico', treino.id, 'editar']);
  }

  // O TreinoCard emitiu (apagar): pede confirmação primeiro
  protected pedirParaApagar(treino: Treino): void {
    this.erroApagar.set('');
    this.paraApagar.set(treino);
  }

  // O painel fica aberto até a base de dados responder; se falhar, mostra o erro lá dentro
  protected confirmarApagar(): void {
    const treino = this.paraApagar();
    if (!treino) {
      return;
    }
    this.aApagar.set(true);
    this.treinoService.apagar(treino.id).subscribe({
      next: () => {
        this.aApagar.set(false);
        this.paraApagar.set(null);
      },
      error: (erro: Error) => {
        this.aApagar.set(false);
        this.erroApagar.set(erro.message);
      },
    });
  }

  @HostListener('document:keydown.escape')
  protected cancelarApagar(): void {
    if (!this.aApagar()) {
      this.paraApagar.set(null);
    }
  }
}
