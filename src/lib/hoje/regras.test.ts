import { describe, expect, it } from "vitest";
import {
  alertaDoBackup,
  aniversarioProximo,
  estaSumida,
  lembretesDaLoja,
  mensagemAniversario,
  mensagemClienteSumida,
  mensagemPecaVendida,
  mensagemPedidoNaoPago,
  mesDoAcerto,
} from "./regras";

describe("lembretes da loja", () => {
  it("segunda-feira lembra dos lançamentos", () => {
    const l = lembretesDaLoja({ hoje: "2026-10-26", acertosAPagar: 0, relatoriosAEnviar: 0, mesPassado: "2026-09" });
    expect(l.map((x) => x.chave)).toEqual(["lancamentos"]);
    expect(lembretesDaLoja({ hoje: "2026-10-27", acertosAPagar: 0, relatoriosAEnviar: 0, mesPassado: "2026-09" })).toEqual([]);
  });

  it("na primeira semana do mês lembra do acerto e dos relatórios enquanto houver", () => {
    const l = lembretesDaLoja({ hoje: "2026-11-03", acertosAPagar: 4, relatoriosAEnviar: 1, mesPassado: "2026-10" });
    expect(l.map((x) => x.chave)).toEqual(["acerto", "relatorios"]);
    expect(l[0].texto).toContain("4 fornecedoras têm");
    expect(l[1].texto).toBe("1 relatório de outubro de 2026 ainda não foi enviado.");
    expect(lembretesDaLoja({ hoje: "2026-11-10", acertosAPagar: 4, relatoriosAEnviar: 1, mesPassado: "2026-10" })).toEqual([]);
    expect(lembretesDaLoja({ hoje: "2026-11-03", acertosAPagar: 0, relatoriosAEnviar: 0, mesPassado: "2026-10" })).toEqual([]);
  });
});

describe("alerta do backup", () => {
  const agora = new Date("2026-10-28T12:00:00Z");
  const ok = { situacao: "ok" as const, iniciadoEm: new Date("2026-10-28T09:00:00Z"), noDrive: true, mensagem: null };
  it("sem alerta quando a cópia de hoje foi para o Drive", () => {
    expect(alertaDoBackup(ok, true, agora)).toBeNull();
  });
  it("avisa erro, atraso, Drive desligado e nenhuma cópia", () => {
    expect(alertaDoBackup({ ...ok, situacao: "erro", mensagem: "sem espaço" }, true, agora)?.tipo).toBe("erro");
    expect(alertaDoBackup({ ...ok, iniciadoEm: new Date("2026-10-26T09:00:00Z") }, true, agora)?.texto).toContain("2 dia(s)");
    expect(alertaDoBackup(ok, false, agora)?.tipo).toBe("sem-drive");
    expect(alertaDoBackup({ ...ok, noDrive: false }, true, agora)?.tipo).toBe("sem-drive");
    expect(alertaDoBackup(null, true, agora)?.tipo).toBe("atrasado");
  });
});

describe("mês do acerto", () => {
  it("venda até 10 dias antes do fim do mês entra no dia 1 seguinte", () => {
    expect(mesDoAcerto("2026-10-21")).toBe("2026-11");
    expect(mesDoAcerto("2026-10-22")).toBe("2026-12");
    expect(mesDoAcerto("2026-12-25")).toBe("2027-02");
    expect(mesDoAcerto("2026-02-18")).toBe("2026-03");
    expect(mesDoAcerto("2026-02-19")).toBe("2026-04");
  });
});

