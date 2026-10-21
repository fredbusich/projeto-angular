import { formatDate, formatNumber } from '@angular/common';
import { Inject, Injectable, LOCALE_ID } from '@angular/core';
import { Treino } from '../modelos/treino';
import { DuracaoPipe } from '../pipes/duracao-pipe';
import { TraducaoService } from './traducao-service';
import { TreinoService } from './treino-service';

// Medidas da imagem: 1080 × 1350 é o formato das publicações do Instagram (4:5)
const LARGURA = 1080;
const ALTURA = 1350;
const MARGEM = 80;

// As cores do tema escuro da app
const COR = {
  fundo: '#0B0B0C',
  cartao: '#161618',
  linha: '#2C2C30',
  texto: '#F4F4F5',
  secundario: '#A1A1AA',
  destaque: '#C8F031',
};
const TITULO = '"Barlow Condensed", "Arial Narrow", sans-serif';
const TEXTO = 'Barlow, system-ui, sans-serif';

// Partilhar um treino terminado como imagem (estilo Strava): desenha-a num <canvas>
// e abre a partilha do telemóvel (WhatsApp, Instagram…); no computador, descarrega-a.
@Injectable({ providedIn: 'root' })
export class PartilhaService {
  constructor(
    private treinoService: TreinoService,
    private traducao: TraducaoService,
    @Inject(LOCALE_ID) private locale: string, // 'pt-PT': números e datas como em Portugal
  ) {}

  async partilhar(treino: Treino): Promise<void> {
    const imagem = await this.criarImagem(treino);
    const ficheiro = new File([imagem], `replog-${treino.inicio.slice(0, 10)}.png`, { type: 'image/png' });

    // Web Share API: só alguns browsers (sobretudo no telemóvel) partilham ficheiros
    if (navigator.canShare?.({ files: [ficheiro] })) {
      try {
        await navigator.share({ files: [ficheiro], title: `${treino.nomeFicha} · RepLog` });
      } catch {
        // o utilizador fechou a partilha sem escolher nada: não é um erro
      }
      return;
    }

    // Sem partilha: descarrega a imagem com um <a download> temporário
    const endereco = URL.createObjectURL(imagem);
    const ligacao = document.createElement('a');
    ligacao.href = endereco;
    ligacao.download = ficheiro.name;
    ligacao.click();
    setTimeout(() => URL.revokeObjectURL(endereco), 1000);
  }

  async criarImagem(treino: Treino): Promise<Blob> {
    // As letras vêm do Google Fonts: o canvas só as usa depois de carregadas
    await Promise.all([
      document.fonts.load(`700 100px ${TITULO}`),
      document.fonts.load(`500 40px ${TEXTO}`),
      document.fonts.load(`600 40px ${TEXTO}`),
    ]).catch(() => undefined);

    const canvas = document.createElement('canvas');
    canvas.width = LARGURA;
    canvas.height = ALTURA;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('O browser não consegue desenhar a imagem');
    }

    ctx.fillStyle = COR.fundo;
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    ctx.textBaseline = 'alphabetic';

    // Marca: quadrado lima + "REPLOG"
    ctx.fillStyle = COR.destaque;
    this.retanguloRedondo(ctx, MARGEM, 84, 30, 30, 7);
    ctx.fill();
    this.escrever(ctx, 'REPLOG', MARGEM + 46, 113, `700 46px ${TITULO}`, COR.texto);

    // Data e nome do treino
    const data = formatDate(treino.inicio, "EEEE, d 'de' MMMM '·' HH:mm", this.locale);
    this.escrever(ctx, data.charAt(0).toUpperCase() + data.slice(1), MARGEM, 210, `500 36px ${TEXTO}`, COR.secundario);
    const nome = treino.nomeFicha.toUpperCase();
    const tamanhoNome = this.tamanhoQueCabe(ctx, nome, 150, LARGURA - 2 * MARGEM);
    this.escrever(ctx, nome, MARGEM, 350, `700 ${tamanhoNome}px ${TITULO}`, COR.destaque);

