import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Exercicio, GrupoMuscular, PaginaExercicios } from '../modelos/exercicio';
import { ExercicioWger, RespostaPaginada } from '../modelos/wger';

const URL_API = 'https://wger.de/api/v2/exerciseinfo/';
const IDIOMA_PT = 7;
const IDIOMA_EN = 2;

// Na wger cada grupo muscular é uma categoria com um número
const ID_CATEGORIA: Record<GrupoMuscular, number> = {
  peito: 11,
  costas: 12,
  pernas: 9,
  ombros: 13,
  bracos: 8,
  abdominais: 10,
  gemeos: 14,
  cardio: 15,
};

// A wger dá o equipamento em inglês; aqui fica o nome em português
const EQUIPAMENTOS: Record<number, string> = {
  1: 'Barra',
  2: 'Barra W',
  3: 'Halteres',
  4: 'Tapete',
  5: 'Bola suíça',
  6: 'Barra de elevações',
  7: 'Peso corporal',
  8: 'Banco',
  9: 'Banco inclinado',
  10: 'Kettlebell',
  11: 'Elástico',
  12: 'Polia',
};

// Biblioteca de exercícios, vinda da API pública wger por HTTP.
@Injectable({ providedIn: 'root' })
export class ExercicioService {
  readonly porPagina = 20;

  constructor(private http: HttpClient) {}

  // Devolve um Observable: o pedido só é feito quando alguém fizer subscribe()
  listar(grupo?: GrupoMuscular, pagina = 0): Observable<PaginaExercicios> {
    let params = new HttpParams()
      .set('limit', this.porPagina)
      .set('offset', pagina * this.porPagina);
    if (grupo) {
      params = params.set('category', ID_CATEGORIA[grupo]);
    }

    return this.http.get<RespostaPaginada<ExercicioWger>>(URL_API, { params }).pipe(
      // map (do RxJS): transforma a resposta da wger no formato da nossa app
      map((resposta) => ({
        total: resposta.count,
        exercicios: resposta.results.map((exercicio) => this.converter(exercicio)),
      })),
    );
  }

  private converter(exercicio: ExercicioWger): Exercicio {
    const traducao =
      exercicio.translations.find((t) => t.language === IDIOMA_PT) ??
      exercicio.translations.find((t) => t.language === IDIOMA_EN) ??
      exercicio.translations[0];
    const imagem = exercicio.images.find((i) => i.is_main) ?? exercicio.images[0];

    return {
      id: exercicio.id,
      nome: traducao?.name.trim() || 'Exercício sem nome',
      grupo: this.grupoDaCategoria(exercicio.category.id),
      equipamento: exercicio.equipment.map((e) => EQUIPAMENTOS[e.id] ?? e.name),
      imagem: imagem?.image,
    };
  }

  private grupoDaCategoria(idCategoria: number): GrupoMuscular {
    const grupos = Object.keys(ID_CATEGORIA) as GrupoMuscular[];
    return grupos.find((grupo) => ID_CATEGORIA[grupo] === idCategoria) ?? 'cardio';
  }
}
