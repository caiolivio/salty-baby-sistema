import "server-only";
import { prisma } from "../banco";
import { corteDoAcerto } from "../acertos/regras";
import { avisosPendentes } from "../alertas/servidor";
import { situacaoDoDrive } from "../backup/executar";
import { filasParaAvisar } from "../fila/servidor";
import { situacoesDosConvites } from "../fornecedoras/convites";
import { precisaDeLembrete } from "../fornecedoras/lembretes";
import { DIAS_PARADA } from "../indicadores/regras";
import { hojeEmSaoPaulo } from "../pecas/dados";
import { podeVer, temExtra, type Acesso } from "../permissoes";
import { relatoriosDoMes } from "../relatorios/servidor";
import { estaParaDoar, precisaDeAviso } from "../sacolinhas/regras";
import { alertaDoBackup, lembretesDaLoja, type AlertaDoBackup, type Lembrete } from "./regras";

// O que já existe espalhado pelo painel e precisa de atenção hoje, contado para
// a lista "Enviar hoje" e para o início do painel. Cada número só aparece para
// quem pode abrir a página dele.

export type ListaDeHoje = { chave: string; titulo: string; texto: string; quantidade: number; href: string };

const DIA = 24 * 60 * 60 * 1000;

function mesAnterior(hoje: string): string {
  const [ano, mes] = hoje.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 2, 1)).toISOString().slice(0, 7);
}

async function contarSacolinhas(agora: Date, hoje: string) {
  const abertas = await prisma.sacolinha.findMany({
    where: { situacao: { in: ["aberta", "envio_pedido"] } },
    select: { situacao: true, abertaEm: true, prazo: true, ultimoAvisoEm: true, itens: { select: { peca: { select: { status: true } } } } },
  });
  return {
    envio: abertas.filter((s) => s.situacao === "envio_pedido").length,
    avisos: abertas.filter((s) => s.situacao === "aberta" && s.itens.some((i) => i.peca.status === "na_sacolinha") && precisaDeAviso(s, agora))
      .length,
    doar: abertas.filter((s) => estaParaDoar(s, hoje)).length,
  };
}

async function fornecedorasComAcerto(hoje: string): Promise<number> {
  const itens = await prisma.itemVenda.findMany({
    where: {
      repasseRecebido: false,
      repasseCentavos: { gt: 0 },
      peca: { tipo: "consignada", fornecedoraId: { not: null } },
      venda: { data: { lte: new Date(`${corteDoAcerto(hoje)}T00:00:00Z`) } },
    },
    select: { peca: { select: { fornecedoraId: true } } },
  });
  return new Set(itens.map((i) => i.peca.fornecedoraId)).size;
}

export async function pendenciasDeHoje(
  acesso: Acesso,
  agora = new Date(),
): Promise<{ backup: AlertaDoBackup; lembretes: Lembrete[]; listas: ListaDeHoje[] }> {
  const hoje = hojeEmSaoPaulo(agora);
  const admin = acesso.administradora;
  const ve = (p: Parameters<typeof podeVer>[1]) => podeVer(acesso, p);
  const primeiraSemana = Number(hoje.slice(8, 10)) <= 7;
  const mesPassado = mesAnterior(hoje);

  const [chegada, filas, sacolinhas, convites, reservados, devolucoes, inscricoes, paradas, acertos, relatorios, ultimo, drive] =
    await Promise.all([
      ve("clientes") ? avisosPendentes() : [],
      ve("clientes") ? filasParaAvisar() : [],
      ve("sacolinhas") ? contarSacolinhas(agora, hoje) : null,
      admin ? situacoesDosConvites(agora) : [],
      ve("pedidos") ? prisma.pedido.count({ where: { status: "reservado" } }) : 0,
      ve("devolucoes") ? prisma.devolucao.count({ where: { situacao: "pedida" } }) : 0,
      ve("candidaturas") ? prisma.candidatura.count({ where: { etapa: { in: ["enviada", "acordo_aceito"] } } }) : 0,
      admin
        ? prisma.peca.count({
            where: { status: "publicada", quantidade: { gt: 0 }, publicadaEm: { lt: new Date(agora.getTime() - DIAS_PARADA * DIA) } },
          })
        : 0,
      admin && primeiraSemana ? fornecedorasComAcerto(hoje) : 0,
      admin && primeiraSemana ? relatoriosDoMes(mesPassado) : [],
      temExtra(acesso, "backup") ? prisma.backup.findFirst({ orderBy: { iniciadoEm: "desc" } }) : undefined,
      temExtra(acesso, "backup") ? situacaoDoDrive() : undefined,
    ]);

  const listas: ListaDeHoje[] = [];
  const incluir = (l: ListaDeHoje) => l.quantidade > 0 && listas.push(l);
  incluir({ chave: "reservados", titulo: "Pedidos esperando pagamento", texto: "Confira o Pix ou o cartão e confirme o pagamento.", quantidade: reservados, href: "/painel/pedidos" });
  incluir({
    chave: "fila",
    titulo: "Fila de espera: peças que voltaram",
    texto: "Avise quem estava na fila de que a peça está à venda de novo.",
    quantidade: filas.length,
    href: "/painel/clientes/avisos",
  });
  incluir({
    chave: "chegada",
    titulo: "Avisos de chegada",
    texto: "Clientes que pediram aviso e têm peças novas do jeito que querem.",
    quantidade: chegada.length,
    href: "/painel/clientes/avisos",
  });
  if (sacolinhas) {
    incluir({ chave: "envio", titulo: "Sacolinhas com envio pedido", texto: "A cliente pediu o envio: combine o frete e despache.", quantidade: sacolinhas.envio, href: "/painel/sacolinhas" });
    incluir({ chave: "sacolinha", titulo: "Aviso semanal da sacolinha", texto: "Lembrete do que está guardado e do prazo.", quantidade: sacolinhas.avisos, href: "/painel/sacolinhas?ver=avisos" });
    incluir({ chave: "doar", titulo: "Sacolinhas vencidas", texto: "O prazo acabou: confirme a doação ou mude o prazo.", quantidade: sacolinhas.doar, href: "/painel/sacolinhas?ver=doar" });
  }
  incluir({
    chave: "convites",
    titulo: "Convites para lembrar",
    texto: "Fornecedoras que não entraram ou pararam no meio do cadastro.",
    quantidade: convites.filter((c) => precisaDeLembrete(c.situacao, agora)).length,
    href: "/painel/fornecedoras",
  });
  incluir({ chave: "devolucoes", titulo: "Peças para devolver", texto: "Fornecedoras pediram peças de volta.", quantidade: devolucoes, href: "/painel/devolucoes" });
  incluir({ chave: "inscricoes", titulo: "Inscrições de fornecedora", texto: "Novas inscrições esperando a curadoria.", quantidade: inscricoes, href: "/painel/candidaturas" });
  incluir({
    chave: "paradas",
    titulo: `Peças paradas há mais de ${DIAS_PARADA} dias`,
    texto: "Sugestão: pôr numa promoção ou divulgar de novo. O preço não muda sozinho.",
    quantidade: paradas,
    href: "/painel/indicadores",
  });

  return {
    backup: ultimo === undefined || !drive ? null : alertaDoBackup(ultimo, drive.conectado, agora),
    lembretes: admin
      ? lembretesDaLoja({ hoje, acertosAPagar: acertos, relatoriosAEnviar: relatorios.filter((r) => !r.enviado).length, mesPassado })
      : [],
    listas,
  };
}
