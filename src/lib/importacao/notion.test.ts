import { describe, expect, it } from "vitest";
import { lerCsv } from "./csv";
import { lerData, lerNumeroReais, lerPercentual, lerReais, prepararImportacao, textoDoVinculo } from "./notion";

// Dados inventados, no mesmo formato do export do Notion (sem dados reais).
const csv = (linhas: string[][]) =>
  "﻿" + linhas.map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
const r$ = (v: string) => `R$ ${v}`;
const vinculo = (nome: string) => `${nome} (${encodeURIComponent(nome)}%20abc123.md)`;

const fornecedoras = csv([
  ["Nome", "Tel / WhatsApp", "E-mail", "CPF / CNPJ", "Pix", "Endereço", "CEP", "Cidade", "Estado", "País"],
  ["Maria Teste F06", "12 90000-0000", "maria@teste.com", "000.000.000-00", "maria@teste.com", "Rua A", "11600-000", "Caraguatatuba", "SP - São Paulo", "Brasil"],
  ["Joana Exemplo F09", "", "", "", "", "", "", "Ubatuba", "SP - São Paulo", "Brasil"],
  ["Dona da Loja F43", "", "", "", "", "", "", "Caraguatatuba", "SP - São Paulo", "Brasil"],
  ["", "", "", "", "", "", "", "", "", ""],
]);

const CAB_PRODUTOS = ["Produto", "% Repasse", "*Data", "*Fornecedor", "*Quantidade", "*Valor Venda / Unidade", "A Repassar", "Acerto", "Consignado", "Cor", "Custo / Unidade", "Data do Acerto", "Estoque_", "Imagem", "Marca", "Tamanho", "Variação", "Vendido?"];
const produto = (p: Partial<Record<string, string>>) => CAB_PRODUTOS.map((c) => p[c] ?? "");
const produtos = csv([
  CAB_PRODUTOS,
  // Entrou depois, mas tem código antigo menor: a ordem é pela data de entrada.
  produto({ Produto: "Body - F06-0000", "% Repasse": "40%", "*Data": "10/02/2026", "*Fornecedor": vinculo("Maria Teste F06"), "*Quantidade": "1", "*Valor Venda / Unidade": r$("30,00"), Consignado: "Sim", "Estoque_": "1", Imagem: "body%201.jpeg", Tamanho: "Rn", Variação: "Usado", "Vendido?": "🔴 Não" }),
  produto({ Produto: "Macacão - F06-0001", "% Repasse": "40%", "*Data": "05/01/2026", "*Fornecedor": vinculo("Maria Teste F06"), "*Quantidade": "1", "*Valor Venda / Unidade": r$("30,00"), Consignado: "Sim", "Estoque_": "0", Tamanho: "P", Variação: "Novo", "Vendido?": "✅ Sim" }),
  // Código antigo diz F06, mas a peça está ligada à F09: vale o vínculo.
  produto({ Produto: "Calça -F06-0002", "% Repasse": "1%", "*Data": "05/01/2026", "*Fornecedor": vinculo("Joana Exemplo F09"), "*Quantidade": "1", "*Valor Venda / Unidade": r$("10,00"), Consignado: "Sim", "Estoque_": "0", Tamanho: "prematuro", "Vendido?": "✅ Sim" }),
  // Peça consignada já acertada: vale o repasse que o Notion registrou.
  produto({ Produto: "Casaco - F09-0000", "% Repasse": "40%", "*Data": "01/01/2026", "*Fornecedor": vinculo("Joana Exemplo F09"), "*Quantidade": "1", "*Valor Venda / Unidade": r$("50,00"), "A Repassar": r$("20,00"), Acerto: "Acertado", "Data do Acerto": "08/09/2026", Consignado: "Sim", "Estoque_": "0", Tamanho: "M", "Vendido?": "✅ Sim" }),
  // Peças da loja: ligadas à dona (F43) ou com "Consignado = Não".
  produto({ Produto: "Vestido F43-0001", "*Data": "03/01/2026", "*Fornecedor": vinculo("Dona da Loja F43"), "*Quantidade": "1", "*Valor Venda / Unidade": r$("20,00"), "Custo / Unidade": r$("5,00"), Consignado: "Não", "Estoque_": "0", Tamanho: "G", "Vendido?": "✅ Sim" }),
  produto({ Produto: "Meia - F09-0001", "*Data": "02/01/2026", "*Fornecedor": vinculo("Joana Exemplo F09"), "*Quantidade": "2", "*Valor Venda / Unidade": r$("8,00"), Consignado: "Não", "Estoque_": "2", Tamanho: "RN", "Vendido?": "🔴 Não" }),
  // Sem estoque e sem venda: fica em rascunho, com aviso.
  produto({ Produto: "Shorts - F09-0002", "% Repasse": "", "*Data": "04/01/2026", "*Fornecedor": vinculo("Joana Exemplo F09"), "*Valor Venda / Unidade": r$("12,00"), Consignado: "Sim", "Estoque_": "0", Tamanho: "P", "Vendido?": "🔴 Não" }),
]);

