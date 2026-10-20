import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import localePt from '@angular/common/locales/pt-PT';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

// Regras de Portugal para os pipes: datas em português, "82,5" com vírgula, "1 250" com espaço
registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Regista o HttpClient na injeção de dependências (para o ExercicioService o poder receber)
    provideHttpClient(),
    { provide: LOCALE_ID, useValue: 'pt-PT' },
  ]
};
