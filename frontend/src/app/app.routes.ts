import { Routes } from '@angular/router';
import { sessaoGuard } from './guards/sessao-guard';
import { visitanteGuard } from './guards/visitante-guard';
import { Entrar } from './paginas/entrar/entrar';
import { Exercicios } from './paginas/exercicios/exercicios';
import { FichaForm } from './paginas/ficha-form/ficha-form';
import { Fichas } from './paginas/fichas/fichas';
import { Historico } from './paginas/historico/historico';
import { Inicio } from './paginas/inicio/inicio';
import { NovaPalavraPasse } from './paginas/nova-palavra-passe/nova-palavra-passe';
import { RecuperarPalavraPasse } from './paginas/recuperar-palavra-passe/recuperar-palavra-passe';
import { Registar } from './paginas/registar/registar';
import { Treino } from './paginas/treino/treino';

// Cada rota liga um endereço a uma página; "title" muda o título do separador
export const routes: Routes = [
  // Sem sessão: entrar e criar conta (quem já tem sessão vai para o Início)
  { path: 'entrar', component: Entrar, canActivate: [visitanteGuard], title: 'Entrar · RepLog' },
  { path: 'registar', component: Registar, canActivate: [visitanteGuard], title: 'Criar conta · RepLog' },
  { path: 'recuperar-palavra-passe', component: RecuperarPalavraPasse, title: 'Recuperar a palavra-passe · RepLog' },

  // Com sessão: o resto da app. O sessaoGuard corre antes de cada uma destas páginas
  // e, sem sessão, manda para "entrar".
  {
    path: '',
    canActivateChild: [sessaoGuard],
    children: [
      { path: '', component: Inicio, title: 'RepLog — Diário de Treinos' },
      { path: 'fichas', component: Fichas, title: 'Fichas de treino · RepLog' },
      { path: 'fichas/nova', component: FichaForm, title: 'Nova ficha · RepLog' },
      { path: 'fichas/:id/editar', component: FichaForm, title: 'Editar ficha · RepLog' },
      { path: 'treino/:fichaId', component: Treino, title: 'Treino em curso · RepLog' },
      { path: 'historico', component: Historico, title: 'Histórico · RepLog' },
      { path: 'exercicios', component: Exercicios, title: 'Exercícios · RepLog' },
      { path: 'nova-palavra-passe', component: NovaPalavraPasse, title: 'Palavra-passe nova · RepLog' },
    ],
  },

  { path: '**', redirectTo: '' }, // endereço desconhecido: volta ao Início (ou a "entrar")
];
