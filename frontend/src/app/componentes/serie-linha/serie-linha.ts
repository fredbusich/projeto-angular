import { DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Serie } from '../../modelos/treino';

// Uma linha da tabela do treino: nº da série, o que se fez da última vez, kg, reps e o ✓.
@Component({
  imports: [DecimalPipe],
  selector: 'app-serie-linha',
  styleUrl: './serie-linha.css',
  templateUrl: './serie-linha.html',
})
export class SerieLinha {
  // pai -> filho
  @Input({ required: true }) serie!: Serie;
  @Input() anterior?: Serie;      // a mesma série no último treino (pode não existir)
  @Input() atual = false;         // true na próxima série a fazer (fica destacada)
  @Input() recorde = false;       // true se esta série passou o recorde do exercício (mostra um troféu)

  // filho -> pai
  @Output() alterada = new EventEmitter<Serie>();   // mudou a carga ou as repetições
  @Output() alternarFeita = new EventEmitter<void>(); // carregou no ✓

  // "82,5" (vírgula, como em Portugal); vazio quando ainda é 0, para se ver a dica
  protected get cargaTexto(): string {
    return this.serie.carga === 0 ? '' : String(this.serie.carga).replace('.', ',');
  }

  // (change) corre quando se sai do campo: lê o texto, valida e avisa o pai
  protected mudarCarga(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const texto = campo.value.trim().replace(',', '.');
    const carga = texto === '' ? 0 : Number(texto);
    if (Number.isNaN(carga) || carga < 0 || carga > 999) {
      campo.value = this.cargaTexto; // valor inválido: volta ao que estava
      return;
    }
    this.alterada.emit({ ...this.serie, carga: Math.round(carga * 100) / 100 });
  }

  protected mudarRepeticoes(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const repeticoes = Number(campo.value.trim());
    if (!Number.isInteger(repeticoes) || repeticoes < 0 || repeticoes > 100) {
      campo.value = String(this.serie.repeticoes);
      return;
    }
    this.alterada.emit({ ...this.serie, repeticoes });
  }
}
