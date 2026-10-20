import { Directive, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';

// Diretiva para os painéis (confirmar, escolher ficha, escolher exercícios…).
// Usa-se assim: <section class="painel" appPainel …>
//  - ao abrir: o foco do teclado passa para o painel e a página por trás deixa de deslizar;
//  - com o Tab, o foco fica preso dentro do painel;
//  - ao fechar: a página volta a deslizar e o foco regressa ao botão que abriu o painel.
@Directive({
  selector: '[appPainel]',
  host: { tabindex: '-1' }, // permite pôr o foco no próprio painel
})
export class Painel implements OnInit, OnDestroy {
  private focoAnterior: HTMLElement | null = null;

  constructor(private elemento: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    this.elemento.nativeElement.focus();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    this.focoAnterior?.focus();
  }

  // Tab no último elemento volta ao primeiro (e Shift+Tab no primeiro vai para o último)
  @HostListener('keydown', ['$event'])
  protected aoCarregarTecla(evento: KeyboardEvent): void {
    if (evento.key !== 'Tab') {
      return;
    }
    const focaveis = this.focaveis();
    if (focaveis.length === 0) {
      return;
    }
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    const atual = document.activeElement;
    if (evento.shiftKey && (atual === primeiro || atual === this.elemento.nativeElement)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && atual === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  }

  private focaveis(): HTMLElement[] {
    const seletor = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex="0"]';
    return Array.from(this.elemento.nativeElement.querySelectorAll<HTMLElement>(seletor));
  }
}
