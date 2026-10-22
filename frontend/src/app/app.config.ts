import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import localePt from '@angular/common/locales/pt-PT';
import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { AuthService } from './servicos/auth-service';
import { TraducaoService } from './servicos/traducao-service';

// Regras de Portugal para os pipes: datas em português, "82,5" com vírgula, "1 250" com espaço
registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Regista o HttpClient na injeção de dependências (para os services o poderem receber)
    provideHttpClient(),
    { provide: LOCALE_ID, useValue: 'pt-PT' },
    // Antes de a app aparecer, carrega as traduções dos nomes dos exercícios
    provideAppInitializer(() => inject(TraducaoService).carregar()),
    // e lê a sessão guardada (se a pessoa já tinha entrado), para os guards saberem quem é
    provideAppInitializer(() => inject(AuthService).carregar()),
    // Service worker: guarda a app, os exercícios e as imagens para funcionar sem rede no ginásio
    // (ver ngsw-config.json). Só funciona na versão publicada (ng build), não no ng serve.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ]
};
