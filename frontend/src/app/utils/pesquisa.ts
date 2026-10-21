import { normalizar } from './normalizar';

// Pesquisa de exercícios, em português ou em inglês.
// A API ExerciseDB só pesquisa em inglês e só encontra as palavras pela ordem certa
// ("incline bench press" encontra, "bench press incline" não). Por isso a pesquisa passa pelas traduções:
//   1. procura os exercícios cujo nome, em português ou em inglês, tem todas as palavras escritas;
//   2. envia à API a expressão inglesa que esses exercícios têm em comum.
//   "crucifixos com halteres" -> { nome: "fly", equipamentos: ["dumbbell"] }
//   "supino inclinado"        -> { nome: "incline bench press", equipamentos: [] }

export interface PesquisaApi {
  nome: string;           // texto para o filtro "name" da API (em inglês)
  equipamentos: string[]; // valores para o filtro "equipments"
  frase: string;          // o que se escreveu, normalizado (para ordenar os resultados)
  palavras: string[];     // as palavras procuradas, sem o equipamento (para ordenar os resultados)
}

interface Equipamento {
  api: string;     // valor exato do filtro "equipments" da API
  palavra: string; // como aparece nos nomes traduzidos ("Supino com halteres", "Remada na polia")
}

// Equipamento escrito na pesquisa (chaves sem acentos; expressões até 3 palavras)
const EQUIPAMENTOS: Record<string, Equipamento> = {
  'halteres': { api: 'dumbbell', palavra: 'halter' },
  'haltere': { api: 'dumbbell', palavra: 'halter' },
  'halter': { api: 'dumbbell', palavra: 'halter' },
  'dumbbell': { api: 'dumbbell', palavra: 'halter' },
  'dumbbells': { api: 'dumbbell', palavra: 'halter' },
  'barra w': { api: 'EZ bar', palavra: 'w' },
  'ez bar': { api: 'EZ bar', palavra: 'w' },
  'ez-bar': { api: 'EZ bar', palavra: 'w' },
  'barra': { api: 'barbell', palavra: 'barra' },
  'barbell': { api: 'barbell', palavra: 'barra' },
  'polia': { api: 'cable', palavra: 'polia' },
  'cabo': { api: 'cable', palavra: 'polia' },
  'cable': { api: 'cable', palavra: 'polia' },
  'kettlebell': { api: 'kettlebell', palavra: 'kettlebell' },
  'elastico': { api: 'resistance band', palavra: 'elastico' },
  'band': { api: 'resistance band', palavra: 'elastico' },
  'maquina smith': { api: 'smith machine', palavra: 'smith' },
  'smith': { api: 'smith machine', palavra: 'smith' },
  'maquina': { api: 'leverage machine', palavra: 'maquina' },
  'machine': { api: 'leverage machine', palavra: 'maquina' },
  'bola suica': { api: 'stability ball', palavra: 'suica' },
  'bola medicinal': { api: 'medicine ball', palavra: 'medicinal' },
  'peso corporal': { api: 'bodyweight', palavra: 'corporal' },
  'bosu': { api: 'bosu ball', palavra: 'bosu' },
  'trx': { api: 'suspension trainer', palavra: 'trx' },
};

// Palavras do ginásio que as traduções não usam -> palavras que estão nos nomes (em português ou em inglês)
const SINONIMOS: Record<string, string> = {
  'rosca': 'curl',
  'panturrilha': 'gemeos',
  'panturrilhas': 'gemeos',
  'desenvolvimento': 'shoulder press',
  'voador': 'fly',
  'levantamento terra': 'deadlift',
  'terra': 'deadlift',
  'stiff': 'stiff leg deadlift',
  'abdutora': 'abducao',
  'adutora': 'aducao',
  'barra fixa': 'pull-up',
  'elevacoes': 'pull-up',
  'passada': 'afundo',
  'passadas': 'afundo',
  'avanco': 'afundo',
  'cadeira extensora': 'leg extension',
  'extensora': 'leg extension',
  'mesa flexora': 'leg curl',
  'flexora': 'leg curl',
  'triceps testa': 'skull',
  'triceps frances': 'french press',
  'triceps na corda': 'pushdown',
  'triceps corda': 'pushdown',
  'elevacao pelvica': 'glute bridge',
  'bulgaro': 'split',
  'prensa': 'leg press',
};

