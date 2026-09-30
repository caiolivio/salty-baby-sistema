import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { verificarCredenciais } from "@/lib/usuarios";

class ContaBloqueada extends CredentialsSignin {
  code = "bloqueado";
}

const credenciais = z.object({
  email: z.string().trim().min(3).max(191),
  senha: z.string().min(1).max(72),
});

// Login com e-mail e senha. A sessão fica num cookie assinado com AUTH_SECRET e
// guarda só o id do usuário: os perfis são lidos do banco a cada acesso.
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/entrar" },
  providers: [
    Credentials({
      credentials: { email: {}, senha: {} },
      async authorize(entrada) {
        const dados = credenciais.safeParse(entrada);
        if (!dados.success) return null;
        const resultado = await verificarCredenciais(dados.data.email, dados.data.senha);
        if (!resultado.ok) {
          if (resultado.motivo === "bloqueado") throw new ContaBloqueada();
          return null;
        }
        return { id: resultado.usuario.id, name: resultado.usuario.nome, email: resultado.usuario.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
