import { describe, expect, it } from "vitest";
import { calcularItens, lerConfirmacao, lerVendaDireta, type PecaParaVender } from "./regras";

const consignada = (id: string, preco: number, percentual: number | null = null): PecaParaVender => ({
  id,
  tipo: "consignada",
  precoCentavos: preco,
  percentualRepasse: percentual,
  percentualPadraoFornecedora: 4000,
  custoCentavos: null,
});

describe("calcularItens", () => {
  it("exemplo do CLAUDE.md: R$ 30 e R$ 10 com desconto de R$ 4 e 40% de repasse", () => {
    const itens = calcularItens([consignada("a", 3000), consignada("b", 1000)], 400);
    expect(itens.map((i) => i.valorPagoCentavos)).toEqual([2700, 900]);
    expect(itens.map((i) => i.descontoCentavos)).toEqual([300, 100]);
    expect(itens.map((i) => i.repasseCentavos)).toEqual([1080, 360]);
    expect(itens.map((i) => i.lucroCentavos)).toEqual([1620, 540]);
  });

  it("sem desconto: R$ 15 com 40% dá R$ 6 de repasse e R$ 9 de lucro", () => {
    const [item] = calcularItens([consignada("a", 1500)], 0);
    expect(item).toMatchObject({ valorPagoCentavos: 1500, repasseCentavos: 600, lucroCentavos: 900, percentualRepasse: 4000 });
  });

  it("usa o percentual da peça quando ele existe", () => {
    const [item] = calcularItens([consignada("a", 1000, 5000)], 0);
    expect(item).toMatchObject({ percentualRepasse: 5000, repasseCentavos: 500 });
  });

  it("peça da loja não tem repasse e o lucro desconta o custo", () => {
    const [item] = calcularItens(
      [{ id: "s", tipo: "loja", precoCentavos: 2000, percentualRepasse: null, percentualPadraoFornecedora: null, custoCentavos: 800 }],
      0,
    );
    expect(item).toMatchObject({ repasseCentavos: 0, lucroCentavos: 1200, custoCentavos: 800, percentualRepasse: null });
  });

  it("a soma dos valores pagos é sempre o total menos o desconto", () => {
    const itens = calcularItens([consignada("a", 999), consignada("b", 1001), consignada("c", 333)], 100);
    expect(itens.reduce((s, i) => s + i.valorPagoCentavos, 0)).toBe(999 + 1001 + 333 - 100);
  });
});

describe("lerConfirmacao", () => {
  it("aceita forma, desconto em reais e destino", () => {
    expect(lerConfirmacao({ forma: "pix", desconto: "5,50", destino: "na_sacolinha" }, 4000)).toEqual({
      ok: true,
      dados: { forma: "pix", descontoCentavos: 550, destino: "na_sacolinha" },
    });
    expect(lerConfirmacao({ forma: "dinheiro" }, 4000)).toEqual({
      ok: true,
      dados: { forma: "dinheiro", descontoCentavos: 0, destino: "vendida" },
    });
  });

  it("recusa forma vazia, desconto inválido ou maior que o total", () => {
    expect(lerConfirmacao({}, 4000).ok).toBe(false);
    expect(lerConfirmacao({ forma: "pix", desconto: "abc" }, 4000).ok).toBe(false);
    expect(lerConfirmacao({ forma: "pix", desconto: "-2" }, 4000).ok).toBe(false);
    expect(lerConfirmacao({ forma: "pix", desconto: "50" }, 4000)).toEqual({
      ok: false,
      erro: "O desconto não pode ser maior que o total.",
    });
  });
});

describe("venda direta no painel", () => {
  const hoje = "2026-09-30";
  const grupos = [
    { id: "g1", nome: "Menino" },
    { id: "g2", nome: "Meninas" },
  ];
  it("lê canal, grupo, data e pagamento", () => {
    expect(
      lerVendaDireta({ canal: "grupo_whatsapp", grupo: "g2", forma: "pix", desconto: "2", data: "2026-09-29" }, 3000, hoje, grupos),
    ).toEqual({
      ok: true,
      dados: { canal: "grupo_whatsapp", grupo: "Meninas", grupoId: "g2", forma: "pix", descontoCentavos: 200, destino: "vendida", data: "2026-09-29" },
    });
  });

  it("usa hoje sem data e ignora o grupo em outro canal", () => {
    const r = lerVendaDireta({ canal: "loja", grupo: "g2", forma: "dinheiro", data: "" }, 3000, hoje, grupos);
    expect(r.ok && r.dados).toMatchObject({ canal: "loja", grupo: null, grupoId: null, data: hoje });
  });

  it("recusa canal vazio, grupo faltando, data no futuro e site", () => {
    expect(lerVendaDireta({ forma: "pix" }, 3000, hoje, grupos)).toEqual({ ok: false, erro: "Escolha o canal da venda." });
    expect(lerVendaDireta({ canal: "site", forma: "pix" }, 3000, hoje, grupos)).toEqual({ ok: false, erro: "Escolha o canal da venda." });
    expect(lerVendaDireta({ canal: "grupo_whatsapp", grupo: "Outro", forma: "pix" }, 3000, hoje, grupos)).toEqual({
      ok: false,
      erro: "Escolha o grupo de WhatsApp.",
    });
    expect(lerVendaDireta({ canal: "loja", forma: "pix", data: "2026-10-01" }, 3000, hoje, grupos)).toEqual({
      ok: false,
      erro: "A data da venda não pode ser no futuro.",
    });
    expect(lerVendaDireta({ canal: "loja", forma: "pix", data: "30/09/2026" }, 3000, hoje, grupos)).toEqual({
      ok: false,
      erro: "A data da venda não é válida.",
    });
  });
});
