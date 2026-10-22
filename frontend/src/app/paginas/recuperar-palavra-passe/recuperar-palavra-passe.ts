import { Component, OnDestroy, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartaoAuth } from '../../componentes/cartao-auth/cartao-auth';
import { AuthService } from '../../servicos/auth-service';

// Pedir o email com o link para escolher uma palavra-passe nova.
@Component({
  imports: [ReactiveFormsModule, RouterLink, CartaoAuth],
  selector: 'app-recuperar-palavra-passe',
  templateUrl: './recuperar-palavra-passe.html',
})
export class RecuperarPalavraPasse implements OnDestroy {
  protected readonly formulario = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  protected readonly aEnviar = signal(false);
  protected readonly erro = signal('');
  protected readonly enviado = signal(false);

  private pedido?: Subscription;

  constructor(private auth: AuthService) {}

  ngOnDestroy(): void {
    this.pedido?.unsubscribe();
  }

  protected mostrarErro(campo: AbstractControl): boolean {
    return campo.invalid && campo.touched;
  }

  // Atalho para o campo (usado no template)
  protected get email(): FormControl<string> {
    return this.formulario.controls.email;
  }

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.aEnviar.set(true);
    this.erro.set('');
    this.pedido = this.auth.pedirRecuperacao(this.email.value.trim()).subscribe({
      next: () => this.enviado.set(true),
      error: (erro: Error) => {
        this.erro.set(erro.message);
        this.aEnviar.set(false);
      },
    });
  }
}
