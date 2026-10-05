import type { Metadata } from "next";
import Link from "next/link";
import { Passos } from "@/componentes/passos";
import { codigoValido } from "@/lib/clientes/conta";
import { PASSOS_PRIMEIRO_ACESSO } from "@/lib/fornecedoras/conta";
import { buscarConvite } from "@/lib/fornecedoras/convites";
import { formatarTelefone } from "@/lib/pedidos/regras";
import estilos from "../../loja.module.css";
import { FormularioConvite } from "./formulario-convite";
import { lerLoja } from "@/lib/loja/servidor";

export const metadata: Metadata = { title: "Primeiro acesso", robots: { index: false } };

export default async function Convite({ params }: PageProps<"/convite/[codigo]">) {
  const { codigo } = await params;
  const loja = await lerLoja();
  const f = codigoValido(codigo) ? await buscarConvite(codigo) : null;

  if (!f) {
    return (
      <div className={estilos.paginaFornecedora}>
        <h1 className={estilos.tituloPagina}>Este link não vale mais</h1>
        <p>
          O link já foi usado ou passou do prazo. Peça um novo à {loja.nomeCurto} pelo WhatsApp, ou <Link href="/entrar">entre</Link> com a
          senha que você já criou.
        </p>
      </div>
    );
  }

  return (
    <div className={estilos.paginaFornecedora}>
      <h1 className={estilos.tituloPagina}>Bem-vinda à sua área, {f.nome.split(" ")[0]}!</h1>
      <Passos nomes={PASSOS_PRIMEIRO_ACESSO} situacoes={["atual", "pendente", "pendente"]} />
      <section className={estilos.explicacao}>
        <p>
          Você é a fornecedora <strong>{f.codigo}</strong> da {loja.nome}. Para liberar a sua área, termine o seu cadastro em 3
          passos: <strong>confira seus dados e crie sua senha</strong>, leia e aceite o acordo de consignação e pronto.
        </p>
        <p>
          <strong>Nome, e-mail e endereço são obrigatórios.</strong> Sem eles, a sua área não abre.
        </p>
      </section>
      <FormularioConvite
        codigo={codigo}
        iniciais={{
          nome: f.nome,
          email: f.email ?? "",
          telefone: f.telefone ? formatarTelefone(f.telefone) : "",
          endereco: f.endereco ?? "",
          cep: f.cep ?? "",
          cidade: f.cidade ?? "",
          estado: f.estado ?? "",
          pix: f.pix ?? "",
          pixTipo: f.pixTipo ?? "",
          recebimentoPreferido: f.recebimentoPreferido ?? "",
        }}
      />
    </div>
  );
}
