import { Routes } from '@angular/router';
import { Exercicios } from './paginas/exercicios/exercicios';
import { FichaForm } from './paginas/ficha-form/ficha-form';
import { Fichas } from './paginas/fichas/fichas';
import { Historico } from './paginas/historico/historico';
import { Inicio } from './paginas/inicio/inicio';
import { Treino } from './paginas/treino/treino';

// Cada rota liga um endereço a uma página; "title" muda o título do separador
export const routes: Routes = [
  { path: '', component: Inicio, title: 'RepLog — Diário de Treinos' },
  { path: 'fichas', component: Fichas, title: 'Fichas de treino · RepLog' },
  { path: 'fichas/nova', component: FichaForm, title: 'Nova ficha · RepLog' },
  { path: 'fichas/:id/editar', component: FichaForm, title: 'Editar ficha · RepLog' },
  { path: 'treino/:fichaId', component: Treino, title: 'Treino em curso · RepLog' },
  { path: 'historico', component: Historico, title: 'Histórico · RepLog' },
  { path: 'exercicios', component: Exercicios, title: 'Exercícios · RepLog' },
  { path: '**', redirectTo: '' }, // endereço desconhecido: volta ao Início
];
