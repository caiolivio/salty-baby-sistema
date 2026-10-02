import { describe, expect, it } from "vitest";
import {
  chaveConfere,
  cifrar,
  copiasLocaisParaApagar,
  copiasParaApagar,
  decifrar,
  diaDaCopia,
  emailDoIdToken,
  nomeDaCopia,
  opcoesDoMysql,
  semanaDoDia,
  tamanhoLegivel,
} from "./regras";

const copia = (dia: string, hora = "030000") => `banco-${dia}-${hora}.sql.gz`;

function dias(inicio: string, quantos: number): string[] {
  const data = new Date(`${inicio}T12:00:00Z`);
  return Array.from({ length: quantos }, (_, i) => {
    const d = new Date(data);
    d.setUTCDate(d.getUTCDate() - i);
    return d.toISOString().slice(0, 10);
  });
}

describe("nome da cópia", () => {
  it("usa o dia e a hora de São Paulo", () => {
    // 01:30 UTC do dia 2 ainda é dia 1 em São Paulo.
    expect(nomeDaCopia(new Date("2026-10-02T01:30:05Z"))).toBe("banco-2026-10-01-223005.sql.gz");
    expect(diaDaCopia("banco-2026-10-01-223005.sql.gz")).toBe("2026-10-01");
    expect(diaDaCopia("outra-coisa.sql.gz")).toBeNull();
  });

  it("acha a segunda-feira da semana", () => {
    expect(semanaDoDia("2026-10-01")).toBe("2026-09-28"); // quinta
    expect(semanaDoDia("2026-09-28")).toBe("2026-09-28"); // segunda
    expect(semanaDoDia("2026-10-04")).toBe("2026-09-28"); // domingo
  });
});

describe("quais cópias ficam no Drive", () => {
  it("com poucas cópias, não apaga nada", () => {
    expect(copiasParaApagar(dias("2026-10-01", 5).map((d) => copia(d)))).toEqual([]);
  });

  it("guarda os últimos 7 dias e uma por semana no último mês", () => {
    const todas = dias("2026-10-01", 60).map((d) => copia(d));
    const apagar = new Set(copiasParaApagar(todas));
    const ficam = todas.filter((n) => !apagar.has(n)).map((n) => diaDaCopia(n));
    expect(ficam).toEqual([
      // últimos 7 dias
      "2026-10-01", "2026-09-30", "2026-09-29", "2026-09-28", "2026-09-27", "2026-09-26", "2026-09-25",
      // a mais nova de cada semana anterior (domingos), até 5 semanas contando a atual
      "2026-09-20", "2026-09-13", "2026-09-06",
    ]);
  });

  it("no mesmo dia fica só a mais recente, e outros arquivos não são tocados", () => {
    const nomes = [copia("2026-10-01", "030000"), copia("2026-10-01", "150000"), "leia-me.txt"];
    expect(copiasParaApagar(nomes)).toEqual([copia("2026-10-01", "030000")]);
  });

  it("no servidor ficam as 7 mais recentes", () => {
    const todas = dias("2026-10-01", 10).map((d) => copia(d));
    expect(copiasLocaisParaApagar(todas)).toEqual(todas.slice(7));
  });
});

describe("segurança", () => {
  it("cifra e decifra a autorização, e recusa com outra chave", () => {
    const cifrado = cifrar("1//token-secreto", "chave-do-servidor");
    expect(cifrado).not.toContain("token");
    expect(decifrar(cifrado, "chave-do-servidor")).toBe("1//token-secreto");
    expect(decifrar(cifrado, "outra-chave")).toBeNull();
    expect(decifrar("lixo", "chave-do-servidor")).toBeNull();
  });

  it("confere a chave do agendamento", () => {
    const chave = "a".repeat(64);
    expect(chaveConfere(chave, chave)).toBe(true);
    expect(chaveConfere("b".repeat(64), chave)).toBe(false);
    expect(chaveConfere(null, chave)).toBe(false);
    expect(chaveConfere("", undefined)).toBe(false);
    expect(chaveConfere("curta", "curta")).toBe(false); // chave fraca nunca vale
  });

  it("escreve a senha do banco com aspas e barras escapadas", () => {
    const texto = opcoesDoMysql({ host: "127.0.0.1", porta: 3306, usuario: "loja", senha: 'a"b\\c' });
    expect(texto).toContain('password="a\\"b\\\\c"');
    expect(texto.startsWith("[client]\n")).toBe(true);
  });

  it("lê o e-mail do id_token do Google", () => {
    const carga = Buffer.from(JSON.stringify({ email: "salty@gmail.com" })).toString("base64url");
    expect(emailDoIdToken(`x.${carga}.y`)).toBe("salty@gmail.com");
    expect(emailDoIdToken("quebrado")).toBeNull();
    expect(emailDoIdToken(undefined)).toBeNull();
  });
});

it("mostra o tamanho do arquivo", () => {
  expect(tamanhoLegivel(500)).toBe("500 bytes");
  expect(tamanhoLegivel(1536)).toBe("1,5 KB");
  expect(tamanhoLegivel(5 * 1024 * 1024)).toBe("5 MB");
});
