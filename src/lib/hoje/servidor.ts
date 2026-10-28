import "server-only";
import { prisma } from "../banco";
import { estimarCriancas, mesesEntre, tamanhoDaCrianca, tamanhoParaIdade } from "../clientes/perfil";
import { lerTelefoneCliente } from "../pedidos/regras";
import { hojeEmSaoPaulo } from "../pecas/dados";
import { enderecoDaPeca } from "../vitrine";
import { lerTamanho, type Tamanho } from "../tamanhos";
import {
  aniversarioProximo,
  DIAS_PECA_VENDIDA,
  DIAS_PEDIDO_NAO_PAGO,
  DIAS_SUMIDA,
  DIAS_SUMIDA_MAXIMO,
  estaSumida,
  type TipoDeMensagem,
} from "./regras";

// Banco da lista "Enviar hoje": quem deve receber cada mensagem nova e o
// registro do que já foi enviado (tabela mensagens_enviadas).

const DIA = 24 * 60 * 60 * 1000;
/** Para a lista não ficar enorme num dia só. */
const MAXIMO_POR_LISTA = 20;

/** "Enviar no WhatsApp" ou "Copiar texto": a mensagem não aparece mais. */
export async function marcarMensagem(tipo: TipoDeMensagem, referencia: string, quem: string): Promise<void> {
  await prisma.mensagemEnviada.upsert({
    where: { tipo_referencia: { tipo, referencia } },
    create: { tipo, referencia, quem },
    update: {},
  });
}

async function jaEnviadas(tipo: TipoDeMensagem, referencias: string[]): Promise<Set<string>> {
  if (referencias.length === 0) return new Set();
  const linhas = await prisma.mensagemEnviada.findMany({ where: { tipo, referencia: { in: referencias } }, select: { referencia: true } });
  return new Set(linhas.map((l) => l.referencia));
}

/** Vendas dos últimos 14 dias com peça consignada, uma linha por venda e fornecedora ainda não avisada. */
export async function pecasVendidasParaAvisar(agora = new Date()) {
  const desde = new Date(`${hojeEmSaoPaulo(new Date(agora.getTime() - DIAS_PECA_VENDIDA * DIA))}T00:00:00Z`);
  const itens = await prisma.itemVenda.findMany({
    where: { venda: { data: { gte: desde } }, peca: { tipo: "consignada", fornecedoraId: { not: null } } },
    orderBy: { venda: { data: "desc" } },
    select: {
      vendaId: true,
      repasseCentavos: true,
      venda: { select: { data: true } },
      peca: { select: { codigo: true, nome: true, fornecedora: { select: { id: true, codigo: true, nome: true, telefone: true } } } },
    },
  });
  type Aviso = {
    referencia: string;
    dataVenda: string;
    fornecedora: { id: string; codigo: string; nome: string; telefone: string | null };
    pecas: { codigo: string; nome: string; repasseCentavos: number }[];
  };
  const grupos = new Map<string, Aviso>();
  for (const i of itens) {
    const f = i.peca.fornecedora;
    if (!f) continue;
    const referencia = `${i.vendaId}:${f.id}`;
    const aviso = grupos.get(referencia) ?? {
      referencia,
      dataVenda: i.venda.data.toISOString().slice(0, 10),
      fornecedora: { ...f, telefone: lerTelefoneCliente(f.telefone) ?? null },
      pecas: [],
    };
    aviso.pecas.push({ codigo: i.peca.codigo, nome: i.peca.nome, repasseCentavos: i.repasseCentavos });
    grupos.set(referencia, aviso);
  }
  const enviadas = await jaEnviadas("peca_vendida", [...grupos.keys()]);
  return [...grupos.values()].filter((a) => !enviadas.has(a.referencia)).slice(0, MAXIMO_POR_LISTA);
}

/**
 * Pedidos do site que venceram sem pagamento nos últimos 3 dias, com as peças
 * que ainda estão à venda. Fica de fora quem já fez outro pedido depois.
 */
export async function pedidosNaoPagos(agora = new Date()) {
  const pedidos = await prisma.pedido.findMany({
    where: { status: "expirado", vendaId: null, reservadoAte: { gte: new Date(agora.getTime() - DIAS_PEDIDO_NAO_PAGO * DIA) } },
    orderBy: { reservadoAte: "desc" },
    select: {
      id: true,
      numero: true,
      nomeCliente: true,
      telefoneCliente: true,
      criadoEm: true,
      itens: {
        select: {
          peca: { select: { codigo: true, nome: true, tamanho: true, precoCentavos: true, status: true, quantidade: true } },
        },
      },
    },
  });
  const comTelefone = pedidos
    .map((p) => ({ ...p, telefone: lerTelefoneCliente(p.telefoneCliente) ?? null }))
    .filter((p) => p.telefone);
  const telefones = [...new Set(comTelefone.map((p) => p.telefone!))];
  const outros = telefones.length
    ? await prisma.pedido.findMany({
        where: { status: { in: ["reservado", "pago"] }, telefoneCliente: { not: null } },
        select: { telefoneCliente: true, criadoEm: true },
        orderBy: { criadoEm: "desc" },
        take: 500,
      })
    : [];
  const enviadas = await jaEnviadas(
    "pedido_nao_pago",
    comTelefone.map((p) => p.id),
  );
  return comTelefone
    .filter((p) => !enviadas.has(p.id))
    .filter((p) => !outros.some((o) => lerTelefoneCliente(o.telefoneCliente) === p.telefone && o.criadoEm > p.criadoEm))
    .map((p) => ({
      id: p.id,
      numero: p.numero,
      nomeCliente: p.nomeCliente,
      telefone: p.telefone,
      pecas: p.itens
        .map((i) => i.peca)
        .filter((peca) => peca.status === "publicada" && peca.quantidade > 0)
        .map((peca) => ({ nome: peca.nome, tamanho: peca.tamanho, precoCentavos: peca.precoCentavos ?? 0, endereco: enderecoDaPeca(peca.codigo) })),
    }))
    .filter((p) => p.pecas.length > 0)
    .slice(0, MAXIMO_POR_LISTA);
}