describe("mensagens", () => {
  it("peça vendida diz quanto ela recebe e em que acerto", () => {
    const m = mensagemPecaVendida({
      nomeFornecedora: "Maria Souza",
      nomeLoja: "Salty Baby",
      pecas: [{ codigo: "F05-00012", nome: "Vestido de linho", repasseCentavos: 2000 }],
      dataVenda: "2026-10-05",
      linkArea: "https://x/fornecedora",
    });
    expect(m).toContain("Oi, Maria!");
    expect(m).toContain("*uma peça sua foi vendida!*");
    expect(m).toMatch(/Vestido de linho \(F05-00012\): R\$\s20,00 para você/);
    expect(m).toContain("acerto do início de novembro de 2026");
    const duas = mensagemPecaVendida({
      nomeFornecedora: "Maria",
      nomeLoja: "Salty Baby",
      pecas: [
        { codigo: "A", nome: "A", repasseCentavos: 1000 },
        { codigo: "B", nome: "B", repasseCentavos: 500 },
      ],
      dataVenda: "2026-10-25",
      linkArea: "x",
    });
    expect(duas).toMatch(/O total de R\$\s15,00 entra no acerto do início de dezembro de 2026/);
  });

  it("pedido não pago lista as peças que ainda estão à venda", () => {
    const m = mensagemPedidoNaoPago({
      nomeCliente: "Ana",
      nomeLoja: "Salty Baby",
      numero: 42,
      pecas: [{ nome: "Body", tamanho: "P", precoCentavos: 3500, link: "https://x/peca/f01-00001" }],
    });
    expect(m).toContain("pedido nº 42");
    expect(m).toContain("A peça ainda está disponível");
    expect(m).toMatch(/• Body \(tam\. P\): R\$\s35,00\nhttps:\/\/x\/peca\/f01-00001/);
  });

  it("cliente sumida: entre 60 dias e um ano, com as novidades no tamanho", () => {
    const agora = new Date("2026-10-28T12:00:00Z");
    expect(estaSumida(new Date("2026-08-20T12:00:00Z"), agora)).toBe(true);
    expect(estaSumida(new Date("2026-09-20T12:00:00Z"), agora)).toBe(false);
    expect(estaSumida(new Date("2025-08-20T12:00:00Z"), agora)).toBe(false);
    const m = mensagemClienteSumida({
      nomeCliente: "Bia",
      nomeLoja: "Salty Baby",
      novidades: [
        { tamanho: "2", quantidade: 5, link: "https://x/?tamanho=2" },
        { tamanho: "3", quantidade: 0, link: "https://x/?tamanho=3" },
      ],
      linkLoja: "https://x/",
    });
    expect(m).toContain("• 5 peças novas no tamanho 2:\nhttps://x/?tamanho=2");
    expect(m).not.toContain("tamanho 3");
    expect(mensagemClienteSumida({ nomeCliente: "Bia", nomeLoja: "S", novidades: [], linkLoja: "https://x/" })).toContain(
      "Dá uma olhada nas novidades: https://x/",
    );
  });

  it("aniversário nos próximos 7 dias, com a idade", () => {
    const nasc = new Date("2023-11-02T00:00:00Z");
    expect(aniversarioProximo(nasc, "2026-10-28")).toEqual({ dia: "2026-11-02", anos: 3 });
    expect(aniversarioProximo(nasc, "2026-10-20")).toBeNull();
    expect(aniversarioProximo(new Date("2025-11-02T00:00:00Z"), "2025-10-28")).toBeNull();
    expect(aniversarioProximo(new Date("2024-01-02T00:00:00Z"), "2026-12-30")).toEqual({ dia: "2027-01-02", anos: 3 });
    expect(aniversarioProximo(new Date("2024-02-29T00:00:00Z"), "2026-02-25")).toEqual({ dia: "2026-02-28", anos: 2 });
    const m = mensagemAniversario({
      nomeCliente: "Ana",
      nomeLoja: "Salty Baby",
      nomeCrianca: "Lia Souza",
      anos: 3,
      dia: "2026-11-02",
      tamanho: "4",
      quantidade: 7,
      link: "https://x/?tamanho=4",
    });
    expect(m).toContain("Lia faz 3 anos no dia 02/11! 🎂");
    expect(m).toContain("no tamanho 4, para a nova fase (7 peças):\nhttps://x/?tamanho=4");
    expect(mensagemAniversario({ ...{ nomeCliente: "A", nomeLoja: "S", nomeCrianca: null, anos: 1, dia: "2026-11-02", tamanho: null, quantidade: 0, link: "l" } })).toContain(
      "Sua criança faz 1 aninho",
    );
  });
});
