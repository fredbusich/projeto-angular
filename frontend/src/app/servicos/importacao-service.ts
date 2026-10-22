import { Injectable, computed, signal } from '@angular/core';
import { Observable, concatMap, from, map, tap, toArray } from 'rxjs';
import { Ficha } from '../modelos/ficha';
import { TREINO_LIVRE, Treino } from '../modelos/treino';
import { ArmazenamentoService } from './armazenamento-service';
import { FichaService } from './ficha-service';
import { TreinoService } from './treino-service';

// Na fase 1, as fichas e os treinos ficavam só no localStorage do aparelho (chaves "fichas" e
// "treinos"). Este service passa-os para a conta de quem entrou:
// - as fichas com o FichaService, uma a uma, para saber o id novo de cada uma;
// - os treinos pela lista "por enviar" do TreinoService, com um id novo e o id da ficha nova.
// Cada ficha importada sai logo do aparelho: se a rede falhar a meio, ao tentar outra vez
// continua onde parou, sem duplicar fichas.
@Injectable({ providedIn: 'root' })
export class ImportacaoService {
  private readonly fichasAntigas = signal<Ficha[]>([]);
  private readonly treinosAntigos = signal<Treino[]>([]);
  private readonly ocultar = signal(false);

  readonly quantasFichas = computed(() => this.fichasAntigas().length);
  readonly quantosTreinos = computed(() => this.treinosAntigos().length);
  // O aviso do Início aparece se houver dados antigos e não se tiver carregado em "Agora não"
  readonly mostrarAviso = computed(() => !this.ocultar() && this.quantasFichas() + this.quantosTreinos() > 0);

  constructor(
    private armazenamento: ArmazenamentoService,
    private fichaService: FichaService,
    private treinoService: TreinoService,
  ) {
    this.fichasAntigas.set(this.armazenamento.ler<Ficha[]>('fichas', []));
    this.treinosAntigos.set(this.armazenamento.ler<Treino[]>('treinos', []));
  }

  // "Agora não": o aviso volta na próxima vez que se abrir a app
  agoraNao(): void {
    this.ocultar.set(true);
  }

  importar(): Observable<void> {
    // id antigo da ficha → id novo, guardado no aparelho por causa do "continua onde parou"
    const ids = this.armazenamento.ler<Record<string, string>>('fichas-importadas', {});

    return from(this.fichasAntigas()).pipe(
      concatMap((antiga) =>
        this.fichaService.criar({ nome: antiga.nome, tipo: antiga.tipo, exercicios: antiga.exercicios }).pipe(
          tap((nova) => {
            ids[antiga.id] = nova.id;
            this.armazenamento.guardar('fichas-importadas', ids);
            this.fichasAntigas.update((fichas) => fichas.filter((ficha) => ficha.id !== antiga.id));
            this.armazenamento.guardar('fichas', this.fichasAntigas());
          }),
        ),
      ),
      toArray(), // espera por todas as fichas (com zero fichas também emite, uma lista vazia)
      map(() => {
        const treinos = this.treinosAntigos().map((treino) => ({
          ...treino,
          id: crypto.randomUUID(),
          fichaId: ids[treino.fichaId] ?? TREINO_LIVRE,
        }));
        this.treinoService.adicionarPorEnviar(treinos);
        this.treinosAntigos.set([]);
        // Já está tudo na conta (os treinos na lista "por enviar" de quem entrou): sai do aparelho
        for (const chave of ['fichas', 'treinos', 'fichas-importadas', 'treino-em-curso']) {
          this.armazenamento.apagar(chave);
        }
      }),
    );
  }
}
