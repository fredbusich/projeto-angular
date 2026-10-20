import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, computed, signal } from '@angular/core';
import { DuracaoPipe } from '../../pipes/duracao-pipe';

// Contagem decrescente do descanso entre séries.
@Component({
  imports: [DuracaoPipe],
  selector: 'app-temporizador-descanso',
  styleUrl: './temporizador-descanso.css',
  templateUrl: './temporizador-descanso.html',
})
export class TemporizadorDescanso implements OnChanges, OnInit, OnDestroy {
  // pai -> filho
  @Input({ required: true }) inicio!: number; // Date.now() do momento em que a série foi marcada
  @Input() duracao = 90;                      // segundos de descanso

  // filho -> pai: o descanso acabou (ou foi saltado)
  @Output() terminou = new EventEmitter<void>();

  protected readonly total = signal(90);      // duração com os ajustes de ±15 s
  protected readonly restante = signal(90);
  protected readonly percentagem = computed(() => (this.restante() / this.total()) * 100);

  private intervalo?: ReturnType<typeof setInterval>;
  private acabou = false;

  // OnChanges: corre quando um @Input muda (marcou-se outra série): o descanso recomeça
  ngOnChanges(): void {
    this.total.set(this.duracao);
    this.acabou = false;
    this.atualizar();
  }

  // OnInit: começa a contar. As contas usam a hora de início e não "menos 1 por segundo",
  // porque com o ecrã do telemóvel desligado o setInterval pode ficar parado.
  ngOnInit(): void {
    this.intervalo = setInterval(() => this.atualizar(), 250);
  }

  // OnDestroy: quando o temporizador sai do ecrã, o setInterval tem de parar.
  // Sem isto, continuaria a correr em segundo plano para sempre.
  ngOnDestroy(): void {
    clearInterval(this.intervalo);
  }

  protected ajustar(segundos: number): void {
    this.total.update((total) => Math.max(5, total + segundos));
    this.atualizar();
  }

  protected saltar(): void {
    this.acabou = true;
    this.terminou.emit();
  }

  private atualizar(): void {
    const passados = (Date.now() - this.inicio) / 1000;
    const falta = Math.max(0, Math.ceil(this.total() - passados));
    this.restante.set(falta);
    if (falta === 0 && !this.acabou) {
      this.acabou = true;
      // O telemóvel vibra. O navegador só deixa depois de o utilizador ter tocado na página.
      if (navigator.userActivation?.hasBeenActive) {
        navigator.vibrate?.(300);
      }
      this.terminou.emit();
    }
  }
}
