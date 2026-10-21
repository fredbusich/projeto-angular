import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable, expand, last, map, of, switchMap, tap } from 'rxjs';
import { Exercicio, GrupoMuscular, PaginaExercicios } from '../modelos/exercicio';
import { ExercicioExerciseDb, RespostaExercicio, RespostaExerciseDb } from '../modelos/exercisedb';
import { normalizar } from '../utils/normalizar';
import { PesquisaApi, palavrasDoMovimento, relevancia } from '../utils/pesquisa';
import { TraducaoService } from './traducao-service';

const URL_API = 'https://oss.exercisedb.dev/api/v1/exercises';
const POR_PAGINA = 25; // o máximo que a API devolve num pedido
// A API só aceita 10 pedidos em cada 10 segundos: uma pesquisa faz no máximo 3 de seguida
// (os seguintes ficam para o "Carregar mais")
const MAX_PAGINAS = 3;

// Na ExerciseDB as partes do corpo têm nomes em inglês; cada grupo da app junta uma ou mais
const PARTES_DO_CORPO: Record<GrupoMuscular, string[]> = {
  peito: ['chest'],
  costas: ['back'],
  pernas: ['upper legs'],
  gemeos: ['lower legs'],
  ombros: ['shoulders', 'neck'],
  bracos: ['upper arms', 'lower arms'],
  abdominais: ['waist'],
  cardio: ['cardio'],
};

// A ExerciseDB dá o equipamento em inglês; aqui fica o nome em português
const EQUIPAMENTOS: Record<string, string> = {
  'assisted': 'Assistido',
  'band': 'Elástico',
  'barbell': 'Barra',
  'body weight': 'Peso corporal',
  'bodyweight': 'Peso corporal',
  'bosu ball': 'Bosu',
  'cable': 'Polia',
  'dumbbell': 'Halteres',
  'elliptical machine': 'Elíptica',
  'ez barbell': 'Barra W',
  'ez bar': 'Barra W',
  'hammer': 'Martelo',
  'kettlebell': 'Kettlebell',
  'leverage machine': 'Máquina',
  'medicine ball': 'Bola medicinal',
  'olympic barbell': 'Barra olímpica',
  'resistance band': 'Elástico',
  'roller': 'Rolo',
  'rope': 'Corda',
  'ski ergometer': 'Ergómetro de ski',
  'sled machine': 'Prensa',
  'smith machine': 'Máquina Smith',
  'stability ball': 'Bola suíça',
  'stationary bike': 'Bicicleta',
  'stepmill machine': 'Máquina de escadas',
  'suspension trainer': 'TRX',
  'tennis ball': 'Bola de ténis',
  'tire': 'Pneu',
  'towel': 'Toalha',
  'trap bar': 'Barra hexagonal',
  'upper body ergometer': 'Ergómetro de braços',
  'weighted': 'Com peso',
  'wheel roller': 'Roda abdominal',
  'ab wheel': 'Roda abdominal',
};

export interface FiltroExercicios {
  grupo?: GrupoMuscular;
  pesquisa?: string;
  depois?: string; // marcador da página seguinte (vem na resposta anterior)
}

// Biblioteca de exercícios, vinda da API pública ExerciseDB por HTTP.
// Todos os exercícios têm uma animação (pessoa em branco, músculo trabalhado a vermelho).
@Injectable({ providedIn: 'root' })
export class ExercicioService {
  // Respostas já recebidas, por endereço: reabrir a lista ou repetir uma pesquisa não gasta pedidos à API
  private readonly respostas = new Map<string, unknown>();

  constructor(
    private http: HttpClient,
    private traducao: TraducaoService,
  ) {}

