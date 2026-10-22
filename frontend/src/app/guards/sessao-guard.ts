import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from '../servicos/auth-service';

// Guard das páginas da app: só entra quem tem sessão iniciada.
// Sem sessão, vai para "entrar" e leva o endereço pedido em ?voltar=, para lá regressar depois.
// Corre antes de cada navegação para uma página filha (canActivateChild, em app.routes.ts).
export const sessaoGuard: CanActivateChildFn = (_rota, estado) => {
  const auth = inject(AuthService);
  if (auth.autenticado()) {
    return true;
  }
  return inject(Router).createUrlTree(['/entrar'], { queryParams: { voltar: estado.url } });
};
