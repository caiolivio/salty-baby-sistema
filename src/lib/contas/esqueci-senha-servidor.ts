import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "../banco";
import { gerarCodigoDoLink } from "../clientes/conta";
import { gravarLinkDeSenha } from "../clientes/contas";
import { lerLoja } from "../loja/servidor";
import { emailDeNovaSenha, fimDoLinkPorEmail, MINUTOS_ENTRE_PEDIDOS, smtpDoAmbiente } from "./esqueci-senha";

// Envio do link de nova senha por e-mail, pelo SMTP da loja.

/** O site tem o envio de e-mail configurado? Sem ele, o "Esqueci a senha" usa o WhatsApp da loja. */
export const envioDeEmailLigado = () => smtpDoAmbiente(process.env) !== null;

/**
 * Cria um link de nova senha (1 hora) e manda para o e-mail, se existe conta
 * com ele. Não conta para quem pediu se a conta existe, para ninguém descobrir
 * quais e-mails têm cadastro. Devolve false só se o envio falhou.
 */
export async function mandarLinkDeNovaSenha(email: string): Promise<boolean> {
  const smtp = smtpDoAmbiente(process.env);
  if (!smtp) return false;
  const usuario = await prisma.usuario.findUnique({ where: { email }, select: { id: true, nome: true } });
  if (!usuario) return true;
  const agora = new Date();
  const recente = await prisma.linkDeSenha.findFirst({
    where: { usuarioId: usuario.id, criadoEm: { gt: new Date(agora.getTime() - MINUTOS_ENTRE_PEDIDOS * 60_000) } },
    select: { id: true },
  });
  if (recente) return true;
  const codigo = gerarCodigoDoLink();
  await prisma.$transaction((tx) => gravarLinkDeSenha(tx, usuario.id, codigo, agora, fimDoLinkPorEmail(agora)));
  const loja = await lerLoja();
  const site = (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const mensagem = emailDeNovaSenha({ nome: usuario.nome, link: `${site}/criar-senha/${codigo}`, loja: loja.nome, cor: loja.corPrincipal });
  try {
    await nodemailer
      .createTransport({ host: smtp.host, port: smtp.porta, secure: smtp.seguro, auth: { user: smtp.usuario, pass: smtp.senha } })
      .sendMail({
        from: smtp.remetente.includes("<") ? smtp.remetente : `"${loja.nome}" <${smtp.remetente}>`,
        to: email,
        subject: mensagem.assunto,
        text: mensagem.texto,
        html: mensagem.html,
      });
    return true;
  } catch (erro) {
    console.error("Esqueci a senha: o e-mail não saiu.", erro);
    return false;
  }
}
