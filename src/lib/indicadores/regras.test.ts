import { describe, expect, it } from "vitest";
import {
  clientesDoPeriodo,
  conversaoDePedidos,
  diasAteVender,
  estoque,
  numerosDasVendas,
  periodoAnterior,
  ranking,
  rankingsDoPeriodo,
  variacao,
  type VendaDoIndicador,
} from "./regras";

const d = (t: string) => new Date(`${t}T00:00:00Z`);
const item = (pago: number, extra: Partial<VendaDoIndicador["itens"][number]["peca"]> = {}, quantidade = 1) => ({
  quantidade,
  valorPagoCentavos: pago,
  lucroCentavos: Math.round(pago * 0.6),
  peca: {
    marca: "Zara",
    tamanho: "2",
    dataEntrada: d("2026-09-01"),
    categorias: ["Roupas"],
    fornecedora: { codigo: "F06", nome: "Bruna" },
    ...extra,
  },
});

const vendas: VendaDoIndicador[] = [
  {
    data: d("2026-10-02"),
    totalCentavos: 5000,
    canal: "site",
    grupo: "Meninas",
    formaPagamento: "pix",
    clienteId: "a",
    itens: [item(5000)],
  },
  {
    data: d("2026-10-04"),
    totalCentavos: 7000,
    canal: "grupo_whatsapp",
    grupo: "Meninas",
    formaPagamento: "cartao",
    clienteId: "b",
    itens: [
      item(4000, { marca: "Hering", categorias: ["Roupas", "Fantasias"], dataEntrada: d("2026-09-24") }),
      item(3000, { fornecedora: null, tamanho: "4" }),
    ],
  },
  {
    data: d("2026-09-03"),
    totalCentavos: 2000,
    canal: "loja",
    grupo: null,
    formaPagamento: "dinheiro",
    clienteId: "b",
    itens: [item(2000)],
  },
  {
    data: d("2026-09-10"),
    totalCentavos: 9000,
    canal: "loja",
    grupo: null,
    formaPagamento: "dinheiro",
    clienteId: null,
    itens: [item(9000)],
  },
];

describe("periodoAnterior", () => {
  it("num mês, compara com os mesmos dias do mês anterior", () => {
    expect(periodoAnterior({ tipo: "mensal", de: "2026-10-01", ate: "2026-10-05" })).toEqual({ de: "2026-09-01", ate: "2026-09-05" });
    expect(periodoAnterior({ tipo: "mensal", de: "2026-03-01", ate: "2026-03-31" })).toEqual({ de: "2026-02-01", ate: "2026-02-28" });
    expect(periodoAnterior({ tipo: "mensal", de: "2027-01-01", ate: "2027-01-31" })).toEqual({ de: "2026-12-01", ate: "2026-12-31" });
  });
  it("nos outros, o mesmo número de dias logo antes", () => {
    expect(periodoAnterior({ tipo: "semanal", de: "2026-09-29", ate: "2026-10-05" })).toEqual({ de: "2026-09-22", ate: "2026-09-28" });
    expect(periodoAnterior({ tipo: "periodo", de: "2026-10-01", ate: "2026-10-10" })).toEqual({ de: "2026-09-21", ate: "2026-09-30" });
  });
});

describe("números", () => {
  it("faturamento, lucro, vendas, peças e ticket médio do período", () => {
    expect(numerosDasVendas(vendas, "2026-10-01", "2026-10-05")).toEqual({
      faturamentoCentavos: 12000,
      lucroCentavos: 7200,
      vendas: 2,
      pecas: 3,
      ticketMedioCentavos: 6000,
    });
    expect(numerosDasVendas(vendas, "2026-08-01", "2026-08-31").ticketMedioCentavos).toBe(0);
  });
  it("variação em %", () => {
    expect(variacao(12000, 11000)).toBe(9);
    expect(variacao(5000, 10000)).toBe(-50);
    expect(variacao(5000, 0)).toBeNull();
  });
});

