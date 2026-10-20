// Prepara um texto para comparações: minúsculas e sem acentos.
// Assim, pesquisar "supino" encontra "Supino", e "bracos" encontra "Braços".
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