// Palavras de ligação, que não ajudam a pesquisa ("supino com halteres", "fly on ball")
const LIGACOES = new Set([
  'com', 'de', 'do', 'da', 'dos', 'das', 'na', 'no', 'nas', 'nos', 'em', 'a', 'o', 'as', 'os',
  'para', 'e', 'ao', 'aos', 'um', 'uma', 'the', 'with', 'on', 'of', 'and', 'to', 'in', 'for', 'at',
]);

// Palavras dos nomes ingleses que não se enviam no filtro "name" (o equipamento tem filtro próprio)
const EQUIPAMENTO_INGLES = new Set([
  'dumbbell', 'dumbbells', 'barbell', 'cable', 'band', 'lever', 'leverage', 'smith', 'machine',
  'kettlebell', 'ez', 'ez-bar', 'sled', 'weighted', 'olympic', 'bodyweight', 'resistance',
]);

interface NomeIndexado {
  palavras: string[];       // palavras do nome em inglês e em português
  expressoes: Set<string>;  // expressões do nome em inglês que se podem enviar à API
}

// Separa um texto em palavras: "Supino (com halteres)" -> ["supino", "com", "halteres"]
function palavrasDe(texto: string): string[] {
  return normalizar(texto).split(/[^a-z0-9°-]+/).filter(Boolean);
}

// Tira o plural e o género, para "crucifixos" encontrar "crucifixo" e "sentado" encontrar "sentada"
function raiz(palavra: string): string {
  let p = palavra;
  if (p.endsWith('oes') || p.endsWith('aes')) {
    p = p.slice(0, -3) + 'ao';       // flexoes -> flexao
  } else if (p.endsWith('ais')) {
    p = p.slice(0, -2) + 'l';        // abdominais -> abdominal
  } else if (p.endsWith('s') && p.length > 3) {
    p = p.slice(0, -1);              // crucifixos -> crucifixo
  }
  if (p.length >= 5 && (p.endsWith('o') || p.endsWith('a'))) {
    p = p.slice(0, -1);              // sentado, sentada -> sentad
  }
  return p;
}

// Uma palavra procurada está no nome se alguma palavra do nome começar por ela
// (assim também encontra palavras escritas a meio: "inclin" -> "inclinado")
function contem(palavrasDoNome: string[], procurada: string): boolean {
  return palavrasDoNome.some((p) => (procurada.length < 3 ? p === procurada : p.startsWith(procurada)));
}

// Expressões de 1 a 3 palavras seguidas do nome em inglês, sem equipamento nem ligações nas pontas:
// "cable incline fly (on ball)" -> "incline", "fly", "incline fly", "ball"
function expressoesInglesas(nomeIngles: string): Set<string> {
  const expressoes = new Set<string>();
  for (const parte of normalizar(nomeIngles).split(/[(),]/)) {
    const palavras = parte.split(/\s+/).filter(Boolean);
    for (let inicio = 0; inicio < palavras.length; inicio++) {
      for (let fim = inicio + 1; fim <= Math.min(inicio + 3, palavras.length); fim++) {
        const grupo = palavras.slice(inicio, fim);
        const pontasValidas = !LIGACOES.has(grupo[0]) && !LIGACOES.has(grupo[grupo.length - 1]);
        if (pontasValidas && !grupo.some((p) => EQUIPAMENTO_INGLES.has(p))) {
          expressoes.add(grupo.join(' '));
        }
      }
    }
  }
  return expressoes;
}

export class IndicePesquisa {
  private readonly nomes: NomeIndexado[];
  private readonly vocabulario: string[];

  // nomesPt: o ficheiro das traduções (nome em inglês -> nome em português)
  constructor(nomesPt: Record<string, string>) {
    this.nomes = Object.entries(nomesPt).map(([ingles, portugues]) => ({
      palavras: [...new Set(palavrasDe(`${ingles} ${portugues}`))],
      expressoes: expressoesInglesas(ingles),
    }));
    this.vocabulario = [...new Set(this.nomes.flatMap((n) => n.palavras))];
  }

