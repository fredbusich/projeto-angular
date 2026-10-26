import { DatePipe, DecimalPipe, I18nPluralPipe } from '@angular/common';
import { Component, Signal, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GraficoProgresso } from '../../componentes/grafico-progresso/grafico-progresso';
import { GrupoMuscular, NOMES_GRUPOS } from '../../modelos/exercicio';
import { NomeExercicioPipe } from '../../pipes/nome-exercicio-pipe';
import { ExercicioFeito, ProgressoService, RecordePessoal } from '../../servicos/progresso-service';
import { EstadoDados } from '../../servicos/supabase-service';
import { TreinoService } from '../../servicos/treino-service';

// Progresso: a evolução de um exercício num gráfico e os recordes pessoais de todos.
@Component({
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe, I18nPluralPipe, NomeExercicioPipe, GraficoProgresso],
  selector: 'app-progresso',
  styleUrl: './progresso.css',
  templateUrl: './progresso.html',
})
export class Progresso {
  protected readonly nomesGrupos = NOMES_GRUPOS;
  protected readonly pluralVezes = { '=1': '1 treino', other: '# treinos' };

  protected readonly estado: Signal<EstadoDados>;
  protected readonly exercicios: Signal<ExercicioFeito[]>;
  protected readonly recordes: Signal<RecordePessoal[]>;

  // O exercício escolhido (null = ainda nenhum: fica o mais treinado)
  private readonly escolhido = signal<string | null>(null);
  protected readonly exercicioId = computed(() => this.escolhido() ?? this.exercicios()[0]?.exercicioId ?? null);
  protected readonly exercicio = computed(() => this.exercicios().find((e) => e.exercicioId === this.exercicioId()));

  // computed: a evolução recalcula-se quando se escolhe outro exercício ou o histórico muda
  protected readonly pontos = computed(() => {
    const id = this.exercicioId();
    return id ? this.progressoService.evolucao(id) : [];
  });

  // Primeira vez, melhor e última vez, e quanto subiu desde a primeira
  protected readonly numeros = computed(() => {
    const pontos = this.pontos();
    if (pontos.length === 0) {
      return null;
    }
    const primeira = pontos[0];
    const ultima = pontos[pontos.length - 1];
    const melhor = pontos.reduce((a, b) => (b.carga > a.carga || (b.carga === a.carga && b.repeticoes > a.repeticoes) ? b : a));
    return { primeira, ultima, melhor, subiu: melhor.carga - primeira.carga };
  });

  // Filtro dos recordes por grupo muscular ('' = todos)
  protected readonly grupo = signal<GrupoMuscular | ''>('');
  protected readonly gruposComRecordes = computed(() => [...new Set(this.recordes().map((r) => r.grupo))]);
  protected readonly recordesVisiveis = computed(() => {
    const grupo = this.grupo();
    return grupo ? this.recordes().filter((r) => r.grupo === grupo) : this.recordes();
  });

  constructor(
    private progressoService: ProgressoService,
    private treinoService: TreinoService,
  ) {
    this.estado = this.treinoService.estado;
    this.exercicios = this.progressoService.exercicios;
    this.recordes = this.progressoService.recordes;
  }

  protected tentarOutraVez(): void {
    this.treinoService.carregar();
  }

  protected escolher(exercicioId: string): void {
    this.escolhido.set(exercicioId);
  }

  // Num recorde da lista: mostra esse exercício no gráfico e sobe até ele
  protected verNoGrafico(exercicioId: string): void {
    this.escolhido.set(exercicioId);
    document.getElementById('titulo-evolucao')?.scrollIntoView({ behavior: 'smooth' });
  }
}
