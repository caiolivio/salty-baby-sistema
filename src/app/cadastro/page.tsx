import type { Metadata } from "next";
import Link from "next/link";
import { Voltar } from "@/componentes/voltar";
import { redirect } from "next/navigation";
import estilos from "@/componentes/formulario.module.css";
import { usuarioAtual } from "@/lib/acesso";
import { novoDesafio } from "@/lib/desafio/servidor";
import { destinoInicial, enderecoDeVoltaSeguro } from "@/lib/permissoes";
import { FormularioCadastro } from "./formulario-cadastro";
import { LogoDaLoja } from "@/componentes/logo-da-loja";
import { prisma } from "@/lib/banco";
import { lerCodigoDeIndicacao } from "@/lib/clientes/indicacao";
import { lerLoja } from "@/lib/loja/servidor";

export const metadata: Metadata = { title: "Criar conta" };

export default async function Cadastro({ searchParams }: PageProps<"/cadastro">) {
  const parametros = await searchParams;
  const voltar = enderecoDeVoltaSeguro(parametros.voltar);
  const indicacao = lerCodigoDeIndicacao(Array.isArray(parametros.indicacao) ? parametros.indicacao[0] : parametros.indicacao) ?? undefined;
  const quemIndicou = indicacao
    ? await prisma.cliente.findUnique({ where: { codigoIndicacao: indicacao }, select: { nome: true } })
    : null;
  const loja = await lerLoja();
  const usuario = await usuarioAtual();
  if (usuario) redirect(voltar ?? destinoInicial(usuario.perfis));

  return (
    <main className={estilos.pagina}>
      <div className={estilos.cartao}>
        <Voltar href="/">Voltar para a loja</Voltar>
        <Link href="/" className={estilos.logo}>
          <LogoDaLoja alt="Voltar ao início" />
        </Link>
        <h1 className={estilos.titulo}>Criar conta</h1>
        <p className={estilos.explicacao}>
          Com a conta você vê suas compras, guarda peças favoritas e recebe sugestões no tamanho certo.
        </p>
        {quemIndicou && (
          <p className={estilos.explicacao}>
            <strong>{quemIndicou.nome.split(" ")[0]}</strong> indicou você. Que bom ter você por aqui! 💛
          </p>
        )}
        <FormularioCadastro
          voltar={voltar}
          desafio={await novoDesafio()}
          indicacao={quemIndicou ? indicacao : undefined}
          nomeLoja={loja.nomeCurto}
        />
        <p className={estilos.avisoLgpd}>
          Usamos seus dados só para as suas compras e, se você marcar, para mandar novidades pelo WhatsApp. Para parar, responda SAIR
          ou desmarque em Minha conta. Saiba mais no <Link href="/privacidade">aviso de privacidade</Link>.
        </p>
        <p className={estilos.rodape}>
          Já tem conta? <Link href={voltar ? `/entrar?voltar=${encodeURIComponent(voltar)}` : "/entrar"}>Entrar</Link>
        </p>
      </div>
    </main>
  );
}
