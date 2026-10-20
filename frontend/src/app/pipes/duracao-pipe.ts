import { Pipe, PipeTransform } from '@angular/core';

// Pipe nosso: transforma segundos num tempo fácil de ler.
//   {{ 84 | duracao }}            -> "1:24"
//   {{ 3725 | duracao }}          -> "1:02:05"
//   {{ 3480 | duracao: 'texto' }} -> "58 min"
//   {{ 3900 | duracao: 'texto' }} -> "1 h 5 min"
//   {{ 40 | duracao: 'texto' }}   -> "menos de 1 min"
@Pipe({ name: 'duracao' })
export class DuracaoPipe implements PipeTransform {
  transform(segundos: number | null | undefined, formato: 'relogio' | 'texto' = 'relogio'): string {
    const total = Math.max(0, Math.round(segundos ?? 0));
    const horas = Math.floor(total / 3600);
    const minutos = Math.floor((total % 3600) / 60);
    const resto = total % 60;

    if (formato === 'texto') {
      if (total < 60) {
        return 'menos de 1 min';
      }
      return horas > 0 ? `${horas} h ${minutos} min` : `${minutos} min`;
    }

    const doisDigitos = (n: number) => String(n).padStart(2, '0');
    return horas > 0
      ? `${horas}:${doisDigitos(minutos)}:${doisDigitos(resto)}`
      : `${minutos}:${doisDigitos(resto)}`;
  }
}
