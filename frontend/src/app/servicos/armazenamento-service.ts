import { Injectable } from '@angular/core';

// Guarda e lê dados no localStorage do navegador: o que é só deste aparelho (o tema, a língua,
// o treino em curso e os treinos por enviar). As fichas e o histórico estão na base de dados.
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
