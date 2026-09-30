// Transforma as bases exportadas do Notion ("Organiza Brechó 2.0") num plano de
// importação, aplicando as decisões da seção "Importação do Notion" do CLAUDE.md.
// Não grava nada: quem grava é gravar.ts. Assim a administradora vê o resumo
// antes, e os testes conferem as regras sem banco.

import { calcularRepasse, distribuirDesconto } from "../calculos";
import { chaveSequenciaPeca, CHAVE_SEQUENCIA_FORNECEDORA, codigoFornecedora, codigoPeca, PREFIXO_LOJA } from "../codigos";
import { lerTamanho, type Tamanho } from "../tamanhos";
import { lerCsv } from "./csv";

/** A F43 (Ana Carolina) é a dona da Salty: as peças dela são da loja. */
export const FORNECEDORA_DONA = "F43";
export const REPASSE_PADRAO = 4000;

export type ArquivosNotion = { produtos: string; fornecedoras: string; clientes: string; vendas: string };

type Canal = "site" | "whatsapp_privado" | "grupo_whatsapp" | "instagram" | "loja" | "bag";
type Pagamento = "pix" | "cartao" | "dinheiro" | "credito_fornecedora";
type Status = "rascunho" | "publicada" | "vendida" | "enviada";

export type FornecedoraPlano = {
  numero: number;
  codigo: string;
  nome: string;
  telefone?: string;
  email?: string;
  documento?: string;
  pix?: string;
  endereco?: string;
  cep?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
};

export type PecaPlano = {
  codigo: string;
  codigoAntigo: string;
  /** Como a peça se chamava no Notion ("Body - F41-0003"): liga a peça às vendas antigas. */
  produtoNotion: string;
  nome: string;
  tipo: "consignada" | "loja";
  codigoFornecedora?: string;
  percentualRepasse?: number;
  precoCentavos: number;
  custoCentavos?: number;
  quantidade: number;
  tamanho?: Tamanho;
  conservacao?: "nova_com_etiqueta" | "seminova";
  variacao?: string;
  marca?: string;
  cor?: string;
  status: Status;
  /** aaaa-mm-dd */
  dataEntrada: string;
  /** Nome do arquivo da foto dentro do export. */
  foto?: string;
  avisos: string[];
};

export type ClientePlano = {
  nome: string;
  telefone?: string;
  email?: string;
  cpf?: string;
  endereco?: string;
  cep?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
};

export type ItemVendaPlano = {
  codigoPeca: string;
  quantidade: number;
  precoUnitarioCentavos: number;
  descontoCentavos: number;
  valorPagoCentavos: number;
  percentualRepasse?: number;
  repasseCentavos: number;
  custoCentavos?: number;
  lucroCentavos: number;
  repasseRecebido: boolean;
  repasseRecebidoEm?: string;
};

export type VendaPlano = {
  origem: string;
  data: string;
  cliente?: string;
  canal: Canal;
  formaPagamento?: Pagamento;
  subtotalCentavos: number;
  descontoCentavos: number;
  totalCentavos: number;
  itens: ItemVendaPlano[];
};

export type PlanoImportacao = {
  fornecedoras: FornecedoraPlano[];
  pecas: PecaPlano[];
  clientes: ClientePlano[];
  vendas: VendaPlano[];
  /** Último número usado em cada sequência, para os próximos códigos continuarem daí. */
  sequencias: Record<string, number>;
  avisos: string[];
};

// ---------------------------------------------------------------------------
// Leitura dos campos no formato do Notion

