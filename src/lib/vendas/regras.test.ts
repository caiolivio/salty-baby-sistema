import { describe, expect, it } from "vitest";
import { SEM_DESCONTO, type PlanoDeDesconto } from "./descontos";
import { calcularItens, lerConfirmacao, lerVendaDireta, type PecaParaVender } from "./regras";

const consignada = (id: string, preco: number, percentual: number | null = null): PecaParaVender => ({
  id,
  codigo: id.toUpperCase(),
  tipo: "consignada",
  precoCentavos: preco,
  percentualRepasse: percentual,
  percentualPadraoFornecedora: 4000,
  custoCentavos: null,
});
const daLoja = (id: string, preco: number, custo: number): PecaParaVender => ({
  id,
  codigo: id.toUpperCase(),
  tipo: "loja",
  precoCentavos: preco,
  percentualRepasse: null,
  percentualPadraoFornecedora: null,
  custoCentavos: custo,
});

const noCarrinho = (valor: number, quem: "dividido" | "loja" | "fornecedora" = "dividido"): PlanoDeDesconto => ({
  carrinho: { modo: "reais", valor, quem },
  porPeca: {},
  motivo: null,
});

function itensDe(pecas: PecaParaVender[], plano: PlanoDeDesconto) {
  const r = calcularItens(pecas, plano);
  if (!r.ok) throw new Error(r.erro);
  return r.itens;
}

