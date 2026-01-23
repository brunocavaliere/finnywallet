const INVALID_CREDENTIALS = "invalid login credentials";
const USER_EXISTS = "user already";
const WEAK_PASSWORD = "password";
const INVALID_EMAIL = "email";
const RATE_LIMIT = "rate limit";

export function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes(INVALID_CREDENTIALS)) {
    return "Credenciais inválidas. Verifique seu e-mail e senha.";
  }

  if (normalized.includes(USER_EXISTS)) {
    return "Este e-mail já está cadastrado.";
  }

  if (normalized.includes(RATE_LIMIT) || normalized.includes("too many")) {
    return "Muitas tentativas. Tente novamente em alguns instantes.";
  }

  if (normalized.includes(WEAK_PASSWORD) && normalized.includes("at least")) {
    return "Sua senha é fraca. Use pelo menos 6 caracteres.";
  }

  if (normalized.includes(INVALID_EMAIL) && normalized.includes("valid")) {
    return "Informe um e-mail válido.";
  }

  return "Não foi possível autenticar. Tente novamente.";
}
