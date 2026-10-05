import { describe, expect, it } from "vitest";
import { aberturaDoResumo, resumoPorGrupo, semanaDoResumo } from "./resumo";

const d = (t: string) => new Date(`${t}T00:00:00Z`);

describe("semanaDoResumo", () => {
  it("sem data, os últimos 7 dias até hoje", () => {
    expect(semanaDoResumo(undefined, "2026-10-05")).toEqual({
      de: "2026-09-29",
      ate: "2026-10-05",
      anterior: "2026-09-22",
      seguinte: null,
      rotulo: "29/09/2026 a 05/10/2026",
    });
  });

  it("semana escolhida, com a seguinte; nunca passa de hoje", () => {
    expect(semanaDoResumo("2026-09-22", "2026-10-05")).toMatchObject({
      de: "2026-09-22",
      ate: "2026-09-28",
      seguinte: "2026-09-29",
    });
    expect(semanaDoResumo("2026-10-03", "2026-10-05").de).toBe("2026-09-29");
    expect(semanaDoResumo("abc", "2026-10-05").de).toBe("2026-09-29");
  });
});

describe("resumoPorGrupo", () => {
  const grupos = [
    { id: "menino", papel: "masculino", ativo: true },
    { id: "meninas", papel: "feminino", ativo: true },
    { id: "liquida", papel: "promocao", ativo: true },
    { id: "calcados", papel: "calcados", ativo: true },
    { id: "velho", papel: "acessorios", ativo: false },
  ];
  const peca = (id: string, genero: string | null, publicada: string | null, extra: object = {}) => ({
    id,
    genero,
    categorias: ["Roupas"],
    emPromocao: false,
    publicadaEm: publicada ? d(publicada) : null,
    ...extra,
  });
  const pecas = [
    peca("a", "feminino", "2026-09-30"),
    peca("b", "masculino", "2026-10-02"),
    peca("c", null, "2026-10-04"),
    peca("d", "feminino", "2026-09-20"),
    peca("e", "feminino", "2026-10-01", { emPromocao: true }),
    peca("f", "masculino", "2026-10-03", { categorias: ["Calçados"] }),
    peca("g", "feminino", null),
  ];

  it("cada grupo recebe as peças da semana pelas regras do grupo sugerido, as mais novas primeiro", () => {
    const r = resumoPorGrupo(pecas, grupos, { de: "2026-09-29", ate: "2026-10-05" });
    expect(r.map((g) => [g.grupo.id, g.pecas.map((p) => p.id)])).toEqual([
      ["menino", ["c", "b"]],
      ["meninas", ["c", "a"]],
      ["liquida", ["e"]],
      ["calcados", ["f"]],
    ]);
  });

  it("até 30 peças por grupo, contando o total", () => {
    const muitas = Array.from({ length: 35 }, (_, i) => peca(`p${i}`, "feminino", "2026-10-01"));
    const meninas = resumoPorGrupo(muitas, grupos, { de: "2026-09-29", ate: "2026-10-05" })[1];
    expect(meninas.pecas).toHaveLength(30);
    expect(meninas.total).toBe(35);
  });
});

describe("aberturaDoResumo", () => {
  it("título e texto", () => {
    expect(aberturaDoResumo({ nomeCurto: "Salty", quantidade: 3, promocao: false })).toEqual({
      titulo: "Novidades da semana na Salty 🐳",
      texto: "Chegaram 3 peças novas esta semana. Para comprar, é só tocar no link da peça. Quem fechar o pedido primeiro leva!",
    });
    expect(aberturaDoResumo({ nomeCurto: "Salty", quantidade: 1, promocao: true }).titulo).toBe("Liquida da semana na Salty 🐳");
  });
});