describe("calcularItens", () => {
  it("exemplo do CLAUDE.md: R$ 30 e R$ 10 com desconto de R$ 4 e 40% de repasse", () => {
    const itens = itensDe([consignada("a", 3000), consignada("b", 1000)], noCarrinho(400));
    expect(itens.map((i) => i.valorPagoCentavos)).toEqual([2700, 900]);
    expect(itens.map((i) => i.descontoCentavos)).toEqual([300, 100]);
    expect(itens.map((i) => i.repasseCentavos)).toEqual([1080, 360]);
    expect(itens.map((i) => i.lucroCentavos)).toEqual([1620, 540]);
    expect(itens.map((i) => i.descontoPorConta)).toEqual(["dividido", "dividido"]);
  });

  it("sem desconto: R$ 15 com 40% dá R$ 6 de repasse e R$ 9 de lucro", () => {
    const [item] = itensDe([consignada("a", 1500)], SEM_DESCONTO);
    expect(item).toMatchObject({
      valorPagoCentavos: 1500,
      repasseCentavos: 600,
      lucroCentavos: 900,
      percentualRepasse: 4000,
      descontoPorConta: null,
    });
  });

  it("usa o percentual da peça quando ele existe", () => {
    const [item] = itensDe([consignada("a", 1000, 5000)], SEM_DESCONTO);
    expect(item).toMatchObject({ percentualRepasse: 5000, repasseCentavos: 500 });
  });

  it("peça da loja não tem repasse e o lucro desconta o custo", () => {
    const [item] = itensDe([daLoja("s", 2000, 800)], SEM_DESCONTO);
    expect(item).toMatchObject({ repasseCentavos: 0, lucroCentavos: 1200, custoCentavos: 800, percentualRepasse: null });
  });

  it("a soma dos valores pagos é sempre o total menos o desconto", () => {
    const itens = itensDe([consignada("a", 999), consignada("b", 1001), consignada("c", 333)], noCarrinho(100));
    expect(itens.reduce((s, i) => s + i.valorPagoCentavos, 0)).toBe(999 + 1001 + 333 - 100);
  });

  describe("quem paga o desconto (peça de R$ 50, 40%, R$ 10 de desconto)", () => {
    const peca = [consignada("a", 5000)];
    it("dividido: ela recebe R$ 16 e a loja fica com R$ 24", () => {
      expect(itensDe(peca, noCarrinho(1000, "dividido"))[0]).toMatchObject({ valorPagoCentavos: 4000, repasseCentavos: 1600, lucroCentavos: 2400 });
    });
    it("por conta da loja: ela recebe R$ 20 e a loja fica com R$ 20", () => {
      expect(itensDe(peca, noCarrinho(1000, "loja"))[0]).toMatchObject({
        valorPagoCentavos: 4000,
        repasseCentavos: 2000,
        lucroCentavos: 2000,
        descontoPorConta: "loja",
      });
    });
    it("por conta da fornecedora: ela recebe R$ 10 e a loja fica com R$ 30", () => {
      expect(itensDe(peca, noCarrinho(1000, "fornecedora"))[0]).toMatchObject({
        valorPagoCentavos: 4000,
        repasseCentavos: 1000,
        lucroCentavos: 3000,
        descontoPorConta: "fornecedora",
      });
    });
    it("por conta da fornecedora não pode passar do repasse dela", () => {
      const r = calcularItens(peca, noCarrinho(2001, "fornecedora"));
      expect(r).toEqual({ ok: false, erro: expect.stringContaining("passa do valor que ela receberia") });
      expect(itensDe(peca, noCarrinho(2000, "fornecedora"))[0].repasseCentavos).toBe(0);
    });
  });

  it("desconto por peça só mexe naquela peça; o do carrinho vem depois, sobre o que sobrou", () => {
    const itens = itensDe([consignada("a", 3000), consignada("b", 1000)], {
      carrinho: { modo: "reais", valor: 300, quem: "dividido" },
      porPeca: { a: { tipo: "reais", valor: 1000, quem: "loja" } },
      motivo: null,
    });
    // a: 30 - 10 = 20; b: 10. Carrinho de R$ 3 dividido 2:1 → a paga 18, b paga 9.
    expect(itens.map((i) => i.valorPagoCentavos)).toEqual([1800, 900]);
    expect(itens.map((i) => i.descontoCentavos)).toEqual([1200, 100]);
    // a: repasse sobre 30 - 2 (só a parte dividida) = 11,20; b: 40% de 9 = 3,60.
    expect(itens.map((i) => i.repasseCentavos)).toEqual([1120, 360]);
    expect(itens.map((i) => i.descontoPorConta)).toEqual(["misto", "dividido"]);
  });

  it("desconto por peça em %", () => {
    const [a, b] = itensDe([consignada("a", 3000), consignada("b", 1000)], {
      carrinho: null,
      porPeca: { b: { tipo: "percentual", valor: 1000, quem: "dividido" } },
      motivo: null,
    });
    expect([a.valorPagoCentavos, b.valorPagoCentavos]).toEqual([3000, 900]);
    expect(a.descontoPorConta).toBeNull();
  });

  it("carrinho em % e em valor pago", () => {
    const pecas = [consignada("a", 3000), consignada("b", 1000)];
    const pct = itensDe(pecas, { carrinho: { modo: "percentual", valor: 1000, quem: "dividido" }, porPeca: {}, motivo: null });
    expect(pct.map((i) => i.valorPagoCentavos)).toEqual([2700, 900]);
    const pago = itensDe(pecas, { carrinho: { modo: "valor_pago", valor: 3500, quem: "dividido" }, porPeca: {}, motivo: null });
    expect(pago.reduce((s, i) => s + i.valorPagoCentavos, 0)).toBe(3500);
  });

  it("peça da loja: o desconto é sempre da loja e pode dar prejuízo", () => {
    const [item] = itensDe([daLoja("s", 2000, 1500)], noCarrinho(1000, "fornecedora"));
    expect(item).toMatchObject({ repasseCentavos: 0, lucroCentavos: -500, descontoPorConta: "loja" });
  });

  it("recusa desconto maior que o preço da peça ou que o total", () => {
    const pecas = [consignada("a", 1000)];
    expect(calcularItens(pecas, noCarrinho(1001))).toEqual({ ok: false, erro: "O desconto do carrinho não pode ser maior que o total (R$ 10,00)." });
    expect(
      calcularItens(pecas, { carrinho: null, porPeca: { a: { tipo: "reais", valor: 1001, quem: "loja" } }, motivo: null }),
    ).toEqual({ ok: false, erro: "O desconto da peça A não pode ser maior que o preço dela." });
    expect(calcularItens(pecas, { carrinho: { modo: "valor_pago", valor: 1200, quem: "loja" }, porPeca: {}, motivo: null }).ok).toBe(
      false,
    );
  });
});

