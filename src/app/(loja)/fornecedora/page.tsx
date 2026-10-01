import type { Metadata } from "next";
import Link from "next/link";
import { Passos } from "@/componentes/passos";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarData } from "@/lib/datas";
import { ACORDO, TITULO_ACORDO } from "@/lib/fornecedoras/acordo";
import { PASSOS, situacaoDosPassos } from "@/lib/fornecedoras/candidatura";
import { situacaoNaArea } from "@/lib/fornecedoras/candidaturas";
import { enderecoDaFoto } from "@/lib/fotos";
import estilos from "../loja.module.css";
import { aceitar, concluirBoasVindas, tirar } from "./acoes";
import { FormularioProposta } from "./formulario-proposta";

export const metadata: Metadata = { title: "Área da fornecedora · Salty Baby", robots: { index: false } };

function TextoDoAcordo() {
  return (
    <div className={estilos.acordo}>
      <strong>{TITULO_ACORDO}</strong>
      {ACORDO.map((s) => (
        <div key={s.titulo}>
          <h3>{s.titulo}</h3>
          <p>{s.texto}</p>
        </div>
      ))}
    </div>
  );
}

async function MinhasPropostas({ dono }: { dono: { candidaturaId: string } | { fornecedoraId: string } }) {
  const propostas = await prisma.pecaProposta.findMany({
    where: dono,
    orderBy: { criadoEm: "desc" },
    select: { id: true, nome: true, descricao: true, foto: true, situacao: true, criadoEm: true, peca: { select: { codigo: true } } },
  });
  if (propostas.length === 0) return <p>Você ainda não enviou peças.</p>;
  return (
    <ul className={estilos.minhasPropostas}>
      {propostas.map((p) => (
        <li key={p.id}>
          {/* eslint-disable-next-line @next/next/no-img-element -- miniatura já reduzida no envio */}
          <img src={enderecoDaFoto(p.foto, true)} alt={p.nome ?? "Foto da peça"} />
          <strong>{p.nome ?? p.descricao}</strong>
          <span>Enviada em {formatarData(p.criadoEm)}</span>
          <span className={estilos.seloProposta}>
            {p.situacao === "proposta"
              ? "Em avaliação"
              : p.situacao === "recebida"
                ? `Recebida${p.peca ? ` · ${p.peca.codigo}` : ""}`
                : "Não aceita"}
          </span>
          {p.situacao === "proposta" && (
            <form action={tirar}>
              <input type="hidden" name="id" value={p.id} />
              <button type="submit" className={estilos.linkTirar}>
                Tirar
              </button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}

async function EnviarPecas({
  dono,
  titulo,
}: {
  dono: { candidaturaId: string } | { fornecedoraId: string };
  titulo: string;
}) {
  const categorias = await prisma.categoria.findMany({
    where: { ativa: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });
  return (
    <>
      <section className={estilos.secaoArea} aria-labelledby="enviar">
        <h2 id="enviar">{titulo}</h2>
        <p>
          Mande uma foto e os detalhes de cada peça. A Salty avalia e, quando receber a peça, define o preço e coloca à venda.
        </p>
        <FormularioProposta categorias={categorias} />
      </section>
      <section className={estilos.secaoArea} aria-labelledby="enviadas">
        <h2 id="enviadas">Peças que você enviou</h2>
        <MinhasPropostas dono={dono} />
      </section>
    </>
  );
}

export default async function AreaDaFornecedora({ searchParams }: PageProps<"/fornecedora">) {
  const usuario = await exigirAcesso("area-fornecedora", "/fornecedora");
  const aviso = await searchParams;
  const situacao = await situacaoNaArea(usuario.id);

  if (situacao.tipo === "sem-cadastro") {
    return (
      <section className={estilos.explicacao}>
        <h1 className={estilos.tituloPagina}>Sua área ainda não está pronta</h1>
        <p>Fale com a Salty pelo WhatsApp para terminar o seu cadastro de fornecedora.</p>
      </section>
    );
  }

  if (situacao.tipo === "candidata") {
    const { candidatura } = situacao;
    if (candidatura.etapa === "recusada" || candidatura.etapa === "enviada") {
      return (
        <section className={estilos.explicacao}>
          <h1 className={estilos.tituloPagina}>Seja uma fornecedora</h1>
          <p>
            {candidatura.etapa === "recusada"
              ? "Desta vez a sua inscrição não foi aprovada. Obrigada pelo interesse! Se quiser, fale com a Salty pelo WhatsApp."
              : "A curadoria ainda está avaliando as suas peças. A Salty entra em contato pelo WhatsApp."}
          </p>
        </section>
      );
    }
    const dono = { candidaturaId: candidatura.id };
    if (candidatura.etapa === "acordo_aceito") {
      return (
        <>
          <h1 className={estilos.tituloPagina}>Passo 2 concluído!</h1>
          <Passos nomes={PASSOS} situacoes={situacaoDosPassos(2, true)} />
          <section className={estilos.explicacao}>
            <p>
              Você aceitou o acordo de consignação. Agora <strong>a Salty entra em contato pelo WhatsApp</strong> para combinar
              a entrega das peças e finalizar a sua parceria (passo 3).
            </p>
            <p>Enquanto isso, você pode continuar mandando peças.</p>
          </section>
          <EnviarPecas dono={dono} titulo="Mostrar mais peças" />
        </>
      );
    }
    // Etapa "aprovada": passo 2.
    return (
      <>
        <h1 className={estilos.tituloPagina}>Suas peças foram aprovadas!</h1>
        <Passos nomes={PASSOS} situacoes={situacaoDosPassos(2)} />
        <section className={estilos.explicacao}>
          <p>
            Agora é o <strong>passo 2</strong>: mostre mais peças que você quer deixar com a Salty, com os detalhes de cada
            uma, e leia e aceite as regras da consignação no fim da página.
          </p>
        </section>
        <EnviarPecas dono={dono} titulo="Mostrar mais peças" />
        <section className={estilos.secaoArea} aria-labelledby="regras">
          <h2 id="regras">Regras da consignação</h2>
          <TextoDoAcordo />
          {aviso.faltaAceite && (
            <p className={estilos.erro} role="alert">
              Para continuar, marque que leu e está de acordo.
            </p>
          )}
          <form action={aceitar} className={estilos.formConta}>
            <label className={estilos.marcarLinha}>
              <input type="checkbox" name="de_acordo" value="sim" required />
              <span>Li e estou de acordo com as regras da consignação da Salty Baby.</span>
            </label>
            <button type="submit" className={estilos.botaoWhats}>
              Aceitar e concluir o passo 2
            </button>
          </form>
        </section>
      </>
    );
  }

  const { fornecedora } = situacao;
  const dono = { fornecedoraId: fornecedora.id };
  if (!fornecedora.boasVindasEm) {
    // Passo 3: acabou de virar parceira.
    return (
      <>
        <Passos nomes={PASSOS} situacoes={situacaoDosPassos(3, true)} />
        <section className={estilos.parabens}>
          <h1>Parabéns, você agora é parceira da Salty Baby! 🎉</h1>
          <p>
            Seu código de fornecedora é <strong>{fornecedora.codigo}</strong>. Ele aparece no código de cada peça sua.
          </p>
        </section>
        <section className={estilos.secaoArea}>
          <p>
            Quanto mais peças, mais chances de venda! Sempre que tiver roupas, calçados ou brinquedos que não usa mais, mande
            as fotos pela sua área.
          </p>
          <details>
            <summary>Ver o acordo que você aceitou{fornecedora.termosAceitosEm && ` em ${formatarData(fornecedora.termosAceitosEm)}`}</summary>
            <TextoDoAcordo />
          </details>
          <form action={concluirBoasVindas}>
            <button type="submit" className={estilos.botaoWhats}>
              Ir para a minha área
            </button>
          </form>
        </section>
      </>
    );
  }

  return (
    <>
      <h1 className={estilos.tituloPagina}>
        Minha área de fornecedora · {fornecedora.codigo}
      </h1>
      <Passos nomes={PASSOS} situacoes={situacaoDosPassos(4, true)} />
      <EnviarPecas dono={dono} titulo="Enviar novas peças" />
      <details className={estilos.secaoArea}>
        <summary>Acordo de consignação</summary>
        <TextoDoAcordo />
      </details>
      <p>
        <Link href="/">Ver a vitrine da Salty</Link>
      </p>
    </>
  );
}
