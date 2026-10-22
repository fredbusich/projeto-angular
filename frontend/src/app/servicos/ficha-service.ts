import { Injectable, effect, signal, untracked } from '@angular/core';
import { Observable, concatMap, from, map, toArray } from 'rxjs';
import { Tables } from '../modelos/base-de-dados';
import { GrupoMuscular } from '../modelos/exercicio';
import { DadosFicha, Ficha, TipoFicha } from '../modelos/ficha';
import { FICHAS_EXEMPLO } from '../modelos/fichas-exemplo';
import { ArmazenamentoService } from './armazenamento-service';
import { AuthService } from './auth-service';
import { EstadoDados, SupabaseService } from './supabase-service';

// Uma linha de "fichas" com os seus exercícios, como vem do select('*, ficha_exercicios(*)')
type LinhaFicha = Tables<'fichas'> & { ficha_exercicios: Tables<'ficha_exercicios'>[] };

// Criar, ler, editar e apagar fichas de treino, nas tabelas fichas e ficha_exercicios do Supabase.
// As fichas carregam-se ao entrar e esvaziam-se ao sair. Depois de cada gravação, o signal é
// atualizado aqui mesmo, sem ir buscar a lista toda outra vez.
//
// Sem rede (no ginásio): fica uma cópia da lista no aparelho, que aparece logo ao abrir a app
// e é atualizada quando a base de dados responde. Ao sair da conta, a cópia sai do aparelho.
@Injectable({ providedIn: 'root' })
export class FichaService {
  private readonly lista = signal<Ficha[]>([]);
  private readonly estadoCarga = signal<EstadoDados>('a-carregar');
  private readonly soCopia = signal(false);

  // Os componentes leem estas versões "só de leitura"; só o service as muda
  readonly fichas = this.lista.asReadonly();
  readonly estado = this.estadoCarga.asReadonly();
  // true: a base de dados não respondeu e a lista é a cópia do aparelho
  readonly semLigacao = this.soCopia.asReadonly();