describe("rankings", () => {
  it("soma por nome, ordena e calcula a parte de cada um", () => {
    expect(
      ranking([
        { nome: "A", valorCentavos: 100, quantidade: 1 },
        { nome: "B", valorCentavos: 300, quantidade: 1 },
        { nome: "A", valorCentavos: 100, quantidade: 2 },
      ]),
    ).toEqual([
      { nome: "B", valorCentavos: 300, quantidade: 1, parte: 60 },
      { nome: "A", valorCentavos: 200, quantidade: 3, parte: 40 },
    ]);
  });

  it("separa por canal, grupo, forma, fornecedora, marca, categoria e tamanho (só o período)", () => {
    const r = rankingsDoPeriodo(vendas, "2026-10-01", "2026-10-31");
    expect(r.canais.map((c) => [c.nome, c.valorCentavos, c.quantidade])).toEqual([
      ["Grupos de WhatsApp", 7000, 2],
      ["Site", 5000, 1],
    ]);
    expect(r.grupos).toEqual([{ nome: "Meninas", valorCentavos: 12000, quantidade: 3, parte: 100 }]);
    expect(r.formas.map((f) => f.nome)).toEqual(["Cartão", "Pix"]);
    // A peça da loja não entra nas fornecedoras.
    expect(r.fornecedoras).toEqual([{ nome: "F06 · Bruna", valorCentavos: 9000, quantidade: 2, parte: 100 }]);
    expect(r.marcas.map((m) => m.nome)).toEqual(["Zara", "Hering"]);
    // Peça com duas categorias conta nas duas.
    expect(r.categorias.map((c) => [c.nome, c.valorCentavos])).toEqual([
      ["Roupas", 12000],
      ["Fantasias", 4000],
    ]);
    expect(r.tamanhos.map((t) => t.nome)).toEqual(["2", "4"]);
  });
});

describe("diasAteVender", () => {
  it("é a mediana dos dias entre a entrada e a venda", () => {
    // 31 (02/10), 10 (04/10) e 33 (04/10) dias: a mediana é 31.
    expect(diasAteVender(vendas, "2026-10-01", "2026-10-31")).toBe(31);
    expect(diasAteVender(vendas, "2026-09-01", "2026-09-30")).toBe(6);
    expect(diasAteVender(vendas, "2026-08-01", "2026-08-31")).toBeNull();
  });
});

describe("clientesDoPeriodo", () => {
  it("separa quem comprou pela primeira vez de quem voltou", () => {
    expect(clientesDoPeriodo(vendas, "2026-10-01", "2026-10-31")).toEqual({ compraram: 2, novas: 1, voltaram: 1 });
    // Com a primeira compra de todas as vendas: a cliente "a" já tinha comprado em 2025.
    const primeira = new Map([
      ["a", "2025-12-01"],
      ["b", "2026-09-03"],
    ]);
    expect(clientesDoPeriodo(vendas, "2026-10-01", "2026-10-31", primeira)).toEqual({ compraram: 2, novas: 0, voltaram: 2 });
  });
});

describe("estoque", () => {
  const pecas = [
    { id: "1", codigo: "F06-00001", nome: "Body", precoCentavos: 3000, quantidade: 1, dataEntrada: d("2026-05-01") },
    { id: "2", codigo: "F06-00002", nome: "Calça", precoCentavos: 4000, quantidade: 2, dataEntrada: d("2026-07-07") },
    { id: "3", codigo: "F06-00003", nome: "Saia", precoCentavos: 5000, quantidade: 1, dataEntrada: d("2026-09-20") },
  ];
  it("conta as peças, o valor e as paradas há mais de 90 dias", () => {
    const e = estoque(pecas, "2026-10-05");
    expect(e.pecas).toBe(4);
    expect(e.valorCentavos).toBe(16000);
    expect(e.paradas.map((p) => [p.codigo, p.dias])).toEqual([
      ["F06-00001", 157],
      ["F06-00002", 90],
    ]);
    expect(e.valorParadoCentavos).toBe(11000);
  });
});

describe("conversaoDePedidos", () => {
  it("calcula quantos pedidos viraram venda, sem contar os ainda abertos", () => {
    expect(
      conversaoDePedidos([
        { status: "pago" },
        { status: "pago" },
        { status: "expirado" },
        { status: "cancelado" },
        { status: "reservado" },
      ]),
    ).toEqual({
      fechados: 5,
      pagos: 2,
      abertos: 1,
      perdidos: 2,
      taxa: 50,
    });
    expect(conversaoDePedidos([]).taxa).toBeNull();
  });
});
