import "server-only";
import { prisma } from "../banco";
import { formatarDataHora } from "../datas";
import { registrar, rotuloDaFornecedora } from "../historico/gravar";
import { CAMPOS_FORNECEDORA, compararParcial, type Autor } from "../historico/regras";
import { lerLoja } from "../loja/servidor";
import { blocosDoTexto, preencher, versaoDoAcordo, type Bloco } from "../paginas/regras";
import { lerPagina } from "../paginas/servidor";
import { assinarAbertura, hashDoTexto, textoParaGuardar, type DadosDoAceite } from "./contrato";

// Aceite do contrato de consignação, com as evidências (tabela aceites_contrato).

export type ContratoNaTela = { titulo: string; blocos: Bloco[]; texto: string; hash: string; versao: string };

/** O contrato como aparece agora para a fornecedora, com o hash do texto exato. */
export async function contratoParaAceite(): Promise<ContratoNaTela> {
  const [pagina, loja] = await Promise.all([lerPagina("contrato"), lerLoja()]);
  const titulo = preencher(pagina.titulo, loja);
  const conteudo = preencher(pagina.conteudo, loja);
  const texto = textoParaGuardar(titulo, conteudo);
  return {
    titulo,
    blocos: blocosDoTexto(conteudo),
    texto,
    hash: hashDoTexto(texto),
    versao: versaoDoAcordo(pagina.versao || null),
  };
}

export function segredoDoAceite(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET não configurado");
  return s;
}

/** Campo assinado com a hora em que a página do contrato foi aberta (hora do servidor). */
export function aberturaDoContrato(usuarioId: string, hash: string, agora = Date.now()): string {
  return assinarAbertura(segredoDoAceite(), usuarioId, hash, agora);
}

export type Evidencias = { abertoEm: Date; lidoAteOFimEm: Date | null; ip: string | null; navegador: string | null };

export type QuemAceita = { tipo: "fornecedora"; fornecedoraId: string } | { tipo: "candidata"; candidaturaId: string };

export type ResultadoAceite = { ok: true } | { ok: false; erro: string };

/**
 * Grava o aceite numa transação: atualiza os dados (da fornecedora ou da
 * candidatura, e o nome e e-mail da conta), marca o aceite com a versão e
 * guarda as evidências com o texto exato e o hash.
 */
export async function registrarAceite(
  usuarioId: string,
  quem: QuemAceita,
  dados: DadosDoAceite,
  contrato: ContratoNaTela,
  evidencias: Evidencias,
  agora = new Date(),
): Promise<ResultadoAceite> {
  return prisma.$transaction(async (tx) => {
    const outro = await tx.usuario.findFirst({ where: { email: dados.email, id: { not: usuarioId } }, select: { id: true } });
    if (outro) return { ok: false as const, erro: "Este e-mail já é usado por outra conta. Use outro e-mail." };

    const comum = {
      versao: contrato.versao,
      titulo: contrato.titulo.slice(0, 255),
      texto: contrato.texto,
      hash: contrato.hash,
      abertoEm: evidencias.abertoEm,
      lidoAteOFimEm: evidencias.lidoAteOFimEm,
      aceitoEm: agora,
      ip: evidencias.ip?.slice(0, 64) ?? null,
      navegador: evidencias.navegador?.slice(0, 255) ?? null,
      usuarioId,
      ...dados,
    };

    if (quem.tipo === "candidata") {
      const r = await tx.candidatura.updateMany({
        where: { id: quem.candidaturaId, usuarioId, etapa: "aprovada" },
        data: {
          nome: dados.nome,
          email: dados.email,
          telefone: dados.telefone,
          documento: dados.documento,
          pix: dados.pix,
          pixTipo: dados.pixTipo,
          recebimentoPreferido: dados.recebimentoPreferido,
          etapa: "acordo_aceito",
          acordoAceitoEm: agora,
          acordoVersao: contrato.versao,
        },
      });
      if (r.count === 0) return { ok: false as const, erro: "O contrato já foi aceito." };
      await tx.usuario.update({ where: { id: usuarioId }, data: { nome: dados.nome, email: dados.email } });
      await tx.aceiteContrato.create({ data: { ...comum, candidaturaId: quem.candidaturaId } });
      return { ok: true as const };
    }

    const antes = await tx.fornecedora.findUnique({ where: { id: quem.fornecedoraId } });
    if (!antes || antes.usuarioId !== usuarioId) return { ok: false as const, erro: "Fornecedora não encontrada." };
    if (antes.termosAceitosEm) return { ok: false as const, erro: "O contrato já foi aceito." };
    await tx.usuario.update({ where: { id: usuarioId }, data: { nome: dados.nome, email: dados.email } });
    await tx.fornecedora.update({
      where: { id: antes.id },
      data: { ...dados, termosAceitosEm: agora, termosVersao: contrato.versao },
    });
    await tx.aceiteContrato.create({ data: { ...comum, fornecedoraId: antes.id } });
    const autor: Autor = { usuarioId, nome: `${dados.nome} (fornecedora ${antes.codigo})` };
    await registrar(
      tx,
      { tabela: "fornecedora", id: antes.id, rotulo: rotuloDaFornecedora({ codigo: antes.codigo, nome: dados.nome }) },
      [
        ...compararParcial(CAMPOS_FORNECEDORA, antes, dados),
        {
          campo: "Contrato aceito",
          antes: null,
          depois: `Versão ${contrato.versao} em ${formatarDataHora(agora)} (código do texto ${contrato.hash.slice(0, 12)})`,
          restrito: false,
        },
      ],
      autor,
      "A fornecedora aceitou o contrato de consignação",
    );
    return { ok: true as const };
  });
}

/** Os aceites de uma fornecedora (e da candidatura dela), do mais novo para o mais antigo. */
export function aceitesDaFornecedora(fornecedoraId: string, candidaturaId: string | null) {
  return prisma.aceiteContrato.findMany({
    where: { OR: [{ fornecedoraId }, ...(candidaturaId ? [{ candidaturaId }] : [])] },
    orderBy: { aceitoEm: "desc" },
    select: {
      id: true,
      versao: true,
      hash: true,
      abertoEm: true,
      lidoAteOFimEm: true,
      aceitoEm: true,
      ip: true,
      navegador: true,
      nome: true,
      documento: true,
      telefone: true,
      email: true,
      pix: true,
      pixTipo: true,
      recebimentoPreferido: true,
    },
  });
}

export function aceitePorId(id: string) {
  return prisma.aceiteContrato.findUnique({ where: { id } });
}

/** O último aceite da fornecedora, com o texto que ela aceitou. */
export function ultimoAceite(fornecedoraId: string) {
  return prisma.aceiteContrato.findFirst({
    where: { fornecedoraId },
    orderBy: { aceitoEm: "desc" },
    select: { versao: true, aceitoEm: true, texto: true },
  });
}