  // Devolve um Observable: o pedido só é feito quando alguém fizer subscribe()
  listar(filtro: FiltroExercicios = {}): Observable<PaginaExercicios> {
    // A pesquisa pode vir em português: passa para inglês e separa o equipamento
    const pesquisa = filtro.pesquisa?.trim() ? this.traducao.prepararPesquisa(filtro.pesquisa) : null;
    if (!pesquisa) {
      return this.pedirPagina(filtro, null, filtro.depois).pipe(
        // map (do RxJS): transforma a resposta da ExerciseDB no formato da nossa app
        map((resposta) => ({
          total: resposta.meta.total,
          proximo: this.marcadorSeguinte(resposta),
          exercicios: this.semRepetidos(resposta.data.map((e) => this.converter(e))),
        })),
      );
    }

    // Com pesquisa: a API é aproximada e junta muitos exercícios só parecidos ("remada unilateral" devolve 137,
    // a maioria sem as duas palavras). Por isso pedem-se páginas seguidas (expand) e ficam só os exercícios
    // com todas as palavras, até haver 25, acabarem as páginas ou se chegar a MAX_PAGINAS pedidos.
    const juntar = (resposta: RespostaExerciseDb<ExercicioExerciseDb>, anteriores: Exercicio[], pedidos: number) => ({
      resposta,
      pedidos,
      encontrados: [
        ...anteriores,
        ...resposta.data.map((e) => this.converter(e)).filter((e) => this.temTodasAsPalavras(e, pesquisa)),
      ],
    });
    return this.pedirPagina(filtro, pesquisa, filtro.depois).pipe(
      map((resposta) => juntar(resposta, [], 1)),
      // expand: cada resultado pode pedir a página seguinte, que volta a passar por aqui
      expand((estado) => {
        const seguinte = this.marcadorSeguinte(estado.resposta);
        const continuar = seguinte && estado.encontrados.length < POR_PAGINA && estado.pedidos < MAX_PAGINAS;
        return continuar
          ? this.pedirPagina(filtro, pesquisa, seguinte).pipe(map((r) => juntar(r, estado.encontrados, estado.pedidos + 1)))
          : EMPTY;
      }),
      last(), // só interessa o fim, com tudo o que se juntou
      map((estado) => {
        const exercicios = this.ordenarPorRelevancia(this.semRepetidos(estado.encontrados), pesquisa);
        return { total: exercicios.length, proximo: this.marcadorSeguinte(estado.resposta), exercicios };
      }),
    );
  }

  // Um pedido à API (uma página de até 25 exercícios)
  private pedirPagina(
    filtro: FiltroExercicios,
    pesquisa: PesquisaApi | null,
    depois?: string,
  ): Observable<RespostaExerciseDb<ExercicioExerciseDb>> {
    let params = new HttpParams().set('limit', POR_PAGINA);
    if (pesquisa?.nome) {
      params = params.set('name', pesquisa.nome);
    }
    if (pesquisa?.equipamentos.length) {
      params = params.set('equipments', pesquisa.equipamentos.join(','));
    }
    if (filtro.grupo) {
      params = params.set('bodyParts', PARTES_DO_CORPO[filtro.grupo].join(','));
    }
    if (depois) {
      params = params.set('after', depois);
    }
    return this.pedir<RespostaExerciseDb<ExercicioExerciseDb>>(URL_API, params);
  }

  // GET à API, mas se a mesma resposta já chegou antes, devolve-a sem fazer outro pedido
  private pedir<T>(url: string, params = new HttpParams()): Observable<T> {
    const chave = `${url}?${params.toString()}`;
    if (this.respostas.has(chave)) {
      return of(this.respostas.get(chave) as T); // of(): um Observable com um valor que já existe
    }
    return this.http.get<T>(url, { params }).pipe(
      tap((resposta) => this.respostas.set(chave, resposta)), // tap: guarda sem alterar a resposta
    );
  }