describe("lerConfirmacao", () => {
  const pecas = [
    { id: "a", codigo: "F01-00001", precoCentavos: 3000 },
    { id: "b", codigo: "F02-00001", precoCentavos: 1000 },
  ];
  it("aceita forma, desconto em reais e destino", () => {
    expect(lerConfirmacao({ forma: "pix", desconto: "5,50", destino: "na_sacolinha" }, pecas)).toEqual({
      ok: true,
      dados: {
        forma: "pix",
        desconto: { carrinho: { modo: "reais", valor: 550, quem: "dividido" }, porPeca: {}, motivo: null },
        destino: "na_sacolinha",
      },
    });
    expect(lerConfirmacao({ forma: "dinheiro" }, pecas)).toEqual({
      ok: true,
      dados: { forma: "dinheiro", desconto: SEM_DESCONTO, destino: "vendida" },
    });
  });

  it("lê % no carrinho, valor pago, desconto por peça, quem paga e o motivo", () => {
    const r = lerConfirmacao(
      {
        forma: "pix",
        desconto_modo: "percentual",
        desconto: "7,5",
        desconto_quem: "loja",
        "peca_desconto:b": "2",
        "peca_tipo:b": "reais",
        "peca_quem:b": "fornecedora",
        "peca_desconto:a": "",
        desconto_motivo: " cliente fiel ",
      },
      pecas,
    );
    expect(r).toEqual({
      ok: true,
      dados: {
        forma: "pix",
        destino: "vendida",
        desconto: {
          carrinho: { modo: "percentual", valor: 750, quem: "loja" },
          porPeca: { b: { tipo: "reais", valor: 200, quem: "fornecedora" } },
          motivo: "cliente fiel",
        },
      },
    });
    const pago = lerConfirmacao({ forma: "pix", desconto_modo: "valor_pago", desconto: "35" }, pecas);
    expect(pago.ok && pago.dados.desconto.carrinho).toEqual({ modo: "valor_pago", valor: 3500, quem: "dividido" });
  });

  it("recusa forma vazia, desconto inválido ou maior que o total", () => {
    expect(lerConfirmacao({}, pecas).ok).toBe(false);
    expect(lerConfirmacao({ forma: "pix", desconto: "abc" }, pecas).ok).toBe(false);
    expect(lerConfirmacao({ forma: "pix", desconto: "-2" }, pecas).ok).toBe(false);
    expect(lerConfirmacao({ forma: "pix", desconto: "50" }, pecas)).toEqual({
      ok: false,
      erro: "O desconto do carrinho não pode ser maior que o total (R$ 40,00).",
    });
    expect(lerConfirmacao({ forma: "pix", desconto_modo: "percentual", desconto: "120" }, pecas).ok).toBe(false);
    expect(lerConfirmacao({ forma: "pix", desconto_modo: "valor_pago", desconto: "0" }, pecas).ok).toBe(false);
    expect(lerConfirmacao({ forma: "pix", "peca_desconto:b": "11" }, pecas)).toEqual({
      ok: false,
      erro: "O desconto da peça F02-00001 não pode ser maior que o preço dela.",
    });
  });
});

describe("venda direta no painel", () => {
  const hoje = "2026-09-30";
  const pecas = [{ id: "a", precoCentavos: 3000 }];
  const grupos = [
    { id: "g1", nome: "Menino" },
    { id: "g2", nome: "Meninas" },
  ];
  it("lê canal, grupo, data e pagamento", () => {
    expect(
      lerVendaDireta({ canal: "grupo_whatsapp", grupo: "g2", forma: "pix", desconto: "2", data: "2026-09-29" }, pecas, hoje, grupos),
    ).toEqual({
      ok: true,
      dados: {
        canal: "grupo_whatsapp",
        grupo: "Meninas",
        grupoId: "g2",
        forma: "pix",
        desconto: { carrinho: { modo: "reais", valor: 200, quem: "dividido" }, porPeca: {}, motivo: null },
        destino: "vendida",
        data: "2026-09-29",
      },
    });
  });

  it("usa hoje sem data e ignora o grupo em outro canal", () => {
    const r = lerVendaDireta({ canal: "loja", grupo: "g2", forma: "dinheiro", data: "" }, pecas, hoje, grupos);
    expect(r.ok && r.dados).toMatchObject({ canal: "loja", grupo: null, grupoId: null, data: hoje });
  });

  it("recusa canal vazio, grupo faltando, data no futuro e site", () => {
    expect(lerVendaDireta({ forma: "pix" }, pecas, hoje, grupos)).toEqual({ ok: false, erro: "Escolha o canal da venda." });
    expect(lerVendaDireta({ canal: "site", forma: "pix" }, pecas, hoje, grupos)).toEqual({ ok: false, erro: "Escolha o canal da venda." });
    expect(lerVendaDireta({ canal: "grupo_whatsapp", grupo: "Outro", forma: "pix" }, pecas, hoje, grupos)).toEqual({
      ok: false,
      erro: "Escolha o grupo de WhatsApp.",
    });
    expect(lerVendaDireta({ canal: "loja", forma: "pix", data: "2026-10-01" }, pecas, hoje, grupos)).toEqual({
      ok: false,
      erro: "A data da venda não pode ser no futuro.",
    });
    expect(lerVendaDireta({ canal: "loja", forma: "pix", data: "30/09/2026" }, pecas, hoje, grupos)).toEqual({
      ok: false,
      erro: "A data da venda não é válida.",
    });
  });
});