const CAB_VENDAS = ["Venda", "*Data da Venda", "Canal de Venda", "Cliente", "Desconto", "Envio", "Forma de Pagamento", "Produto 1", "Produto 2", "Produto 3", "Qtd", "Qtdㅤ", "Qtdㅤㅤ", "Valor_Un_Prod_1", "Valor_Un_Prod_2", "Valor_Un_Prod_3"];
const venda = (v: Partial<Record<string, string>>) => CAB_VENDAS.map((c) => v[c] ?? "");
const vendas = csv([
  CAB_VENDAS,
  // Exemplo do CLAUDE.md: R$ 30 + R$ 10 com cupom de R$ 4 → R$ 27 e R$ 9.
  venda({ Venda: "liquida", "*Data da Venda": "15/04/2026", "Canal de Venda": "WhatsApp", Cliente: vinculo("Cliente Teste"), Desconto: r$("4,00"), Envio: "Enviado", "Forma de Pagamento": "PIX", "Produto 1": vinculo("Macacão - F06-0001"), "Produto 2": vinculo("Calça -F06-0002"), Qtd: "1", "Qtdㅤ": "1", Valor_Un_Prod_1: "30", Valor_Un_Prod_2: "10" }),
  venda({ Venda: "bag", "*Data da Venda": "06/05/2026", "Canal de Venda": "Bag", Envio: "Não Enviado", "Forma de Pagamento": "Cartão de Crédito", "Produto 1": vinculo("Casaco - F09-0000"), "Produto 2": vinculo("Vestido F43-0001"), "Produto 3": vinculo("Shorts - F09-0002"), Qtd: "1", "Qtdㅤ": "1", "Qtdㅤㅤ": "", Valor_Un_Prod_1: "50", Valor_Un_Prod_2: "20", Valor_Un_Prod_3: "12" }),
  venda({ Venda: "vazia", "*Data da Venda": "28/09/2026" }),
]);

const clientes = csv([
  ["Nome", "Tel / WhatsApp", "E-mail", "CPF", "Endereço", "CEP", "Cidade", "Estado", "País"],
  ["Cliente Teste", "12 91111-1111", "", "", "", "", "Caraguatatuba", "SP - São Paulo", "Brasil"],
]);

const plano = prepararImportacao({ produtos, fornecedoras, clientes, vendas });
const peca = (antigo: string) => plano.pecas.find((p) => p.codigoAntigo === antigo)!;

describe("leitura dos campos do Notion", () => {
  it("lê reais, percentuais, datas e vínculos", () => {
    expect(lerReais(r$("1.234,56"))).toBe(123456);
    expect(lerReais(r$("50,00"))).toBe(5000);
    expect(lerReais("")).toBe(0);
    expect(lerNumeroReais("12")).toBe(1200);
    expect(lerNumeroReais("12.5")).toBe(1250);
    expect(lerPercentual("40%")).toBe(4000);
    expect(lerPercentual("")).toBeUndefined();
    expect(lerData("28/11/2025")).toBe("2025-11-28");
    expect(textoDoVinculo(vinculo("Body - F41-0003"))).toBe("Body - F41-0003");
  });

  it("lê CSV com aspas, vírgulas e quebras de linha dentro do campo", () => {
    expect(lerCsv('a,b\n"x, y","linha 1\nlinha 2"\n"com ""aspas""",\n')).toEqual([
      { a: "x, y", b: "linha 1\nlinha 2" },
      { a: 'com "aspas"', b: "" },
    ]);
  });
});

describe("fornecedoras", () => {
  it("separa o código do nome e ignora linhas vazias", () => {
    expect(plano.fornecedoras.map((f) => [f.codigo, f.nome])).toEqual([
      ["F06", "Maria Teste"],
      ["F09", "Joana Exemplo"],
      ["F43", "Dona da Loja"],
    ]);
    expect(plano.sequencias.fornecedora).toBe(43);
  });
});

