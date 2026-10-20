import { Injectable } from '@angular/core';

// Guarda e lê dados no localStorage do navegador.
// Na fase 2, quando houver base de dados, é aqui (e nos services que o usam) que se muda.
@Injectable({ providedIn: 'root' })
export class ArmazenamentoService {
  private readonly prefixo = 'replog-';

  // Generic <T>: o mesmo método lê fichas, treinos, o tema…
  // Se não houver nada guardado (ou estiver estragado), devolve o valor por omissão.
  ler<T>(chave: string, valorPorOmissao: T): T {
    try {
      const texto = localStorage.getItem(this.prefixo + chave);
      return texto === null ? valorPorOmissao : (JSON.parse(texto) as T);
    } catch {
      return valorPorOmissao;
    }
  }

  guardar<T>(chave: string, valor: T): void {
    try {
      localStorage.setItem(this.prefixo + chave, JSON.stringify(valor));
    } catch {
      // localStorage cheio ou bloqueado (ex.: navegação privada): os dados só não ficam guardados
    }
  }

  apagar(chave: string): void {
    try {
      localStorage.removeItem(this.prefixo + chave);
    } catch {
      // nada a fazer
    }
  }
}
