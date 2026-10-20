import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TemaService } from '../../servicos/tema-service';

@Component({
  imports: [RouterLink],
  selector: 'app-cabecalho',
  styleUrl: './cabecalho.css',
  templateUrl: './cabecalho.html',
})
export class Cabecalho {
  // pai -> filho: o App diz se o menu está aberto (para o leitor de ecrã)
  @Input() menuAberto = false;

  // filho -> pai: avisa o App de que o botão das 3 listras foi carregado
  @Output() abrirMenu = new EventEmitter<void>();

  // Injeção de dependências: o Angular entrega a instância do TemaService
  constructor(protected temaService: TemaService) {}
}
