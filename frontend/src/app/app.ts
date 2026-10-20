import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Cabecalho } from './layout/cabecalho/cabecalho';
import { MenuLateral } from './layout/menu-lateral/menu-lateral';

@Component({
  imports: [RouterOutlet, Cabecalho, MenuLateral],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  // O App é o pai: guarda se o menu está aberto e passa essa informação aos filhos
  protected readonly menuAberto = signal(false);

  protected abrirMenu(): void {
    this.menuAberto.set(true);
  }

  protected fecharMenu(): void {
    this.menuAberto.set(false);
  }
}
