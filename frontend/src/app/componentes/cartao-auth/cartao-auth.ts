import { Component, Input } from '@angular/core';

// O cartão das páginas sem sessão (entrar, criar conta, recuperar a palavra-passe): logótipo,
// título e o conteúdo de cada página, que entra no <ng-content> ("content projection").
//   <app-cartao-auth titulo="Entrar" subtitulo="…"> …formulário… </app-cartao-auth>
@Component({
  selector: 'app-cartao-auth',
  styleUrl: './cartao-auth.css',
  templateUrl: './cartao-auth.html',
})
export class CartaoAuth {
  // pai -> filho
  @Input({ required: true }) titulo!: string;
  @Input() subtitulo = '';
}