  preparar(texto: string): PesquisaApi {
    const frase = palavrasDe(texto).join(' ');
    const { palavras, originais, equipamentos } = separar(texto);
    const pesquisa: PesquisaApi = {
      nome: '',
      equipamentos: [...new Set(equipamentos.map((e) => e.api))],
      frase,
      palavras,
    };
    if (palavras.length === 0) {
      return pesquisa; // só equipamento ("halteres"): vai só o filtro "equipments"
    }

    // As palavras que não existem em nenhum nome (erros de escrita) ignoram-se
    const conhecidas = palavras.filter((p) => contem(this.vocabulario, p));
    if (conhecidas.length === 0) {
      return { ...pesquisa, nome: originais.join(' ') };
    }
    pesquisa.palavras = conhecidas;

    // Exercícios com todas as palavras e o equipamento. Se não houver nenhum,
    // tenta sem a última condição (primeiro o equipamento, depois as últimas palavras).
    let condicoes = [...conhecidas, ...equipamentos.map((e) => e.palavra)];
    let escolhidos = this.comTodas(condicoes);
    while (escolhidos.length === 0) {
      condicoes = condicoes.slice(0, -1);
      escolhidos = this.comTodas(condicoes);
    }
    const doEquipamento = this.comTodas(equipamentos.map((e) => e.palavra).filter((p) => condicoes.includes(p)));
    return { ...pesquisa, nome: this.melhorExpressao(escolhidos, doEquipamento) };
  }

  private comTodas(palavras: string[]): NomeIndexado[] {
    return this.nomes.filter((nome) => palavras.every((p) => contem(nome.palavras, p)));
  }

  // A expressão que está em quase todos os escolhidos e em poucos dos outros exercícios.
  // "base" são os exercícios com o mesmo equipamento (ou todos, se não se escreveu equipamento).
  private melhorExpressao(escolhidos: NomeIndexado[], base: NomeIndexado[]): string {
    const nosEscolhidos = contarExpressoes(escolhidos);
    const naBase = contarExpressoes(base);
    let melhor = '';
    let melhorNota = 0;
    for (const [expressao, vezes] of nosEscolhidos) {
      const nota = (2 * vezes) / (escolhidos.length + (naBase.get(expressao) ?? vezes));
      // em caso de empate, a expressão mais comprida é a mais precisa
      if (nota > melhorNota || (nota === melhorNota && expressao.length > melhor.length)) {
        melhor = expressao;
        melhorNota = nota;
      }
    }
    return melhor;
  }
}

// As palavras do movimento num nome inglês, sem o equipamento nem o que está entre parênteses:
// "dumbbell incline bench press (on ball)" -> ["incline", "bench", "press"]
export function palavrasDoMovimento(nomeIngles: string): string[] {
  return normalizar(nomeIngles.split('(')[0])
    .split(/\s+/)
    .filter((p) => p && !LIGACOES.has(p) && !EQUIPAMENTO_INGLES.has(p));
}

// 0: o nome tem a frase escrita; 1: tem todas as palavras; 2: não tem
export function relevancia(pesquisa: PesquisaApi, nomes: string[]): number {
  const palavras = palavrasDe(nomes.join(' '));
  if (pesquisa.frase && ` ${palavras.join(' ')} `.includes(` ${pesquisa.frase}`)) {
    return 0;
  }
  return pesquisa.palavras.every((p) => contem(palavras, p)) ? 1 : 2;
}

// Lê a pesquisa palavra a palavra: equipamento, sinónimos, ligações e o resto
function separar(texto: string): { palavras: string[]; originais: string[]; equipamentos: Equipamento[] } {
  const escritas = palavrasDe(texto);
  const palavras: string[] = [];
  const originais: string[] = [];
  const equipamentos: Equipamento[] = [];
  let i = 0;
  while (i < escritas.length) {
    // procura a expressão mais comprida que seja equipamento ou sinónimo (3, 2 ou 1 palavras)
    let usadas = 0;
    for (let tamanho = Math.min(3, escritas.length - i); tamanho >= 1 && usadas === 0; tamanho--) {
      const expressao = escritas.slice(i, i + tamanho).join(' ');
      if (EQUIPAMENTOS[expressao]) {
        equipamentos.push(EQUIPAMENTOS[expressao]);
        usadas = tamanho;
      } else if (SINONIMOS[expressao]) {
        palavras.push(...palavrasDe(SINONIMOS[expressao]).map(raiz));
        originais.push(...palavrasDe(SINONIMOS[expressao]));
        usadas = tamanho;
      }
    }
    if (usadas === 0) {
      if (!LIGACOES.has(escritas[i])) {
        palavras.push(raiz(escritas[i]));
        originais.push(escritas[i]);
      }
      usadas = 1;
    }
    i += usadas;
  }
  return { palavras, originais, equipamentos };
}

function contarExpressoes(nomes: NomeIndexado[]): Map<string, number> {
  const contagem = new Map<string, number>();
  for (const nome of nomes) {
    for (const expressao of nome.expressoes) {
      contagem.set(expressao, (contagem.get(expressao) ?? 0) + 1);
    }
  }
  return contagem;
}
