import { Component, OnDestroy, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartaoAuth } from '../../componentes/cartao-auth/cartao-auth';
import { AuthService } from '../../servicos/auth-service';

// Entrar com email e palavra-passe (formulário reativo).
@Component({
  imports: [ReactiveFormsModule, RouterLink, CartaoAuth],
  selector: 'app-entrar',
  templateUrl: './entrar.html',
})
export class Entrar implements OnDestroy {
  protected readonly formulario = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    palavraPasse: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly aEnviar = signal(false);
  protected readonly erro = signal('');            // a mensagem do Supabase, já em português
  protected readonly mostrarPalavraPasse = signal(false);

  private pedido?: Subscription;

  constructor(
    private auth: AuthService,
    private router: Router,
    private rota: ActivatedRoute,
  ) {}

  // OnDestroy: se a pessoa sair da página a meio do pedido, deixa de esperar pela resposta
  ngOnDestroy(): void {
    this.pedido?.unsubscribe();
  }

  // O erro de um campo só aparece depois de a pessoa sair dele (touched)
  protected mostrarErro(campo: AbstractControl): boolean {
    return campo.invalid && campo.touched;
  }

  protected entrar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { email, palavraPasse } = this.formulario.getRawValue();
    this.aEnviar.set(true);
    this.erro.set('');
    this.pedido = this.auth.entrar(email.trim(), palavraPasse).subscribe({
      // volta à página que a pessoa tinha pedido (o sessaoGuard guardou-a em ?voltar=), ou ao Início
      next: () => {
        const voltar = this.rota.snapshot.queryParamMap.get('voltar');
        this.router.navigateByUrl(voltar?.startsWith('/') ? voltar : '/');
      },
      error: (erro: Error) => {
        this.erro.set(erro.message);
        this.aEnviar.set(false);
      },
    });
  }
}
