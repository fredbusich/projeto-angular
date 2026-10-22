// Ligação ao projeto Supabase (base de dados + contas).
// Estes dois valores são públicos por natureza: vão no código que corre no navegador de qualquer
// pessoa. O que protege os dados são as regras de RLS na base de dados (supabase/migrations/).
// A chave secreta (secret / service_role) e a palavra-passe da base de dados NUNCA entram aqui.
export const environment = {
  supabaseUrl: 'https://ahejwbsmiwwynmvjblld.supabase.co', // Project URL
  supabaseChave: 'sb_publishable_-2fZD7Qh8v66f_MYpeN7ww_XqZ1uiCm', // chave publishable
};
