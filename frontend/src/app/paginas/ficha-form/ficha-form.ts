import { I18nPluralPipe } from '@angular/common';
import { Component, HostListener, OnInit, signal } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ListaExercicios } from '../../componentes/lista-exercicios/lista-exercicios';
import { Exercicio, GrupoMuscular, NOMES_GRUPOS } from '../../modelos/exercicio';
import { DadosFicha, ExercicioNaFicha, NOMES_TIPOS, TipoFicha } from '../../modelos/ficha';
import { FichaService } from '../../servicos/ficha-service';
import { inteiro, naoSoEspacos } from '../../utils/validadores';

// Os campos de um exercício dentro do formulário
type GrupoExercicio = FormGroup<{
  exercicioId: FormControl<number>;
  nome: FormControl<string>;
  grupo: FormControl<GrupoMuscular>;
  series: FormControl<number | null>;
  repeticoes: FormControl<number | null>;
}>;

// Formulário para criar (/fichas/nova) e editar (/fichas/:id/editar) uma ficha.
@Component({
  imports: [ReactiveFormsModule, RouterLink, I18nPluralPipe, ListaExercicios],
  selector: 'app-ficha-form',
  styleUrl: './ficha-form.css',
  templateUrl: './ficha-form.html',
})
export class FichaForm implements OnInit {
  protected readonly nomesTipos = NOMES_TIPOS;
  protected readonly tipos = Object.keys(NOMES_TIPOS) as TipoFicha[];
  protected readonly nomesGrupos = NOMES_GRUPOS;
  protected readonly plural = { '=0': 'nenhum', '=1': '# exercício', other: '# exercícios' };

  // O formulário reativo: um FormGroup com um FormControl por campo e um FormArray para a lista
  protected readonly formulario = new FormGroup({
    nome: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(40), naoSoEspacos],
    }),
    tipo: new FormControl<TipoFicha | null>(null, Validators.required),
    // FormArray: uma lista de FormGroups (um por exercício). Validators.required: a lista não pode estar vazia
    exercicios: new FormArray<GrupoExercicio>([], Validators.required),
  });

  protected modoEdicao = false;               // true em /fichas/:id/editar
  protected idEmEdicao: string | null = null;  // id da ficha encontrada
  protected naoEncontrada = false;

  // Painel para escolher exercícios e ids dos que já estão na ficha (aparecem com ✓)
  protected readonly seletorAberto = signal(false);
  protected readonly idsEscolhidos = signal<number[]>([]);

  constructor(
    private fichaService: FichaService,
    private rota: ActivatedRoute,
    private router: Router,
  ) {}

  // Atalho para a lista de exercícios do formulário
  protected get exercicios(): FormArray<GrupoExercicio> {
    return this.formulario.controls.exercicios;
  }

  // OnInit: se o endereço tiver um id (/fichas/:id/editar), preenche o formulário com essa ficha
  ngOnInit(): void {
    const id = this.rota.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.modoEdicao = true;
    const ficha = this.fichaService.obter(id);
    if (!ficha) {
      this.naoEncontrada = true;
      return;
    }
    this.idEmEdicao = id;
    this.formulario.patchValue({ nome: ficha.nome, tipo: ficha.tipo });
    ficha.exercicios.forEach((exercicio) => this.exercicios.push(this.criarGrupo(exercicio)));
    this.atualizarIdsEscolhidos();
  }

  // Mostra o erro de um campo só depois de o utilizador sair dele (touched),
  // para não aparecer "pelo menos 3 letras" logo ao escrever a primeira
  protected mostrarErro(campo: AbstractControl): boolean {
    return campo.invalid && campo.touched;
  }

  // Texto por baixo do botão Guardar, enquanto o formulário estiver inválido
  protected get pendentes(): string {
    const campos = this.formulario.controls;
    const falta: string[] = [];
    if (campos.nome.invalid) falta.push('um nome com pelo menos 3 letras');
    if (campos.tipo.invalid) falta.push('o tipo de treino');
    if (this.exercicios.length === 0) falta.push('pelo menos um exercício');
    if (this.exercicios.controls.some((grupo) => grupo.invalid)) falta.push('séries e repetições válidas');
    return falta.join(', ');
  }

  // ---------- Lista de exercícios ----------

  protected abrirSeletor(): void {
    this.seletorAberto.set(true);
  }

  protected fecharSeletor(): void {
    this.seletorAberto.set(false);
    this.exercicios.markAsTouched();
  }

  @HostListener('document:keydown.escape')
  protected aoCarregarEscape(): void {
    if (this.seletorAberto()) {
      this.fecharSeletor();
    }
  }

  // A ListaExercicios emitiu "escolher": o exercício entra na ficha com 3 × 10
  protected adicionarExercicio(exercicio: Exercicio): void {
    this.exercicios.push(
      this.criarGrupo({ exercicioId: exercicio.id, nome: exercicio.nome, grupo: exercicio.grupo, series: 3, repeticoes: 10 }),
    );
    this.atualizarIdsEscolhidos();
  }

  protected remover(indice: number): void {
    this.exercicios.removeAt(indice);
    this.exercicios.markAsTouched();
    this.atualizarIdsEscolhidos();
  }

  // Sobe (-1) ou desce (+1) um exercício na ordem da ficha
  protected mover(indice: number, direcao: -1 | 1): void {
    const grupo = this.exercicios.at(indice);
    this.exercicios.removeAt(indice);
    this.exercicios.insert(indice + direcao, grupo);
  }

  // ---------- Guardar ----------

  protected guardar(): void {
    // Segurança extra: o botão já fica desativado, mas nunca se guarda um formulário inválido
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valor = this.formulario.getRawValue();
    const dados: DadosFicha = {
      nome: valor.nome.trim(),
      tipo: valor.tipo as TipoFicha,             // garantido pelo Validators.required
      exercicios: valor.exercicios.map((e) => ({
        exercicioId: e.exercicioId,
        nome: e.nome,
        grupo: e.grupo,
        series: Number(e.series),
        repeticoes: Number(e.repeticoes),
      })),
    };

    if (this.idEmEdicao) {
      this.fichaService.atualizar(this.idEmEdicao, dados);
    } else {
      this.fichaService.criar(dados);
    }
    this.router.navigate(['/fichas']);
  }

  // ---------- Auxiliares ----------

  private criarGrupo(exercicio: ExercicioNaFicha): GrupoExercicio {
    return new FormGroup({
      exercicioId: new FormControl(exercicio.exercicioId, { nonNullable: true }),
      nome: new FormControl(exercicio.nome, { nonNullable: true }),
      grupo: new FormControl(exercicio.grupo, { nonNullable: true }),
      series: new FormControl<number | null>(exercicio.series, [
        Validators.required, Validators.min(1), Validators.max(10), inteiro,
      ]),
      repeticoes: new FormControl<number | null>(exercicio.repeticoes, [
        Validators.required, Validators.min(1), Validators.max(50), inteiro,
      ]),
    });
  }

  private atualizarIdsEscolhidos(): void {
    this.idsEscolhidos.set(this.exercicios.controls.map((grupo) => grupo.controls.exercicioId.value));
  }
}
