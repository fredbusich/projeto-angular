import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { IndicePesquisa, PesquisaApi } from '../utils/pesquisa';
import { ArmazenamentoService } from './armazenamento-service';

export type Idioma = 'pt' | 'en';

// Língua dos nomes dos exercícios. Os nomes guardam-se sempre em inglês (como vêm da API)
// e só são traduzidos na altura de os mostrar, por isso mudar de língua muda-os em todo o lado.
// As traduções também servem para pesquisar em português.
@Injectable({ providedIn: 'root' })
export class TraducaoService {
  private readonly chave = 'idioma';
  private nomesPt: Record<string, string> = {};
  private indice = new IndicePesquisa({});

  // signal: quem o lê no ecrã é atualizado sozinho quando a língua muda
  readonly idioma = signal<Idioma>('pt');

  constructor(
    private http: HttpClient,
    private armazenamento: ArmazenamentoService,
  ) {
    if (this.armazenamento.ler<Idioma>(this.chave, 'pt') === 'en') {
      this.idioma.set('en');
    }
  }

  // Carrega as traduções (ficheiro em public/dados). É chamado uma vez, no arranque da app.
  // Se falhar, a app funciona na mesma, só que com os nomes em inglês.
  carregar(): Observable<void> {
    return this.http.get<Record<string, string>>('dados/nomes-exercicios-pt.json').pipe(
      map((nomes) => {
        this.nomesPt = nomes;
        this.indice = new IndicePesquisa(nomes);
      }),
      catchError(() => of(undefined)),
    );
  }

  alternar(): void {
    const novo: Idioma = this.idioma() === 'pt' ? 'en' : 'pt';
    this.idioma.set(novo);
    this.armazenamento.guardar(this.chave, novo);
  }

  // Nome de um exercício na língua escolhida
  nome(nomeIngles: string): string {
    return this.idioma() === 'en' ? nomeIngles : this.emPortugues(nomeIngles);
  }

  emPortugues(nomeIngles: string): string {
    return this.nomesPt[nomeIngles.trim().toLowerCase()] ?? nomeIngles;
  }

  // Passa a pesquisa (em português ou em inglês) para o que a API entende
  prepararPesquisa(texto: string): PesquisaApi {
    return this.indice.preparar(texto);
  }
}
