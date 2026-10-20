import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface ItemMenu {
  rotulo: string;
  rota: string;
  icone: string;   // desenho do ícone (atributo "d" do <path> do SVG)
  exato: boolean;  // true: só fica ativo na rota exata (o Início é "/")
}

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-menu-lateral',
  styleUrl: './menu-lateral.css',
  templateUrl: './menu-lateral.html',
})
export class MenuLateral {
  // pai -> filho: o App diz se o menu está aberto
  @Input() aberto = false;

  // filho -> pai: pede ao App para fechar o menu
  @Output() fechar = new EventEmitter<void>();

  protected readonly itens: ItemMenu[] = [
    { rotulo: 'Início', rota: '/', exato: true, icone: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
    { rotulo: 'Fichas de treino', rota: '/fichas', exato: false, icone: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
    { rotulo: 'Histórico', rota: '/historico', exato: false, icone: 'M12 7v5l3 2M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0' },
    { rotulo: 'Exercícios', rota: '/exercicios', exato: false, icone: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12' },
  ];

  // A tecla Esc também fecha o menu
  @HostListener('document:keydown.escape')
  aoCarregarEscape(): void {
    if (this.aberto) {
      this.fechar.emit();
    }
  }
}
