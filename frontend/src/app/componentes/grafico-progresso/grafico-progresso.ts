import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PontoProgresso } from '../../servicos/progresso-service';

interface PontoDesenhado {
  x: number;
  y: number;
  ponto: PontoProgresso;
  recorde: boolean;      // o melhor de todos (fica destacado)
}

// Gráfico de linha da evolução de um exercício: um ponto por treino, com a melhor série desse treino.
// É SVG desenhado aqui mesmo (sem bibliotecas): as contas passam datas e cargas a coordenadas.
// Num exercício sem peso (ex.: elevação de pernas), o gráfico mostra as repetições.
@Component({
  imports: [DatePipe, DecimalPipe],
  selector: 'app-grafico-progresso',
  styleUrl: './grafico-progresso.css',
  templateUrl: './grafico-progresso.html',
})
export class GraficoProgresso {
  // pai -> filho: os pontos, do treino mais antigo para o mais recente
  @Input({ required: true }) pontos: PontoProgresso[] = [];

  // Medidas do desenho (unidades do viewBox; o SVG estica para a largura da página)
  // (pequeno de propósito: no telemóvel o desenho encolhe pouco e as letras continuam legíveis)
  protected readonly largura = 420;
  protected readonly altura = 220;
  protected readonly esquerda = 40;   // espaço para os números do eixo
  protected readonly direita = 12;
  protected readonly topo = 24;
  protected readonly baixo = 190;     // linha do eixo das datas

  // Sem carga em nenhuma série: mostra repetições
  protected get porRepeticoes(): boolean {
    return this.pontos.every((p) => p.carga === 0);
  }

  protected get unidade(): string {
    return this.porRepeticoes ? 'repetições' : 'kg';
  }

  private valor(ponto: PontoProgresso): number {
    return this.porRepeticoes ? ponto.repeticoes : ponto.carga;
  }

  // 4 a 5 marcas "redondas" no eixo vertical, a cobrir do menor ao maior valor
  protected get marcas(): number[] {
    const valores = this.pontos.map((p) => this.valor(p));
    const menor = Math.min(...valores);
    const maior = Math.max(...valores);
    const passo = passoRedondo((maior - menor) / 4 || maior / 4 || 1);
    const inicio = Math.floor(menor / passo) * passo;
    const marcas: number[] = [];
    for (let v = inicio; v <= maior + passo / 2; v += passo) {
      marcas.push(Math.round(v * 100) / 100);
    }
    return marcas.length > 1 ? marcas : [inicio, inicio + passo];
  }

  protected yDe(valor: number): number {
    const marcas = this.marcas;
    const menor = marcas[0];
    const maior = marcas.at(-1) ?? menor + 1;
    return this.baixo - ((valor - menor) / (maior - menor)) * (this.baixo - this.topo);
  }

  // Cada ponto no sítio da sua data (o tempo entre treinos conta) e da sua carga
  protected get desenhados(): PontoDesenhado[] {
    const tempos = this.pontos.map((p) => Date.parse(p.data));
    const primeiro = tempos[0];
    const ultimo = tempos.at(-1) ?? primeiro;
    const largura = this.largura - this.esquerda - this.direita;
    const melhor = Math.max(...this.pontos.map((p) => this.valor(p)));
    const indiceMelhor = this.pontos.findIndex((p) => this.valor(p) === melhor);
    return this.pontos.map((ponto, i) => ({
      x: this.esquerda + (ultimo === primeiro ? largura / 2 : ((tempos[i] - primeiro) / (ultimo - primeiro)) * largura),
      y: this.yDe(this.valor(ponto)),
      ponto,
      recorde: i === indiceMelhor,
    }));
  }

  protected get linha(): string {
    return this.desenhados.map((d, i) => `${i === 0 ? 'M' : 'L'}${d.x.toFixed(1)} ${d.y.toFixed(1)}`).join(' ');
  }

  protected get melhor(): PontoDesenhado | undefined {
    return this.desenhados.find((d) => d.recorde);
  }

  // Texto de um ponto, para quem passa o rato (ou usa leitor de ecrã)
  protected descricao(ponto: PontoProgresso): string {
    const data = new Date(ponto.data).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
    const carga = ponto.carga.toLocaleString('pt-PT');
    return this.porRepeticoes ? `${data}: ${ponto.repeticoes} repetições` : `${data}: ${carga} kg × ${ponto.repeticoes}`;
  }
}

// 1, 2, 2,5 ou 5 vezes uma potência de 10 (ex.: 7 -> 10, 13 -> 20, 23 -> 25)
function passoRedondo(bruto: number): number {
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const fator = [1, 2, 2.5, 5, 10].find((f) => f * potencia >= bruto) ?? 10;
  return fator * potencia;
}
