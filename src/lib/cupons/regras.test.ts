import { describe, expect, it } from "vitest";
import { dividirDescontos, lerPlanoDeDesconto } from "../vendas/descontos";
import {
  aplicarCupom,
  descricaoDoCupom,
  lerCodigoDoCupom,
  lerCupom,
  pecaEntraNoCupom,
  valoresDoPedido,
  type PecaDoCupom,
  type RegraDoCupom,
} from "./regras";

const cupom = (c: Partial<RegraDoCupom> = {}): RegraDoCupom => ({
  id: "c1",
  codigo: "BEMVINDA10",
  tipo: "percentual",
  valor: 1000,
  inicio: null,
  fim: null,
  limiteUsos: null,
  pedidoMinimoCentavos: 0,
  porContaDaLoja: false,
  ativo: true,
  clienteId: null,
  marca: null,
  tamanho: null,
  genero: null,
  fornecedoraId: null,
  ...c,
});
const peca = (p: Partial<PecaDoCupom> & { id: string; precoCentavos: number }): PecaDoCupom => ({
  marca: null,
  tamanho: null,
  genero: null,
  fornecedoraId: null,
  ...p,
});
const ctx = { hoje: "2026-10-05", clienteId: null, usos: 0 };

describe("aplicar cupom", () => {
  it("divide o desconto entre as peças na proporção do preço (exemplo do CLAUDE.md)", () => {
    const r = aplicarCupom(
      cupom({ tipo: "reais", valor: 400 }),
      [peca({ id: "a", precoCentavos: 3000 }), peca({ id: "b", precoCentavos: 1000 })],
      ctx,
    );
    expect(r).toMatchObject({ ok: true, cupom: { descontoCentavos: 400, porPeca: { a: 300, b: 100 }, restrito: false } });
  });

  it("calcula o % e nunca passa do valor das peças", () => {
    expect(aplicarCupom(cupom(), [peca({ id: "a", precoCentavos: 2550 })], ctx)).toMatchObject({
      ok: true,
      cupom: { descontoCentavos: 255 },
    });
    expect(aplicarCupom(cupom({ tipo: "reais", valor: 9000 }), [peca({ id: "a", precoCentavos: 2500 })], ctx)).toMatchObject({
      ok: true,
      cupom: { descontoCentavos: 2500 },
    });
  });

  it("recusa cupom inativo, fora do período, esgotado, de outra cliente ou abaixo do mínimo", () => {
    const pecas = [peca({ id: "a", precoCentavos: 3000 })];
    expect(aplicarCupom(null, pecas, ctx).ok).toBe(false);
    expect(aplicarCupom(cupom({ ativo: false }), pecas, ctx).ok).toBe(false);
    expect(aplicarCupom(cupom({ inicio: "2026-10-06" }), pecas, ctx)).toEqual({ ok: false, erro: "Este cupom ainda não começou a valer." });
    expect(aplicarCupom(cupom({ fim: "2026-10-04" }), pecas, ctx)).toEqual({ ok: false, erro: "Este cupom já venceu." });
    expect(aplicarCupom(cupom({ fim: "2026-10-05" }), pecas, ctx).ok).toBe(true);
    expect(aplicarCupom(cupom({ limiteUsos: 2 }), pecas, { ...ctx, usos: 2 }).ok).toBe(false);
    expect(aplicarCupom(cupom({ limiteUsos: 2 }), pecas, { ...ctx, usos: 1 }).ok).toBe(true);
    expect(aplicarCupom(cupom({ clienteId: "x" }), pecas, ctx)).toEqual({
      ok: false,
      erro: "Este cupom é pessoal. Entre na sua conta para usar.",
    });
    expect(aplicarCupom(cupom({ clienteId: "x" }), pecas, { ...ctx, clienteId: "y" }).ok).toBe(false);
    expect(aplicarCupom(cupom({ clienteId: "x" }), pecas, { ...ctx, clienteId: "x" }).ok).toBe(true);
    expect(aplicarCupom(cupom({ pedidoMinimoCentavos: 5000 }), pecas, ctx).ok).toBe(false);
  });

  it("só dá desconto nas peças que atendem as restrições", () => {
    const pecas = [
      peca({ id: "a", precoCentavos: 3000, marca: "Carters", genero: "feminino", tamanho: "2", fornecedoraId: "f1" }),
      peca({ id: "b", precoCentavos: 2000, marca: "Puma", genero: "masculino", tamanho: "2" }),
    ];
    expect(aplicarCupom(cupom({ marca: "carters" }), pecas, ctx)).toMatchObject({
      ok: true,
      cupom: { descontoCentavos: 300, porPeca: { a: 300 }, restrito: true },
    });
    expect(aplicarCupom(cupom({ fornecedoraId: "f2" }), pecas, ctx)).toEqual({
      ok: false,
      erro: "Nenhuma peça do carrinho entra neste cupom.",
    });
    expect(
      pecaEntraNoCupom(peca({ id: "u", precoCentavos: 1, genero: "unissex" }), {
        marca: null,
        tamanho: null,
        genero: "feminino",
        fornecedoraId: null,
      }),
    ).toBe(true);
    expect(pecaEntraNoCupom(peca({ id: "s", precoCentavos: 1 }), { marca: null, tamanho: "3", genero: null, fornecedoraId: null })).toBe(
      false,
    );
  });
});

