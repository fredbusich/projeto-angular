import { Component, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TemaService } from '../../servicos/tema-service';
import { TraducaoService } from '../../servicos/traducao-service';

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

  // Sem rede, a app continua a funcionar com o que ficou guardado (service worker); o aviso diz isso
  protected readonly semRede = signal(!navigator.onLine);

  @HostListener('window:online')
  @HostListener('window:offline')
  protected aoMudarRede(): void {
    this.semRede.set(!navigator.onLine);
  }

  // Injeção de dependências: o Angular entrega as instâncias dos services
  constructor(
    protected temaService: TemaService,
    protected traducao: TraducaoService,
  ) {}
}
