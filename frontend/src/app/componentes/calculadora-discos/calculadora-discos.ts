import { DecimalPipe } from '@angular/common';
import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { montarBarra } from '../../utils/discos';

// Calculadora de discos: escreve-se a carga total e mostra os discos de cada lado da barra.
@Component({
  imports: [DecimalPipe],
  selector: 'app-calculadora-discos',
  styleUrl: './calculadora-discos.css',
  templateUrl: './calculadora-discos.html',
})
export class CalculadoraDiscos implements OnInit {
  // pai -> filho: os valores com que abre (a carga da próxima série e a barra do exercício)
  @Input() carga = 0;
  @Input() barra = 20;

  protected readonly barras = [20, 15, 10, 0]; // olímpica, curta, barra W, sem barra (máquina)

  protected readonly total = signal(0);
  protected readonly pesoBarra = signal(20);
  // computed: recalcula sozinho quando muda a carga ou a barra
  protected readonly montagem = computed(() => montarBarra(this.total(), this.pesoBarra()));

  // OnInit: os @Input já chegaram; passam para os signals, que depois mudam com o utilizador
  ngOnInit(): void {
    this.total.set(this.carga);
    this.pesoBarra.set(this.barra);
  }

  // "82,5" ou "82.5"; um valor inválido conta como 0
  protected mudarTotal(evento: Event): void {
    const valor = Number((evento.target as HTMLInputElement).value.trim().replace(',', '.'));
    this.total.set(Number.isFinite(valor) && valor > 0 ? valor : 0);
  }

  // A carga que dá mesmo para fazer com estes discos (quando a conta não é certa)
  protected get cargaPossivel(): number {
    return this.total() - this.montagem().falta;
  }

  protected get cargaTexto(): string {
    return this.carga > 0 ? String(this.carga).replace('.', ',') : '';
  }
}
