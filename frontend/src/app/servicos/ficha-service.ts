import { Injectable, signal } from '@angular/core';
import { DadosFicha, Ficha } from '../modelos/ficha';
import { gerarId } from '../utils/gerar-id';
import { ArmazenamentoService } from './armazenamento-service';

// Criar, ler, editar e apagar fichas de treino.
@Injectable({ providedIn: 'root' })
export class FichaService {
  private readonly chave = 'fichas';
  private readonly lista = signal<Ficha[]>([]);

  // Os componentes leem esta versão "só de leitura"; só o service muda a lista
  readonly fichas = this.lista.asReadonly();

  constructor(private armazenamento: ArmazenamentoService) {
    this.lista.set(this.armazenamento.ler<Ficha[]>(this.chave, []));
  }

  obter(id: string): Ficha | undefined {
    return this.lista().find((ficha) => ficha.id === id);
  }

  criar(dados: DadosFicha): Ficha {
    const ficha: Ficha = { ...dados, id: gerarId(), criadaEm: new Date().toISOString() };
    this.gravar([...this.lista(), ficha]);
    return ficha;
  }

  atualizar(id: string, dados: DadosFicha): void {
    this.gravar(this.lista().map((ficha) => (ficha.id === id ? { ...ficha, ...dados } : ficha)));
  }

  apagar(id: string): void {
    this.gravar(this.lista().filter((ficha) => ficha.id !== id));
  }

  private gravar(fichas: Ficha[]): void {
    this.lista.set(fichas);
    this.armazenamento.guardar(this.chave, fichas);
  }
}
