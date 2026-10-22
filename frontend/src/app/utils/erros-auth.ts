import { isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';

// As mensagens de erro do Supabase Auth vêm em inglês e com um código ("invalid_credentials"…).
// Aqui passam a frases em português para mostrar no formulário.
const MENSAGENS: Record<string, string> = {
  invalid_credentials: 'Email ou palavra-passe errados.',
  email_not_confirmed: 'Ainda não confirmaste o email: abre o link que te enviámos.',
  user_already_exists: 'Este email já tem conta. Experimenta entrar.',
  email_exists: 'Este email já tem conta. Experimenta entrar.',
  weak_password: 'A palavra-passe é demasiado fraca. Usa pelo menos 8 caracteres.',
  same_password: 'A nova palavra-passe tem de ser diferente da atual.',
  email_address_invalid: 'Este endereço de email não é válido.',
  over_email_send_rate_limit: 'Já enviámos vários emails seguidos. Espera uns minutos e tenta outra vez.',
  over_request_rate_limit: 'Demasiadas tentativas seguidas. Espera um pouco e tenta outra vez.',
  signup_disabled: 'Neste momento não é possível criar contas.',
  session_not_found: 'A sessão terminou. Entra outra vez.',
  otp_expired: 'Este link já expirou. Pede um novo.',
  validation_failed: 'Verifica os dados e tenta outra vez.',
};

export function traduzirErroAuth(erro: unknown): string {
  // Sem rede (ou servidor em baixo), o pedido nem chega ao Supabase
  if (isAuthRetryableFetchError(erro)) {
    return 'Não foi possível ligar ao servidor. Verifica a ligação à internet e tenta outra vez.';
  }
  if (isAuthError(erro) && erro.code && MENSAGENS[erro.code]) {
    return MENSAGENS[erro.code];
  }
  return 'Algo correu mal. Tenta outra vez daqui a pouco.';
}
