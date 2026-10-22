import { Component, OnDestroy, Signal, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../servicos/auth-service';
import { palavrasPasseIguais } from '../../utils/validadores';

// Escolher uma palavra-passe nova. Abre a partir do link do email de recuperação (o link já
// inicia a sessão) e também serve para mudar a palavra-passe com a sessão iniciada.
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-nova-palavra-passe',
  styleUrl: './nova-palavra-passe.css',
  templateUrl: './nova-palavra-passe.html',
})
export class NovaPalavraPasse implements OnDestroy {
  protected readonly minimo = 8;

  protected readonly formulario = new FormGroup(
    {
      palavraPasse: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(this.minimo)] }),
      repetir: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: palavrasPasseIguais },
  );

  protected readonly aEnviar = signal(false);
  protected readonly erro = signal('');
  protected readonly mudada = signal(false);
  protected readonly mostrarPalavraPasse = signal(false);
  // true quando se chegou pelo link do email
  protected readonly emRecuperacao: Signal<boolean>;

  private pedido?: Subscription;

  constructor(private auth: AuthService) {
    this.emRecuperacao = this.auth.emRecuperacao;
  }

  ngOnDestroy(): void {
    this.pedido?.unsubscribe();
  }

  protected mostrarErro(campo: AbstractControl): boolean {
    return campo.invalid && campo.touched;
  }

  protected get diferentes(): boolean {
    return this.formulario.hasError('diferentes') && this.formulario.controls.repetir.touched;
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.aEnviar.set(true);
    this.erro.set('');
    this.pedido = this.auth.mudarPalavraPasse(this.formulario.controls.palavraPasse.value).subscribe({
      next: () => this.mudada.set(true),
      error: (erro: Error) => {
        this.erro.set(erro.message);
        this.aEnviar.set(false);
      },
    });
  }
}