describe("formulário e textos", () => {
  it("lê o cupom", () => {
    expect(lerCodigoDoCupom(" bem vinda10 ")).toBe("BEMVINDA10");
    expect(lerCodigoDoCupom("ab")).toBeNull();
    const r = lerCupom({
      codigo: "festa",
      tipo: "reais",
      valor: "15",
      limite: "10",
      minimo: "80",
      marca: " Carters ",
      tamanho: "2 anos",
      genero: "feminino",
      quem: "loja",
    });
    expect(r).toMatchObject({
      ok: true,
      dados: {
        codigo: "FESTA",
        valor: 1500,
        limiteUsos: 10,
        pedidoMinimoCentavos: 8000,
        marca: "Carters",
        tamanho: "2 anos",
        genero: "feminino",
        porContaDaLoja: true,
        ativo: true,
      },
    });
    expect(lerCupom({ codigo: "FESTA", valor: "100" }).ok).toBe(false);
    expect(lerCupom({ codigo: "FESTA", valor: "10", limite: "0" }).ok).toBe(false);
    expect(lerCupom({ codigo: "FESTA", valor: "10", inicio: "2026-10-10", fim: "2026-10-01" }).ok).toBe(false);
  });

  it("descreve o cupom", () => {
    expect(
      descricaoDoCupom({
        tipo: "percentual",
        valor: 1000,
        marca: "Carters",
        tamanho: null,
        genero: "feminino",
        pedidoMinimoCentavos: 5000,
      }),
    ).toBe("10% de desconto em peças da marca Carters, de menina a partir de R$ 50,00");
  });
});

describe("desconto do pedido na confirmação", () => {
  it("cupom sem restrição vai no carrinho e dá a mesma divisão que o site fez", () => {
    // Peça a (R$ 50 com promoção de R$ 10) e b (R$ 10); cupom de 10% sobre R$ 50 = R$ 5.
    const noSite = aplicarCupom(cupom(), [peca({ id: "a", precoCentavos: 4000 }), peca({ id: "b", precoCentavos: 1000 })], ctx);
    if (!noSite.ok) throw new Error("cupom");
    const valores = valoresDoPedido(
      [
        {
          pecaId: "a",
          promocao: { descontoCentavos: 1000, porContaDaLoja: false, nome: "Liquida" },
          descontoCupomCentavos: noSite.cupom.porPeca.a,
        },
        { pecaId: "b", promocao: null, descontoCupomCentavos: noSite.cupom.porPeca.b },
      ],
      { codigo: "BEMVINDA10", porContaDaLoja: false, restrito: false, descontoCentavos: noSite.cupom.descontoCentavos },
    );
    expect(valores).toMatchObject({
      "peca_desconto:a": "10,00",
      desconto: "5,00",
      desconto_quem: "dividido",
      desconto_motivo: "Promoção: Liquida · Cupom BEMVINDA10",
    });
    const pecas = [
      { id: "a", precoCentavos: 5000 },
      { id: "b", precoCentavos: 1000 },
    ];
    const plano = lerPlanoDeDesconto(valores, pecas);
    if (!plano.ok) throw new Error(plano.erro);
    const partes = dividirDescontos(pecas, plano.dados);
    if (!partes.ok) throw new Error(partes.erro);
    expect(partes.dados.map((p) => p.valorPago)).toEqual([4000 - noSite.cupom.porPeca.a, 1000 - noSite.cupom.porPeca.b]);
  });

  it("cupom restrito vai no desconto de cada peça", () => {
    expect(
      valoresDoPedido([{ pecaId: "a", promocao: null, descontoCupomCentavos: 300 }], {
        codigo: "CARTERS",
        porContaDaLoja: true,
        restrito: true,
        descontoCentavos: 300,
      }),
    ).toEqual({ "peca_desconto:a": "3,00", "peca_tipo:a": "reais", "peca_quem:a": "loja", desconto_motivo: "Cupom CARTERS" });
  });
});
