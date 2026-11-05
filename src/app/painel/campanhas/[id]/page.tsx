import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Voltar } from "@/componentes/voltar";
import { CopiarTexto } from "@/componentes/copiar-texto";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { lerCampanhaDoBanco, ondeNaCampanha } from "@/lib/campanhas/servidor";
import { linkDaCampanha } from "@/lib/campanhas/regras";
import { dataHoraSPNoCampo } from "@/lib/cupons/regras";
import { origemDaRequisicao } from "@/lib/etiquetas";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import { apagarCampanha } from "../acoes";
import { FormularioCampanha } from "../formulario-campanha";

export const metadata: Metadata = { title: "Campanha" };

export default async function Campanha({ params, searchParams }: PageProps<"/painel/campanhas/[id]">) {
  const { id } = await params;
  await exigirAcesso("painel-administracao", `/painel/campanhas/${id}`);
  const c = await lerCampanhaDoBanco(id);
  if (!c) notFound();
  const salvo = Boolean((await searchParams).salvo);
  const origem = origemDaRequisicao(await headers());
  const [grupos, aVenda, naoListadas, cupom] = await Promise.all([
    prisma.grupoWhatsapp.findMany({ where: { ativo: true }, orderBy: [{ ordem: "asc" }, { nome: "asc" }], select: { nome: true, codigo: true } }),
    prisma.peca.count({ where: ondeNaCampanha(c) }),
    prisma.peca.count({ where: { ...ondeNaCampanha(c), naoListada: true } }),
    c.cupom ? prisma.cupom.findUnique({ where: { codigo: c.cupom }, select: { id: true, ativo: true } }) : null,
  ]);
  const link = linkDaCampanha(origem, c.codigo);

  return (
    <>
      <Voltar href="/painel/campanhas">Campanhas</Voltar>
      <h1 className={estilos.titulo}>{c.nome}</h1>
      {salvo && <p className={proprios.aviso}>Campanha salva.</p>}
      <p>
        {aVenda === 1 ? "1 peça à venda" : `${aVenda} peças à venda`} nos tamanhos {c.tamanhos.join(", ")}
        {naoListadas > 0 && `, ${naoListadas} delas como Não listado (só quem tem o link vê)`}.{" "}
        <Link href={`/painel/pecas?status=nao_listada`}>Ver as Não listado</Link>
      </p>
      {c.cupom && !cupom && (
        <p className={proprios.erro} role="alert">
          O cupom {c.cupom} não existe em Cupons. Crie o cupom com esse código ou mude o campo abaixo.
        </p>
      )}
      {cupom && !cupom.ativo && (
        <p className={proprios.erro} role="alert">
          O cupom {c.cupom} está pausado. <Link href={`/painel/cupons/${cupom.id}`}>Abrir o cupom</Link>
        </p>
      )}
      <section aria-labelledby="links">
        <h2 id="links">Links para divulgar</h2>
        <p className={proprios.dica}>Use o link do grupo onde você vai postar: as vendas contam para ele no WhatsApp Marketing.</p>
        <ul className={estilos.listaSimples}>
          <li>
            <a href={link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="icone" aria-hidden /> Abrir a página
            </a>{" "}
            · <CopiarTexto texto={link} rotulo="Copiar o link (Instagram e outros)" className={proprios.botaoSecundario} />
          </li>
          {grupos.map((g) => (
            <li key={g.codigo}>
              Grupo {g.nome}:{" "}
              <CopiarTexto texto={linkDaCampanha(origem, c.codigo, g.codigo)} rotulo="Copiar o link" className={proprios.botaoSecundario} />
            </li>
          ))}
        </ul>
      </section>
      <FormularioCampanha
        tamanhosIniciais={c.tamanhos}
        iniciais={{
          id: c.id,
          nome: c.nome,
          codigo: c.codigo,
          titulo: c.titulo,
          texto: c.texto ?? "",
          faixa: c.faixa ?? "",
          ate: dataHoraSPNoCampo(c.ate ? c.ate.toISOString() : null),
          cupom: c.cupom ?? "",
          ativa: c.ativa ? "on" : "",
        }}
      />
      <form action={apagarCampanha} className={proprios.formulario}>
        <input type="hidden" name="id" value={c.id} />
        <button type="submit" className={proprios.botaoPerigo}>
          Excluir a campanha
        </button>
        <span className={proprios.dica}>As peças não mudam. Só a página e a faixa saem do ar.</span>
      </form>
    </>
  );
}
