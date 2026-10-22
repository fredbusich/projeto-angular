// Gera src/environments/environment.ts a partir das variáveis de ambiente SUPABASE_URL e SUPABASE_KEY.
// Assim a chave do Supabase não fica escrita no código nem no repositório:
// - no computador, as variáveis vêm do ficheiro .env (feito a partir do .env.example), que não vai para o Git;
// - no GitHub Actions, vêm dos Secrets do repositório (ver .github/workflows/publicar.yml).
// Corre sozinho antes de "npm start" e dos builds (scripts "pre…" do package.json).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ficheiroEnv = fileURLToPath(new URL('../.env', import.meta.url));
const destino = fileURLToPath(new URL('../src/environments/environment.ts', import.meta.url));

// O .env só completa o que falta: uma variável que já exista no ambiente (ex.: no GitHub Actions) ganha
if (existsSync(ficheiroEnv)) {
  process.loadEnvFile(ficheiroEnv);
}

const url = process.env.SUPABASE_URL?.trim() ?? '';
const chave = process.env.SUPABASE_KEY?.trim() ?? '';

function parar(mensagem) {
  console.error(`\n[gerar-environment] ${mensagem}\n`);
  process.exit(1);
}

if (!url || !chave) {
  parar(
    'Faltam as variáveis SUPABASE_URL e SUPABASE_KEY.\n' +
      'No computador: copia o .env.example para .env (na pasta frontend) e preenche-o.\n' +
      'No GitHub Actions: cria os Secrets SUPABASE_URL e SUPABASE_KEY no repositório.',
  );
}
if (!url.startsWith('https://')) {
  parar(`SUPABASE_URL tem de começar por https:// (está "${url}").`);
}
// A chave secreta passa por cima do RLS: nunca pode ir para o código que corre no navegador
if (chave.startsWith('sb_secret_')) {
  parar('SUPABASE_KEY é a chave SECRETA. Usa a chave pública (publishable), a que começa por sb_publishable_.');
}

const conteudo = `// GERADO AUTOMATICAMENTE por scripts/gerar-environment.mjs: não editar nem pôr no Git.
// Os valores vêm das variáveis de ambiente SUPABASE_URL e SUPABASE_KEY
// (ficheiro .env no computador, Secrets no GitHub Actions).
// A chave é a pública (publishable): vai no código do navegador; quem protege os dados é o RLS.
export const environment = {
  supabaseUrl: ${JSON.stringify(url)},
  supabaseChave: ${JSON.stringify(chave)},
};
`;

mkdirSync(fileURLToPath(new URL('../src/environments/', import.meta.url)), { recursive: true });
writeFileSync(destino, conteudo);
console.log('[gerar-environment] src/environments/environment.ts gerado a partir das variáveis de ambiente.');
