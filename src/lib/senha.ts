import bcrypt from "bcryptjs";

export const SENHA_MINIMO = 8;

// Custo do hash: alto o bastante para dificultar ataques, sem deixar o login lento.
const CUSTO = 12;

export function problemaNaSenha(senha: string): string | undefined {
  if (senha.length < SENHA_MINIMO) return `A senha precisa ter pelo menos ${SENHA_MINIMO} caracteres.`;
  if (senha.length > 72) return "A senha pode ter no máximo 72 caracteres.";
  if (!/[A-Za-zÀ-ÿ]/.test(senha) || !/[0-9]/.test(senha)) return "Use letras e números na senha.";
  return undefined;
}

export function gerarHash(senha: string): Promise<string> {
  return bcrypt.hash(senha, CUSTO);
}

export function conferirSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}