  private idUtilizador: string | null = null;

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService,
    private armazenamento: ArmazenamentoService,
  ) {
    // effect: corre agora e sempre que muda quem tem a sessão (entrar, sair, outra conta)
    effect(() => {
      const id = this.auth.idUtilizador();
      untracked(() => this.mudarDeUtilizador(id));
    });
    // Quando a rede volta, troca a cópia pela lista da base de dados
    window.addEventListener('online', () => {
      if (this.soCopia()) {
        this.carregar();
      }
    });
  }

  // Também é chamado pelo botão "Tentar outra vez" das páginas
  carregar(): void {
    const id = this.idUtilizador;
    if (!id) {
      return;
    }
    // Com a cópia do aparelho no ecrã, não volta a "a carregar": a lista atualiza-se quando chegar
    if (this.estadoCarga() !== 'pronto') {
      this.estadoCarga.set('a-carregar');
    }
    // Um só pedido traz as fichas e os exercícios de cada uma (as tabelas estão ligadas pela ficha_id).
    // O RLS já só deixa ver as fichas de quem pediu; o .eq() ajuda a base de dados a usar o índice.
    const consulta = this.supabase.cliente
      .from('fichas')
      .select('*, ficha_exercicios(*)')
      .eq('user_id', id)
      .order('criada_em')
      .order('ordem', { referencedTable: 'ficha_exercicios' });

    this.supabase.pedido(consulta).subscribe({
      next: (linhas) => {
        if (id === this.idUtilizador) { // entretanto pode ter entrado outra conta
          this.definirLista(linhas.map(fichaDaBaseDeDados));
          this.estadoCarga.set('pronto');
          this.soCopia.set(false);
        }
      },
      error: () => {
        if (id !== this.idUtilizador) {
          return;
        }
        // Havia cópia: continua a aparecer, com o aviso "sem ligação". Não havia: mostra o erro.
        if (this.estadoCarga() === 'pronto') {
          this.soCopia.set(true);
        } else {
          this.estadoCarga.set('erro');
        }
      },
    });
  }

  obter(id: string): Ficha | undefined {
    return this.lista().find((ficha) => ficha.id === id);
  }

  criar(dados: DadosFicha): Observable<Ficha> {
    return this.guardar(null, dados).pipe(
      map((id) => {
        const ficha: Ficha = { ...dados, id, criadaEm: new Date().toISOString() };
        this.definirLista([...this.lista(), ficha]);
        return ficha;
      }),
    );
  }

  atualizar(id: string, dados: DadosFicha): Observable<void> {
    return this.guardar(id, dados).pipe(
      map(() => {
        this.definirLista(this.lista().map((ficha) => (ficha.id === id ? { ...ficha, ...dados } : ficha)));
      }),
    );
  }

  // Os exercícios da ficha vão com ela (on delete cascade); os treinos ficam no histórico, sem ficha
  apagar(id: string): Observable<void> {
    const consulta = this.supabase.cliente.from('fichas').delete().eq('id', id);
    return this.supabase.pedido(consulta).pipe(
      map(() => {
        this.definirLista(this.lista().filter((ficha) => ficha.id !== id));
      }),
    );
  }

  // Cria as fichas Push, Pull e Legs de exemplo, uma de cada vez (concatMap), para ficarem por esta ordem
  criarExemplos(): Observable<void> {
    return from(FICHAS_EXEMPLO).pipe(
      concatMap((dados) => this.criar(dados)),
      toArray(), // espera pelas três
      map(() => undefined),
    );
  }

  // A função guardar_ficha grava a ficha e os exercícios numa só transação e devolve o id.
  // id null = ficha nova (o SQL aceita null; os tipos gerados não sabem disso, daí o "as string").
  private guardar(id: string | null, dados: DadosFicha): Observable<string> {
    const consulta = this.supabase.cliente.rpc('guardar_ficha', {
      p_id: id as string,
      p_nome: dados.nome,
      p_tipo: dados.tipo,
      p_exercicios: dados.exercicios.map((exercicio) => ({ ...exercicio })),
    });
    return this.supabase.pedido(consulta);
  }

  // Entrou outra pessoa (ou saiu). A cópia guardada da última vez aparece logo (também sem
  // rede) e a base de dados atualiza-a a seguir. A cópia de quem saiu sai do aparelho.
  private mudarDeUtilizador(id: string | null): void {
    if (this.idUtilizador && this.idUtilizador !== id) {
      this.armazenamento.apagar(`fichas-${this.idUtilizador}`);
    }
    this.idUtilizador = id;
    this.soCopia.set(false);
    const copia = id ? this.armazenamento.ler<Ficha[] | null>(`fichas-${id}`, null) : null;
    this.lista.set(copia ?? []);
    this.estadoCarga.set(copia ? 'pronto' : 'a-carregar');
    this.carregar();
  }

  // Muda a lista e a cópia no aparelho
  private definirLista(fichas: Ficha[]): void {
    this.lista.set(fichas);
    if (this.idUtilizador) {
      this.armazenamento.guardar(`fichas-${this.idUtilizador}`, fichas);
    }
  }
}

// Da base de dados (snake_case, tabelas separadas) para o modelo da app (camelCase, tudo junto)
function fichaDaBaseDeDados(linha: LinhaFicha): Ficha {
  return {
    id: linha.id,
    nome: linha.nome,
    tipo: linha.tipo as TipoFicha, // o "check" da tabela só aceita os tipos da app
    criadaEm: linha.criada_em,
    exercicios: linha.ficha_exercicios.map((exercicio) => ({
      exercicioId: exercicio.exercicio_id,
      nome: exercicio.nome,
      grupo: exercicio.grupo as GrupoMuscular,
      series: exercicio.series,
      repeticoes: exercicio.repeticoes,
    })),
  };
}
