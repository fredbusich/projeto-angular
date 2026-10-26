import { DatePipe } from '@angular/common';
import { Component, HostListener, Signal, effect, signal, untracked } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ListaExercicios } from '../../componentes/lista-exercicios/lista-exercicios';
import { Painel } from '../../diretivas/painel';
import { Exercicio, GrupoMuscular, NOMES_GRUPOS } from '../../modelos/exercicio';
import { imagemDoExercicio } from '../../modelos/exercisedb';
import { ExercicioNoTreino, Serie, Treino } from '../../modelos/treino';
import { NomeExercicioPipe } from '../../pipes/nome-exercicio-pipe';
import { EstadoDados } from '../../servicos/supabase-service';
import { TreinoService } from '../../servicos/treino-service';
import { inteiro } from '../../utils/validadores';

// Os campos de uma série e de um exercício dentro do formulário
type GrupoSerie = FormGroup<{
  carga: FormControl<number | null>;
  repeticoes: FormControl<number | null>;
  feita: FormControl<boolean>;
}>;
type GrupoExercicio = FormGroup<{
  exercicioId: FormControl<string>;
  nome: FormControl<string>;
  grupo: FormControl<GrupoMuscular>;
  notas: FormControl<string>;
  series: FormArray<GrupoSerie>;
}>;

// Editar um treino terminado (/historico/:id/editar): corrigir cargas e repetições, marcar ou
// desmarcar séries, acrescentar ou tirar séries e exercícios. A data e o nome ficam como estão.
@Component({
  imports: [ReactiveFormsModule, RouterLink, DatePipe, NomeExercicioPipe, ListaExercicios, Painel],
  selector: 'app-treino-editar',
  styleUrl: './treino-editar.css',
  templateUrl: './treino-editar.html',
})
export class TreinoEditar {
  protected readonly nomesGrupos = NOMES_GRUPOS;
  protected readonly imagem = imagemDoExercicio;

  // FormArray dentro de FormArray: os exercícios, e as séries de cada um.
  // Validators.required num FormArray: a lista não pode ficar vazia.
  protected readonly formulario = new FormGroup({
    exercicios: new FormArray<GrupoExercicio>([], Validators.required),
  });

  private readonly id: string | null;
  protected readonly estado: Signal<EstadoDados>;
  protected readonly original = signal<Treino | null>(null);
  protected readonly naoEncontrado = signal(false);
  private preenchido = false;

  protected readonly aGuardar = signal(false);
  protected readonly erro = signal('');
  protected readonly seletorAberto = signal(false);

  constructor(
    private treinoService: TreinoService,
    rota: ActivatedRoute,
    private router: Router,
  ) {
    this.id = rota.snapshot.paramMap.get('id');
    this.estado = this.treinoService.estado;

    // Quando o histórico estiver carregado, preenche o formulário com o treino (uma vez só)
    effect(() => {
      if (this.estado() === 'pronto') {
        untracked(() => this.preencher());
      }
    });
  }

  protected get exercicios(): FormArray<GrupoExercicio> {
    return this.formulario.controls.exercicios;
  }

  protected mostrarErro(campo: AbstractControl): boolean {
    return campo.invalid && campo.touched;
  }

  protected tentarOutraVez(): void {
    this.treinoService.carregar();
  }

  // ---------- Séries e exercícios ----------

  // Nova série igual à última do exercício
  protected adicionarSerie(exercicio: GrupoExercicio): void {
    const ultima = exercicio.controls.series.at(-1)?.getRawValue();
    exercicio.controls.series.push(this.criarSerie({ numero: 0, carga: ultima?.carga ?? 0, repeticoes: ultima?.repeticoes ?? 10, feita: true }));
  }

  protected removerSerie(exercicio: GrupoExercicio, indice: number): void {
    exercicio.controls.series.removeAt(indice);
    exercicio.controls.series.markAsTouched();
  }

  protected removerExercicio(indice: number): void {
    this.exercicios.removeAt(indice);
    this.exercicios.markAsTouched();
  }

  protected abrirSeletor(): void {
    this.seletorAberto.set(true);
  }

  protected fecharSeletor(): void {
    this.seletorAberto.set(false);
  }

  @HostListener('document:keydown.escape')
  protected aoCarregarEscape(): void {
    this.fecharSeletor();
  }

  // A ListaExercicios emitiu "escolher": o exercício entra no fim, com uma série
  protected adicionarExercicio(exercicio: Exercicio): void {
    this.exercicios.push(
      this.criarExercicio({
        exercicioId: exercicio.id,
        nome: exercicio.nome,
        grupo: exercicio.grupo,
        series: [{ numero: 1, carga: 0, repeticoes: 10, feita: true }],
      }),
    );
    this.fecharSeletor();
  }

  // ---------- Guardar ----------

  protected guardar(): void {
    const original = this.original();
    if (this.aGuardar() || !original) {
      return;
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const treino: Treino = {
      ...original,
      exercicios: this.exercicios.getRawValue().map((e) => ({
        exercicioId: e.exercicioId,
        nome: e.nome,
        grupo: e.grupo,
        notas: e.notas.trim() || undefined,
        series: e.series.map((s, i) => ({ numero: i + 1, carga: Number(s.carga), repeticoes: Number(s.repeticoes), feita: s.feita })),
      })),
    };
    this.aGuardar.set(true);
    this.erro.set('');
    this.treinoService.atualizar(treino).subscribe({
      next: () => this.router.navigate(['/historico']),
      error: (erro: Error) => {
        this.aGuardar.set(false);
        this.erro.set(erro.message);
      },
    });
  }

  // ---------- Auxiliares ----------

  private preencher(): void {
    if (this.preenchido) {
      return;
    }
    this.preenchido = true;
    const treino = this.id ? this.treinoService.obter(this.id) : undefined;
    if (!treino) {
      this.naoEncontrado.set(true);
      return;
    }
    this.original.set(treino);
    treino.exercicios.forEach((exercicio) => this.exercicios.push(this.criarExercicio(exercicio)));
  }

  private criarExercicio(exercicio: Omit<ExercicioNoTreino, 'notas'> & { notas?: string }): GrupoExercicio {
    return new FormGroup({
      exercicioId: new FormControl(exercicio.exercicioId, { nonNullable: true }),
      nome: new FormControl(exercicio.nome, { nonNullable: true }),
      grupo: new FormControl(exercicio.grupo, { nonNullable: true }),
      notas: new FormControl(exercicio.notas ?? '', { nonNullable: true, validators: Validators.maxLength(200) }),
      // cada exercício precisa de pelo menos uma série
      series: new FormArray(exercicio.series.map((serie) => this.criarSerie(serie)), Validators.required),
    });
  }

  // As mesmas regras da base de dados: carga de 0 a 999 kg, repetições inteiras de 0 a 100
  private criarSerie(serie: Serie): GrupoSerie {
    return new FormGroup({
      carga: new FormControl<number | null>(serie.carga, [Validators.required, Validators.min(0), Validators.max(999)]),
      repeticoes: new FormControl<number | null>(serie.repeticoes, [Validators.required, Validators.min(0), Validators.max(100), inteiro]),
      feita: new FormControl(serie.feita, { nonNullable: true }),
    });
  }
}
