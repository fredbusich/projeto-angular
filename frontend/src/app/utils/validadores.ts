import { AbstractControl, ValidationErrors } from '@angular/forms';

// Validadores feitos por nós, para juntar aos do Angular (Validators.required, minLength…).
// Um validador recebe o campo e devolve null (está tudo bem) ou um objeto com o erro.

// Erro "soEspacos": o Validators.required aceitaria "   " como preenchido
export function naoSoEspacos(campo: AbstractControl): ValidationErrors | null {
  const valor = campo.value;
  return typeof valor === 'string' && valor.length > 0 && valor.trim() === '' ? { soEspacos: true } : null;
}

// Erro "inteiro": não faz sentido fazer 2,5 séries
export function inteiro(campo: AbstractControl): ValidationErrors | null {
  const valor = campo.value;
  if (valor === null || valor === '') {
    return null; // campo vazio: quem trata disso é o Validators.required
  }
  return Number.isInteger(Number(valor)) ? null : { inteiro: true };
}