/** Peças à venda num tamanho, desde uma data (ou todas). */
async function aVendaNoTamanho(tamanho: string, desde?: Date): Promise<number> {
  return prisma.peca.count({
    where: { status: "publicada", naoListada: false, quantidade: { gt: 0 }, tamanho, ...(desde ? { publicadaEm: { gte: desde } } : {}) },
  });
}

/**
 * Clientes com WhatsApp sem compra há 60 dias (e há menos de um ano), com as
 * novidades nos tamanhos de hoje das crianças dela (cadastradas ou estimadas
 * pelas compras). Quem recebeu esta mensagem nos últimos 60 dias fica de fora.
 */
export async function clientesSumidas(agora = new Date()) {
  const ultimas = await prisma.venda.groupBy({
    by: ["clienteId"],
    where: { clienteId: { not: null } },
    _max: { data: true },
  });
  const sumidas = ultimas
    .filter((u) => u.clienteId && u._max.data && estaSumida(u._max.data, agora))
    .sort((a, b) => b._max.data!.getTime() - a._max.data!.getTime());
  if (sumidas.length === 0) return [];
  const ids = sumidas.map((s) => s.clienteId!);
  const recentes = await prisma.mensagemEnviada.findMany({
    where: { tipo: "cliente_sumida", enviadaEm: { gte: new Date(agora.getTime() - DIAS_SUMIDA * DIA) } },
    select: { referencia: true },
  });
  const avisadas = new Set(recentes.map((r) => r.referencia.split(":")[0]));
  const clientes = await prisma.cliente.findMany({
    where: { id: { in: ids.filter((id) => !avisadas.has(id)) } },
    select: {
      id: true,
      nome: true,
      telefone: true,
      criancas: { select: { nascimento: true, tamanho: true, tamanhoEm: true } },
      vendas: {
        where: { data: { gte: new Date(agora.getTime() - (DIAS_SUMIDA_MAXIMO + 365) * DIA) } },
        select: { data: true, itens: { select: { peca: { select: { tamanho: true } } } } },
      },
    },
  });
  const ultimaDe = new Map(sumidas.map((s) => [s.clienteId!, s._max.data!]));
  const lista = [];
  for (const c of clientes) {
    const telefone = lerTelefoneCliente(c.telefone);
    if (!telefone) continue;
    const tamanhos = new Set<Tamanho>();
    for (const cr of c.criancas) {
      const t = tamanhoDaCrianca(cr, agora);
      if (t) tamanhos.add(t);
    }
    if (tamanhos.size === 0) {
      const compras = c.vendas.flatMap((v) => v.itens.map((i) => ({ data: v.data, tamanho: i.peca.tamanho })));
      for (const e of estimarCriancas(compras, agora)) tamanhos.add(e.tamanhoHoje);
    }
    const ultimaCompra = ultimaDe.get(c.id)!;
    const novidades = [];
    for (const tamanho of [...tamanhos].slice(0, 3)) {
      novidades.push({ tamanho, quantidade: await aVendaNoTamanho(tamanho, ultimaCompra) });
    }
    lista.push({ id: c.id, nome: c.nome, telefone, ultimaCompra, novidades, mes: hojeEmSaoPaulo(agora).slice(0, 7) });
    if (lista.length >= MAXIMO_POR_LISTA) break;
  }
  return lista.sort((a, b) => b.ultimaCompra.getTime() - a.ultimaCompra.getTime());
}

/** Crianças cadastradas que fazem aniversário nos próximos 7 dias, com o tamanho da nova idade. */
export async function aniversariosDaSemana(agora = new Date()) {
  const hoje = hojeEmSaoPaulo(agora);
  const criancas = await prisma.crianca.findMany({
    where: { nascimento: { not: null }, cliente: { telefone: { not: null } } },
    select: {
      id: true,
      nome: true,
      nascimento: true,
      sexo: true,
      cliente: { select: { id: true, nome: true, telefone: true } },
    },
  });
  const proximas = criancas
    .map((c) => ({ ...c, aniversario: aniversarioProximo(c.nascimento!, hoje) }))
    .filter((c) => c.aniversario && lerTelefoneCliente(c.cliente.telefone));
  const referencia = (c: (typeof proximas)[number]) => `${c.id}:${c.aniversario!.dia.slice(0, 4)}`;
  const enviadas = await jaEnviadas("aniversario", proximas.map(referencia));
  const lista = [];
  for (const c of proximas.filter((c) => !enviadas.has(referencia(c)))) {
    const dia = new Date(`${c.aniversario!.dia}T12:00:00Z`);
    const tamanho = lerTamanho(tamanhoParaIdade(mesesEntre(c.nascimento!, dia)));
    lista.push({
      referencia: referencia(c),
      crianca: { nome: c.nome, sexo: c.sexo },
      cliente: { id: c.cliente.id, nome: c.cliente.nome, telefone: lerTelefoneCliente(c.cliente.telefone)! },
      dia: c.aniversario!.dia,
      anos: c.aniversario!.anos,
      tamanho: tamanho ?? null,
      quantidade: tamanho ? await aVendaNoTamanho(tamanho) : 0,
    });
  }
  return lista.sort((a, b) => a.dia.localeCompare(b.dia)).slice(0, MAXIMO_POR_LISTA);
}