    // Três números: duração, volume e séries
    const numeros: [string, string][] = [
      ['Duração', new DuracaoPipe().transform(this.treinoService.duracao(treino), 'texto')],
      ['Volume', `${formatNumber(this.treinoService.volume(treino), this.locale, '1.0-0')} kg`],
      ['Séries', String(this.treinoService.seriesFeitas(treino))],
    ];
    const larguraCaixa = (LARGURA - 2 * MARGEM - 2 * 24) / 3;
    numeros.forEach(([rotulo, valor], i) => {
      const x = MARGEM + i * (larguraCaixa + 24);
      ctx.fillStyle = COR.cartao;
      this.retanguloRedondo(ctx, x, 410, larguraCaixa, 170, 24);
      ctx.fill();
      this.escrever(ctx, rotulo, x + 28, 466, `500 30px ${TEXTO}`, COR.secundario);
      const tamanho = this.tamanhoQueCabe(ctx, valor, 58, larguraCaixa - 56);
      this.escrever(ctx, valor, x + 28, 545, `700 ${tamanho}px ${TITULO}`, COR.texto);
    });

    // Recordes (se houve)
    const exercicios = this.treinoService.resumoPorExercicio(treino);
    const recordes = exercicios.filter((e) => e.recorde).length;
    let y = 650;
    if (recordes > 0) {
      ctx.fillStyle = COR.destaque;
      this.retanguloRedondo(ctx, MARGEM, y - 50, LARGURA - 2 * MARGEM, 76, 20);
      ctx.fill();
      const texto = recordes === 1 ? '★  NOVO RECORDE PESSOAL' : `★  ${recordes} NOVOS RECORDES PESSOAIS`;
      this.escrever(ctx, texto, MARGEM + 28, y + 2, `700 44px ${TITULO}`, COR.fundo);
      y += 100;
    }

    // Exercícios: "3 × Supino com barra ........ 62,5 kg × 8" (no máximo 7 linhas)
    const mostrar = recordes > 0 ? 6 : 7;
    for (const exercicio of exercicios.slice(0, mostrar)) {
      const melhor = `${formatNumber(exercicio.melhor.carga, this.locale, '1.0-2')} kg × ${exercicio.melhor.repeticoes}`;
      ctx.font = `600 38px ${TEXTO}`;
      const larguraMelhor = ctx.measureText(melhor).width;
      const nomeExercicio = `${exercicio.feitas} × ${this.traducao.nome(exercicio.nome)}`;
      this.escrever(ctx, nomeExercicio, MARGEM, y, `500 38px ${TEXTO}`, COR.texto, LARGURA - 2 * MARGEM - larguraMelhor - 40);
      ctx.textAlign = 'right';
      this.escrever(ctx, (exercicio.recorde ? '★ ' : '') + melhor, LARGURA - MARGEM, y, `600 38px ${TEXTO}`, exercicio.recorde ? COR.destaque : COR.secundario);
      ctx.textAlign = 'left';
      ctx.fillStyle = COR.linha;
      ctx.fillRect(MARGEM, y + 28, LARGURA - 2 * MARGEM, 2);
      y += 82;
    }
    if (exercicios.length > mostrar) {
      const mais = exercicios.length - mostrar;
      this.escrever(ctx, `+ ${mais} ${mais === 1 ? 'exercício' : 'exercícios'}`, MARGEM, y, `500 34px ${TEXTO}`, COR.secundario);
    }

    // Rodapé
    this.escrever(ctx, 'Registado com RepLog · Diário de Treinos', MARGEM, ALTURA - 70, `500 30px ${TEXTO}`, COR.secundario);

    return new Promise((resolver, rejeitar) =>
      canvas.toBlob((blob) => (blob ? resolver(blob) : rejeitar(new Error('Imagem vazia'))), 'image/png'),
    );
  }

  // Escreve um texto; se for mais comprido do que "maximo", corta-o com "…"
  private escrever(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, letra: string, cor: string, maximo?: number): void {
    ctx.font = letra;
    ctx.fillStyle = cor;
    let final = texto;
    if (maximo) {
      while (final.length > 1 && ctx.measureText(final).width > maximo) {
        final = final.slice(0, -2) + '…';
      }
    }
    ctx.fillText(final, x, y);
  }

  // O maior tamanho de letra (até "maximo" px) com que o texto cabe na largura dada
  private tamanhoQueCabe(ctx: CanvasRenderingContext2D, texto: string, maximo: number, largura: number): number {
    ctx.font = `700 ${maximo}px ${TITULO}`;
    return Math.min(maximo, Math.floor((maximo * largura) / ctx.measureText(texto).width));
  }

  private retanguloRedondo(ctx: CanvasRenderingContext2D, x: number, y: number, largura: number, altura: number, raio: number): void {
    ctx.beginPath();
    ctx.roundRect(x, y, largura, altura, raio);
  }
}
