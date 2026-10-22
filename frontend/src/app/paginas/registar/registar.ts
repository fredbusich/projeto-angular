import { Component, OnDestroy, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartaoAuth } from '../../componentes/cartao-auth/cartao-auth';
import { AuthService } from '../../servicos/auth-service';
import { palavrasPasseIguais } from '../../utils/validadores';

// Criar conta (formulário reativo). O validador palavrasPasseIguais fica no FormGroup,
// porque compara dois campos.
@Component({
  imports: [ReactiveFormsModule, RouterLink, CartaoAuth],
  selector: 'app-registar',
  templateUrl: './registar.html',
})
export class Registar implements OnDestroy {
  protected readonly minimo = 8;

  protected readonly formulario = new FormGroup(
    {
      email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
      palavraPasse: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(this.minimo)] }),
      repetir: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: palavrasPasseIguais },
  );

  protected readonly aEnviar = signal(false);
  protected readonly erro = signal('');
  protected readonly mostrarPalavraPasse = signal(false);
  // Email para onde foi o link de confirmação (quando a conta precisa de ser confirmada)
  protected readonly confirmarEm = signal<string | null>(null);

  private pedido?: Subscription;

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnDestroy(): void {
    this.pedido?.unsubscribe();
  }

  protected mostrarErro(campo: AbstractControl): boolean {
    return campo.invalid && campo.touched;
  }

  // O erro "diferentes" é do grupo; só se mostra depois de se sair do campo "repetir"
  protected get diferentes(): boolean {
    return this.formulario.hasError('diferentes') && this.formulario.controls.repetir.touched;
  }

  protected registar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { email, palavraPasse } = this.formulario.getRawValue();
    this.aEnviar.set(true);
    this.erro.set('');
    this.pedido = this.auth.registar(email.trim(), palavraPasse).subscribe({
      next: ({ confirmarEmail }) => {
        if (confirmarEmail) {
          this.confirmarEm.set(email.trim()); // falta abrir o link do email
        } else {
          this.router.navigateByUrl('/'); // sem confirmação, a sessão já começou
        }
      },
      error: (erro: Error) => {
        this.erro.set(erro.message);
        this.aEnviar.set(false);
      },
    });
  }
}
