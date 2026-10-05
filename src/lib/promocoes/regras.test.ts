import { describe, expect, it } from "vitest";
import {
  descontoDaPromocao,
  descricaoDoDesconto,
  lerCodigos,
  lerPromocao,
  melhorPromocao,
  precoDoPost,
  situacaoDaPromocao,
  valoresDaPromocao,
  type RegraDaPromocao,
} from "./regras";

const regra = (r: Partial<RegraDaPromocao>): RegraDaPromocao => ({
  id: "p1",
  nome: "Liquida",
  tipo: "percentual",
  valor: 2000,
  inicio: "2026-10-01",
  fim: "2026-10-31",
  porContaDaLoja: false,
  ativa: true,
  ...r,
});

describe("desconto da promoção", () => {
  it("calcula em % (meio centavo para cima) e em reais, sem passar do preço", () => {
    expect(descontoDaPromocao(5000, { tipo: "percentual", valor: 2000 })).toBe(1000);
    expect(descontoDaPromocao(1999, { tipo: "percentual", valor: 2500 })).toBe(500); // 499,75 → 500
    expect(descontoDaPromocao(5000, { tipo: "reais", valor: 700 })).toBe(700);
    expect(descontoDaPromocao(500, { tipo: "reais", valor: 700 })).toBe(500);
  });

  it("vale só no período e com a promoção ativa, e escolhe o maior desconto", () => {
    const regras = [regra({}), regra({ id: "p2", nome: "Dez reais", tipo: "reais", valor: 1500 })];
    expect(melhorPromocao(5000, regras, "2026-09-30")).toBeNull();
    expect(melhorPromocao(5000, regras, "2026-10-01")).toMatchObject({ promocaoId: "p2", descontoCentavos: 1500, precoCentavos: 3500 });
    expect(melhorPromocao(10000, regras, "2026-10-31")).toMatchObject({ promocaoId: "p1", descontoCentavos: 2000, precoCentavos: 8000 });
    expect(melhorPromocao(5000, [regra({ ativa: false })], "2026-10-10")).toBeNull();
    expect(melhorPromocao(5000, regras, "2026-11-01")).toBeNull();
  });

  it("mostra a situação, a descrição e o preço do post", () => {
    expect(situacaoDaPromocao(regra({}), "2026-09-30")).toBe("programada");
    expect(situacaoDaPromocao(regra({}), "2026-10-15")).toBe("valendo");
    expect(situacaoDaPromocao(regra({}), "2026-11-01")).toBe("encerrada");
    expect(situacaoDaPromocao(regra({ ativa: false }), "2026-10-15")).toBe("pausada");
    expect(descricaoDoDesconto({ tipo: "percentual", valor: 1250 })).toBe("12,5% de desconto");
    expect(descricaoDoDesconto({ tipo: "reais", valor: 1000 })).toBe("R$ 10,00 de desconto".replace(" ", " "));
    expect(precoDoPost(5000, { precoCentavos: 3500 })).toBe(`~R$ 50,00~ por R$ 35,00`);
    expect(precoDoPost(5000, null)).toBe("R$ 50,00");
  });
});

describe("formulário da promoção", () => {
  it("lê os campos e recusa valores inválidos", () => {
    expect(lerPromocao({ nome: "Liquida", tipo: "percentual", valor: "30", fim: "2026-10-31" }, "2026-10-05")).toEqual({
      ok: true,
      dados: {
        nome: "Liquida",
        tipo: "percentual",
        valor: 3000,
        inicio: "2026-10-05",
        fim: "2026-10-31",
        porContaDaLoja: false,
        ativa: true,
      },
    });
    const r = lerPromocao(
      { nome: "Dez", tipo: "reais", valor: "10,50", inicio: "2026-10-10", fim: "2026-10-20", quem: "loja", ativa: "" },
      "2026-10-05",
    );
    expect(r).toMatchObject({ ok: true, dados: { valor: 1050, porContaDaLoja: true, ativa: false } });
    expect(lerPromocao({ nome: "X", valor: "10", fim: "2026-10-31" }, "2026-10-05").ok).toBe(false);
    expect(lerPromocao({ nome: "Liquida", valor: "100", fim: "2026-10-31" }, "2026-10-05").ok).toBe(false);
    expect(lerPromocao({ nome: "Liquida", valor: "abc", fim: "2026-10-31" }, "2026-10-05").ok).toBe(false);
    expect(lerPromocao({ nome: "Liquida", valor: "10", inicio: "2026-10-10", fim: "2026-10-01" }, "2026-10-05").ok).toBe(false);
    expect(lerPromocao({ nome: "Liquida", valor: "10" }, "2026-10-05").ok).toBe(false);
  });

  it("lê códigos colados de qualquer jeito", () => {
    expect(lerCodigos("f06-00001, F06-00002\nsb-00003  f06-00001;x")).toEqual(["F06-00001", "F06-00002", "SB-00003"]);
  });
});

describe("campos de desconto da venda", () => {
  it("preenche o desconto de cada peça em promoção, quem paga e o motivo", () => {
    expect(
      valoresDaPromocao([
        { pecaId: "a", descontoCentavos: 1050, porContaDaLoja: false, nome: "Liquida" },
        { pecaId: "b", descontoCentavos: 0, porContaDaLoja: false, nome: "Liquida" },
        { pecaId: "c", descontoCentavos: 500, porContaDaLoja: true, nome: "Dia das crianças" },
      ]),
    ).toEqual({
      "peca_desconto:a": "10,50",
      "peca_tipo:a": "reais",
      "peca_quem:a": "dividido",
      "peca_desconto:c": "5,00",
      "peca_tipo:c": "reais",
      "peca_quem:c": "loja",
      desconto_motivo: "Promoções: Liquida, Dia das crianças",
    });
    expect(valoresDaPromocao([])).toEqual({});
  });
});