  // Exercícios parecidos com este, para o substituir (ex.: o banco está ocupado).
  // Pede o exercício (para saber o músculo principal) e depois os desse músculo com o mesmo movimento;
  // ficam primeiro os que partilham mais palavras ("incline bench press" -> "smith incline bench press").
  parecidos(exercicioId: string, quantos = 6): Observable<Exercicio[]> {
    return this.pedir<RespostaExercicio<ExercicioExerciseDb>>(`${URL_API}/${exercicioId}`).pipe(
      // switchMap: com a resposta do 1.º pedido, faz o 2.º (e o resultado passa a ser o do 2.º)
      switchMap(({ data: original }) => {
        const movimento = palavrasDoMovimento(original.name);
        let params = new HttpParams().set('limit', POR_PAGINA).set('targetMuscles', original.targetMuscles.join(','));
        if (movimento.length > 0) {
          params = params.set('name', movimento.join(' '));
        }
        return this.pedir<RespostaExerciseDb<ExercicioExerciseDb>>(URL_API, params).pipe(
          map((resposta) => {
            const outros = resposta.data.filter((e) => e.exerciseId !== exercicioId && normalizar(e.name) !== normalizar(original.name));
            return this.semRepetidos(this.ordenarPorMovimento(outros, movimento).map((e) => this.converter(e))).slice(0, quantos);
          }),
        );
      }),
    );
  }

  // Pontos por cada palavra do movimento em comum; a última ("press", "row", "raise"…) vale mais
  private ordenarPorMovimento(exercicios: ExercicioExerciseDb[], movimento: string[]): ExercicioExerciseDb[] {
    const pontos = (exercicio: ExercicioExerciseDb) => {
      const palavras = palavrasDoMovimento(exercicio.name);
      return movimento.reduce((total, p, i) => total + (palavras.includes(p) ? (i === movimento.length - 1 ? 3 : 1) : 0), 0);
    };
    return [...exercicios].sort((a, b) => pontos(b) - pontos(a) || a.name.length - b.name.length);
  }

  private marcadorSeguinte(resposta: RespostaExerciseDb<ExercicioExerciseDb>): string | null {
    return resposta.meta.hasNextPage ? (resposta.meta.nextCursor ?? null) : null;
  }

  private converter(exercicio: ExercicioExerciseDb): Exercicio {
    const nome = exercicio.name.trim();
    return {
      id: exercicio.exerciseId,
      nome: nome.charAt(0).toUpperCase() + nome.slice(1), // "barbell curl" -> "Barbell curl"
      grupo: this.grupoDaParte(exercicio.bodyParts[0]),
      equipamento: exercicio.equipments.map((e) => EQUIPAMENTOS[e.toLowerCase()] ?? e),
      imagem: exercicio.gifUrl,
    };
  }

  private grupoDaParte(parte: string | undefined): GrupoMuscular {
    const grupos = Object.keys(PARTES_DO_CORPO) as GrupoMuscular[];
    return grupos.find((grupo) => PARTES_DO_CORPO[grupo].includes(parte ?? '')) ?? 'cardio';
  }

  // A ExerciseDB tem alguns exercícios repetidos com o mesmo nome: fica só o primeiro
  private semRepetidos(exercicios: Exercicio[]): Exercicio[] {
    const vistos = new Set<string>();
    return exercicios.filter((e) => {
      const chave = normalizar(e.nome);
      if (vistos.has(chave)) {
        return false;
      }
      vistos.add(chave);
      return true;
    });
  }

  // A API devolve os resultados por ordem do id. Aqui ficam primeiro os que têm a frase escrita
  // ("supino inclinado") e depois os que têm as palavras por outra ordem; em cada grupo, os nomes mais curtos.
  private ordenarPorRelevancia(exercicios: Exercicio[], pesquisa: PesquisaApi): Exercicio[] {
    const pontuacao = (exercicio: Exercicio) => this.pontuacao(exercicio, pesquisa);
    return [...exercicios].sort(
      (a, b) => pontuacao(a) - pontuacao(b) || a.nome.length - b.nome.length,
    );
  }

  private temTodasAsPalavras(exercicio: Exercicio, pesquisa: PesquisaApi): boolean {
    return this.pontuacao(exercicio, pesquisa) < 2;
  }

  // Compara com o nome em inglês e em português (ver "relevancia" em utils/pesquisa.ts)
  private pontuacao(exercicio: Exercicio, pesquisa: PesquisaApi): number {
    return relevancia(pesquisa, [exercicio.nome, this.traducao.emPortugues(exercicio.nome)]);
  }
}