const semEspacos = (t: string | undefined) => (t ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
const opcional = (t: string | undefined) => semEspacos(t) || undefined;

/** "R$ 1.234,56" → 123456 centavos. Vazio vira 0. */
export function lerReais(texto: string | undefined): number {
  const t = semEspacos(texto).replace(/^R\$\s*/, "").replace(/\./g, "");
  if (!t) return 0;
  const m = /^(-?)(\d+)(?:,(\d{1,2}))?$/.exec(t);
  if (!m) throw new Error(`valor em reais não reconhecido: "${texto}"`);
  const centavos = Number(m[2]) * 100 + Number((m[3] ?? "0").padEnd(2, "0"));
  return m[1] ? -centavos : centavos;
}

/** "12", "12.5" ou "12,50" (colunas numéricas das vendas) → centavos, sem usar float. */
export function lerNumeroReais(texto: string | undefined): number {
  const t = semEspacos(texto).replace(",", ".");
  if (!t) return 0;
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(t);
  if (!m) throw new Error(`valor não reconhecido: "${texto}"`);
  return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
}

/** "40%" → 4000 pontos-base. */
export function lerPercentual(texto: string | undefined): number | undefined {
  const t = semEspacos(texto).replace("%", "").replace(",", ".");
  if (!t) return undefined;
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(t);
  if (!m) throw new Error(`percentual não reconhecido: "${texto}"`);
  return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
}

/** "28/11/2025" → "2025-11-28". */
export function lerData(texto: string | undefined): string | undefined {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(semEspacos(texto));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
}

/** "Nome (Nome%20abc123.md)" → "Nome": o texto antes do link do Notion. */
export function textoDoVinculo(celula: string | undefined): string {
  return semEspacos(celula).replace(/\s*\([^()]*\.md\)$/, "");
}

const codigoNoTexto = (texto: string) => /\b(F\d+)\b/.exec(texto)?.[1];

// ---------------------------------------------------------------------------

export function prepararImportacao(arquivos: ArquivosNotion): PlanoImportacao {
  const avisos: string[] = [];
  const fornecedoras = prepararFornecedoras(lerCsv(arquivos.fornecedoras), avisos);
  const pecas = prepararPecas(lerCsv(arquivos.produtos), fornecedoras, avisos);
  const clientes = prepararClientes(lerCsv(arquivos.clientes));
  const vendas = prepararVendas(lerCsv(arquivos.vendas), lerCsv(arquivos.produtos), pecas, clientes, avisos);

  const sequencias: Record<string, number> = {
    [CHAVE_SEQUENCIA_FORNECEDORA]: Math.max(0, ...fornecedoras.map((f) => f.numero)),
  };
  for (const peca of pecas) {
    const prefixo = peca.codigo.split("-")[0];
    sequencias[chaveSequenciaPeca(prefixo)] = Math.max(sequencias[chaveSequenciaPeca(prefixo)] ?? 0, Number(peca.codigo.split("-")[1]));
  }

  return { fornecedoras, pecas, clientes, vendas, sequencias, avisos };
}

function prepararFornecedoras(linhas: Record<string, string>[], avisos: string[]): FornecedoraPlano[] {
  const lista: FornecedoraPlano[] = [];
  for (const l of linhas) {
    const completo = semEspacos(l["Nome"]);
    if (!completo) continue;
    const m = /^(.*?)\s*-?\s*F(\d+)$/.exec(completo);
    if (!m) {
      avisos.push(`Fornecedora sem código no nome, não importada: "${completo}".`);
      continue;
    }
    const numero = Number(m[2]);
    if (lista.some((f) => f.numero === numero)) {
      avisos.push(`Código ${codigoFornecedora(numero)} aparece em duas fornecedoras; ficou só a primeira.`);
      continue;
    }
    lista.push({
      numero,
      codigo: codigoFornecedora(numero),
      nome: m[1].trim(),
      telefone: opcional(l["Tel / WhatsApp"]),
      email: opcional(l["E-mail"]),
      documento: opcional(l["CPF / CNPJ"]),
      pix: opcional(l["Pix"]),
      endereco: opcional(l["Endereço"]),
      cep: opcional(l["CEP"]),
      cidade: opcional(l["Cidade"]),
      estado: opcional(l["Estado"]),
      pais: opcional(l["País"]),
    });
  }
  return lista.sort((a, b) => a.numero - b.numero);
}

/** A peça e o que decide a ordem da numeração nova. */
type Rascunho = { peca: PecaPlano; grupo: string; numeroAntigo: number; ordemData: string };

function prepararPecas(
  linhas: Record<string, string>[],
  fornecedoras: FornecedoraPlano[],
  avisos: string[],
): PecaPlano[] {
  const rascunhos: Rascunho[] = [];
  let semPercentual = 0;

  for (const l of linhas) {
    const produto = semEspacos(l["Produto"]);
    if (!produto) continue;
    const m = /^(.*?)\s*-?\s*(F\d+)\s*-\s*(\d+)$/.exec(produto);
    if (!m) {
      avisos.push(`Peça sem código antigo reconhecível, não importada: "${produto}".`);
      continue;
    }
    const nome = m[1].replace(/[\s-]+$/, "").trim();
    const numeroAntigo = Number(m[3]);
    const codigoAntigo = `${m[2]}-${String(numeroAntigo).padStart(4, "0")}`;
    const pecaAvisos: string[] = [];

    // A fornecedora vem do vínculo da peça, não do código antigo.
    const codigoVinculo = codigoNoTexto(textoDoVinculo(l["*Fornecedor"]));
    const loja = semEspacos(l["Consignado"]) !== "Sim" || codigoVinculo === FORNECEDORA_DONA;
    if (!loja && !codigoVinculo) pecaAvisos.push("Sem fornecedora vinculada no Notion.");
    if (!loja && codigoVinculo && codigoVinculo !== m[2]) {
      pecaAvisos.push(`O código antigo dizia ${m[2]}, mas a fornecedora vinculada é ${codigoVinculo}.`);
    }
    if (!loja && codigoVinculo && !fornecedoras.some((f) => f.codigo === codigoVinculo)) {
      pecaAvisos.push(`A fornecedora ${codigoVinculo} não está na base de fornecedoras.`);
    }

    let percentual: number | undefined;
    if (!loja) {
      percentual = lerPercentual(l["% Repasse"]);
      if (percentual === undefined) {
        percentual = REPASSE_PADRAO;
        semPercentual++;
      } else if (percentual === 100) {
        // Macaquinho F10-0000: 1% foi erro de digitação (decisão do Caio).
        pecaAvisos.push("Repasse de 1% corrigido para 40%.");
        percentual = REPASSE_PADRAO;
      }
    }

    const variacaoNotion = semEspacos(l["Variação"]);
    const conservacao =
      variacaoNotion === "Usado" ? "seminova" : variacaoNotion === "Novo" ? "nova_com_etiqueta" : undefined;
    const tamanhoTexto = semEspacos(l["Tamanho"]);
    const tamanho = lerTamanho(tamanhoTexto);
    if (tamanhoTexto && !tamanho) pecaAvisos.push(`Tamanho "${tamanhoTexto}" não reconhecido.`);

    const dataEntrada = lerData(l["*Data"]);
    if (!dataEntrada) pecaAvisos.push("Sem data de entrada.");
    const estoque = Number(semEspacos(l["Estoque_"]) || "0");
    if (estoque < 0) pecaAvisos.push(`O Notion mostrava estoque ${estoque} (mais vendas do que peças).`);
    const marca = opcional(l["Marca"]);
    const foto = opcional(l["Imagem"]);

    const peca: PecaPlano = {
      codigo: "",
      codigoAntigo,
      produtoNotion: produto,
      nome,
      tipo: loja ? "loja" : "consignada",
      codigoFornecedora: loja ? undefined : codigoVinculo,
      percentualRepasse: percentual,
      precoCentavos: lerReais(l["*Valor Venda / Unidade"]),
      custoCentavos: loja && opcional(l["Custo / Unidade"]) ? lerReais(l["Custo / Unidade"]) : undefined,
      quantidade: Math.max(0, estoque),
      tamanho,
      conservacao,
      variacao: conservacao ? undefined : variacaoNotion || undefined,
      marca,
      cor: opcional(l["Cor"]),
      status: estoque > 0 ? "publicada" : "rascunho",
      dataEntrada: dataEntrada ?? new Date().toISOString().slice(0, 10),
      foto: foto ? decodeURIComponent(foto) : undefined,
      avisos: pecaAvisos,
    };
    rascunhos.push({
      peca,
      grupo: loja ? PREFIXO_LOJA : (codigoVinculo ?? m[2]),
      numeroAntigo,
      ordemData: dataEntrada ?? "9999-12-31",
    });
  }

  if (semPercentual > 0) {
    avisos.push(`${semPercentual} peça(s) consignada(s) sem % de repasse no Notion receberam o padrão de 40%.`);
  }

  const repetidos = new Map<string, number>();
  for (const { peca } of rascunhos) repetidos.set(peca.codigoAntigo, (repetidos.get(peca.codigoAntigo) ?? 0) + 1);
  for (const { peca } of rascunhos) {
    if ((repetidos.get(peca.codigoAntigo) ?? 0) > 1) peca.avisos.push(`O código antigo ${peca.codigoAntigo} também está em outra peça.`);
  }

  // Numeração nova: por fornecedora (SB primeiro), na ordem de entrada e, no
  // mesmo dia, na ordem do código antigo.
  const ordemGrupo = (g: string) => (g === PREFIXO_LOJA ? 0 : Number(g.slice(1)));
  rascunhos.sort(
    (a, b) =>
      ordemGrupo(a.grupo) - ordemGrupo(b.grupo) ||
      a.ordemData.localeCompare(b.ordemData) ||
      a.numeroAntigo - b.numeroAntigo,
  );
  const contador = new Map<string, number>();
  for (const r of rascunhos) {
    const n = (contador.get(r.grupo) ?? 0) + 1;
    contador.set(r.grupo, n);
    r.peca.codigo = codigoPeca(r.grupo, n);
  }
  return rascunhos.map((r) => r.peca);
}

function prepararClientes(linhas: Record<string, string>[]): ClientePlano[] {
  return linhas
    .filter((l) => semEspacos(l["Nome"]))
    .map((l) => ({
      nome: semEspacos(l["Nome"]),
      telefone: opcional(l["Tel / WhatsApp"]),
      email: opcional(l["E-mail"]),
      cpf: opcional(l["CPF"]),
      endereco: opcional(l["Endereço"]),
      cep: opcional(l["CEP"]),
      cidade: opcional(l["Cidade"]),
      estado: opcional(l["Estado"]),
      pais: opcional(l["País"]),
    }));
}

const CANAIS: Record<string, Canal> = {
  whatsapp: "whatsapp_privado",
  bag: "bag",
  instagram: "instagram",
  loja: "loja",
  site: "site",
};

function lerPagamento(texto: string): Pagamento | undefined {
  const t = texto.toLowerCase();
  if (t.includes("pix")) return "pix";
  if (t.includes("cart")) return "cartao";
  if (t.includes("dinheiro")) return "dinheiro";
  if (t.includes("crédito") || t.includes("credito")) return "credito_fornecedora";
  return undefined;
}

type ItemEmMontagem = ItemVendaPlano & { acertado: boolean };

function prepararVendas(
  linhas: Record<string, string>[],
  produtos: Record<string, string>[],
  pecas: PecaPlano[],
  clientes: ClientePlano[],
  avisos: string[],
): VendaPlano[] {
  // O nome completo do Notion ("Body - F41-0003") não se repete entre as peças.
  const pecaPorNome = new Map(pecas.map((p) => [p.produtoNotion, p]));
  const linhaPorNome = new Map(produtos.map((l) => [semEspacos(l["Produto"]), l]));

  const vendas: VendaPlano[] = [];
  const itensPorPeca = new Map<string, ItemEmMontagem[]>();
  const enviadaPorPeca = new Map<string, boolean[]>();

  for (const l of linhas) {
    const origem = semEspacos(l["Venda"]);
    if (!origem) continue;
    // As colunas de quantidade se chamam "Qtd", "Qtdㅤ", "Qtdㅤㅤ"… (com um caractere invisível a mais em cada).
    const colunasQtd = Object.keys(l).filter((k) => k.startsWith("Qtd")).sort((a, b) => a.length - b.length);

    const itens: { peca: PecaPlano; quantidade: number; unitario: number }[] = [];
    for (let i = 1; i <= 5; i++) {
      const nome = textoDoVinculo(l[`Produto ${i}`]);
      if (!nome) continue;
      const quantidade = Number(semEspacos(l[colunasQtd[i - 1]]) || "0");
      if (quantidade <= 0) {
        avisos.push(`Venda "${origem}": "${nome}" está na venda sem quantidade e não foi contada (como no Notion).`);
        continue;
      }
      const peca = pecaPorNome.get(nome);
      if (!peca) {
        avisos.push(`Venda "${origem}": a peça "${nome}" não foi encontrada e ficou fora da venda.`);
        continue;
      }
      itens.push({ peca, quantidade, unitario: lerNumeroReais(l[`Valor_Un_Prod_${i}`]) });
    }
    if (itens.length === 0) continue; // venda vazia no Notion

    const data = lerData(l["*Data da Venda"]);
    if (!data) avisos.push(`Venda "${origem}" sem data.`);
    const canalTexto = semEspacos(l["Canal de Venda"]);
    const canal = CANAIS[canalTexto.toLowerCase()];
    if (!canal) avisos.push(`Venda "${origem}": canal "${canalTexto}" não reconhecido, ficou como WhatsApp privado.`);

    const brutos = itens.map((it) => it.unitario * it.quantidade);
    const subtotal = brutos.reduce((a, b) => a + b, 0);
    const desconto = Math.min(lerReais(l["Desconto"]), subtotal);
    // O desconto do pedido é dividido entre as peças, na proporção do preço.
    const pagos = distribuirDesconto(brutos, desconto);
    const enviada = semEspacos(l["Envio"]) === "Enviado";

    const itensVenda = itens.map(({ peca, quantidade, unitario }, i) => {
      const linhaProduto = linhaPorNome.get(peca.produtoNotion) ?? {};
      const acertado = peca.tipo === "consignada" && semEspacos(linhaProduto["Acerto"]) === "Acertado";
      const custo = peca.tipo === "loja" && peca.custoCentavos !== undefined ? peca.custoCentavos * quantidade : undefined;
      const item: ItemEmMontagem = {
        codigoPeca: peca.codigo,
        quantidade,
        precoUnitarioCentavos: unitario,
        descontoCentavos: brutos[i] - pagos[i],
        valorPagoCentavos: pagos[i],
        percentualRepasse: peca.percentualRepasse,
        // Em aberto: recalculado sobre o valor com desconto (o Notion usou o preço cheio).
        repasseCentavos: peca.percentualRepasse === undefined ? 0 : calcularRepasse(pagos[i], peca.percentualRepasse),
        custoCentavos: custo,
        lucroCentavos: 0,
        repasseRecebido: acertado,
        repasseRecebidoEm: acertado ? lerData(linhaProduto["Data do Acerto"]) : undefined,
        acertado,
      };
      itensPorPeca.set(peca.codigo, [...(itensPorPeca.get(peca.codigo) ?? []), item]);
      enviadaPorPeca.set(peca.codigo, [...(enviadaPorPeca.get(peca.codigo) ?? []), enviada]);
      return item;
    });

    const nomeCliente = textoDoVinculo(l["Cliente"]) || undefined;
    if (nomeCliente && !clientes.some((c) => c.nome === nomeCliente)) clientes.push({ nome: nomeCliente });

    vendas.push({
      origem: `Notion: ${origem}`,
      data: data ?? new Date().toISOString().slice(0, 10),
      cliente: nomeCliente,
      canal: canal ?? "whatsapp_privado",
      formaPagamento: lerPagamento(semEspacos(l["Forma de Pagamento"])),
      subtotalCentavos: subtotal,
      descontoCentavos: desconto,
      totalCentavos: subtotal - desconto,
      itens: itensVenda,
    });
  }

  for (const peca of pecas) {
    const itens = itensPorPeca.get(peca.codigo) ?? [];
    const linha = linhaPorNome.get(peca.produtoNotion) ?? {};

    // Repasse já acertado: vale o que o Notion registrou (o que a fornecedora
    // recebeu), dividido entre as vendas acertadas da peça.
    const acertados = itens.filter((i) => i.acertado);
    if (acertados.length > 0) {
      const total = lerReais(linha["A Repassar"]);
      acertados.forEach((item, i) => {
        item.repasseCentavos = Math.floor(total / acertados.length) + (i < total % acertados.length ? 1 : 0);
      });
    }
    for (const item of itens) {
      item.lucroCentavos = item.valorPagoCentavos - item.repasseCentavos - (item.custoCentavos ?? 0);
    }

    const vendidas = itens.reduce((a, i) => a + i.quantidade, 0);
    const cadastradas = Number(semEspacos(linha["*Quantidade"]) || "0");
    if (vendidas > cadastradas) peca.avisos.push(`Vendida ${vendidas} vez(es), mas a quantidade cadastrada era ${cadastradas}.`);

    if (peca.quantidade > 0) continue;
    if (itens.length > 0) {
      peca.status = (enviadaPorPeca.get(peca.codigo) ?? []).every(Boolean) ? "enviada" : "vendida";
    } else {
      peca.avisos.push(
        semEspacos(linha["Vendido?"]).includes("Sim")
          ? "Marcada como vendida no Notion, mas não aparece em nenhuma venda. Ficou como rascunho."
          : "Sem estoque e sem venda no Notion. Ficou como rascunho.",
      );
    }
  }

  // Tira o campo de trabalho antes de devolver.
  for (const venda of vendas) {
    venda.itens = venda.itens.map((item) => {
      const { acertado, ...resto } = item as ItemEmMontagem;
      void acertado;
      return resto;
    });
  }
  return vendas;
}
