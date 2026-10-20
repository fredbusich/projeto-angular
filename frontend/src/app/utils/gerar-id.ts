// Cria um identificador único para fichas e treinos, por exemplo "mgy3k9q1-4f7h1c".
// Junta a data atual (em base 36) com uma parte aleatória.
export function gerarId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
