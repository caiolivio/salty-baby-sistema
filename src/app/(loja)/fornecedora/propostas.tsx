import { prisma } from "@/lib/banco";
import { formatarDia } from "@/lib/datas";
import { enderecoDaFoto } from "@/lib/fotos";
import estilos from "../loja.module.css";
import { tirar } from "./acoes";
import { FormularioProposta } from "./formulario-proposta";

type Dono = { candidaturaId: string } | { fornecedoraId: string };

async function MinhasPropostas({ dono }: { dono: Dono }) {
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
          <span>Enviada em {formatarDia(p.criadoEm)}</span>
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

/** Formulário para mandar peças e a lista das que já foram mandadas. */
export async function EnviarPecas({ dono, titulo }: { dono: Dono; titulo: string }) {
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