describe("códigos novos das peças", () => {
  it("numera por fornecedora com 5 dígitos, na ordem de entrada", () => {
    expect(peca("F06-0001").codigo).toBe("F06-00001"); // entrou em 05/01
    expect(peca("F06-0000").codigo).toBe("F06-00002"); // entrou em 10/02
    expect(plano.sequencias["peca:F06"]).toBe(2);
  });

  it("usa a fornecedora do vínculo, não o prefixo do código antigo", () => {
    expect(peca("F06-0002").codigo).toBe("F09-00003");
    expect(peca("F06-0002").codigoFornecedora).toBe("F09");
    expect(peca("F06-0002").avisos.join()).toContain("vinculada é F09");
  });

  it("peças da dona (F43) e com Consignado = Não são da loja: prefixo SB e sem repasse", () => {
    expect(peca("F43-0001")).toMatchObject({ codigo: "SB-00002", tipo: "loja", percentualRepasse: undefined });
    expect(peca("F09-0001")).toMatchObject({ codigo: "SB-00001", tipo: "loja", codigoFornecedora: undefined });
  });

  it("guarda o código antigo e o nome sem o código", () => {
    expect(peca("F06-0000")).toMatchObject({ codigoAntigo: "F06-0000", nome: "Body", foto: "body 1.jpeg" });
  });
});

describe("correções da importação", () => {
  it("corrige o repasse de 1% para 40% e usa 40% quando está vazio", () => {
    expect(peca("F06-0002").percentualRepasse).toBe(4000);
    expect(peca("F09-0002").percentualRepasse).toBe(4000);
  });

  it("move Usado/Novo para conservação e padroniza os tamanhos", () => {
    expect(peca("F06-0000")).toMatchObject({ conservacao: "seminova", variacao: undefined, tamanho: "RN" });
    expect(peca("F06-0001").conservacao).toBe("nova_com_etiqueta");
    expect(peca("F06-0002").tamanho).toBe("Prematuro");
  });

  it("define a situação pelo estoque e pelas vendas", () => {
    expect(peca("F06-0000")).toMatchObject({ status: "publicada", quantidade: 1 });
    expect(peca("F09-0001")).toMatchObject({ status: "publicada", quantidade: 2 });
    expect(peca("F06-0001").status).toBe("enviada");
    expect(peca("F09-0000").status).toBe("vendida");
    expect(peca("F09-0002").status).toBe("rascunho");
    expect(peca("F09-0002").avisos.join()).toContain("rascunho");
  });
});

describe("vendas antigas", () => {
  it("ignora vendas vazias e itens sem quantidade", () => {
    expect(plano.vendas).toHaveLength(2);
    expect(plano.vendas[1].itens).toHaveLength(2);
    expect(plano.avisos.join()).toContain("sem quantidade");
  });

  it("divide o desconto na proporção do preço e recalcula o repasse sobre o valor pago", () => {
    const [liquida] = plano.vendas;
    expect(liquida).toMatchObject({ canal: "whatsapp_privado", formaPagamento: "pix", subtotalCentavos: 4000, descontoCentavos: 400, totalCentavos: 3600 });
    expect(liquida.itens.map((i) => [i.valorPagoCentavos, i.repasseCentavos, i.lucroCentavos])).toEqual([
      [2700, 1080, 1620],
      [900, 360, 540],
    ]);
  });

  it("repasse já acertado mantém o valor do Notion; peça da loja tem lucro = valor − custo", () => {
    const [casaco, vestido] = plano.vendas[1].itens;
    expect(casaco).toMatchObject({ valorPagoCentavos: 5000, repasseCentavos: 2000, lucroCentavos: 3000, repasseRecebido: true, repasseRecebidoEm: "2026-09-08" });
    expect(vestido).toMatchObject({ valorPagoCentavos: 2000, repasseCentavos: 0, custoCentavos: 500, lucroCentavos: 1500, percentualRepasse: undefined });
    expect(plano.vendas[1]).toMatchObject({ canal: "bag", formaPagamento: "cartao" });
  });

  it("liga a venda ao cliente cadastrado", () => {
    expect(plano.vendas[0].cliente).toBe("Cliente Teste");
    expect(plano.clientes).toHaveLength(1);
  });
});
