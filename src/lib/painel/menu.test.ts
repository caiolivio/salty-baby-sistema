import { describe, expect, it } from "vitest";
import { acessoDaEquipe, SEM_ACESSO } from "../permissoes";
import { grupoDaPagina, itensDoMenu } from "./menu";

const admin = { ...SEM_ACESSO, administradora: true };

describe("menu do painel", () => {
  it("segue a ordem combinada, com Finanças e Configurações em grupos", () => {
    const itens = itensDoMenu(admin);
    expect(itens.map((i) => i.nome)).toEqual([
      "Início",
      "Finanças",
      "Peças",
      "Categorias",
      "Devoluções",
      "Pedidos",
      "Vendas",
      "Clientes",
      "Sacolinhas",
      "Promoções",
      "Cupons",
      "WhatsApp Marketing",
      "Fornecedores",
      "Seja fornecedora",
      "Histórico",
      "Configurações",
    ]);
    expect(itens[1].filhos?.map((f) => f.chave)).toEqual(["financeiro", "acertos", "indicadores", "relatorios"]);
    expect(itens.at(-1)?.filhos?.map((f) => f.chave)).toEqual(["configuracoes", "equipe", "backup", "importar"]);
  });

  it("o suporte vê só as páginas liberadas e nenhum grupo vazio", () => {
    const acesso = acessoDaEquipe(["ajudante"], [
      { chave: "pecas", nivel: "alterar" },
      { chave: "sacolinhas", nivel: "ver" },
      { chave: "backup", nivel: "sim" },
    ]);
    const itens = itensDoMenu(acesso);
    expect(itens.map((i) => i.chave)).toEqual(["", "pecas", "sacolinhas", "configuracao"]);
    expect(itens.at(-1)?.filhos).toEqual([{ chave: "backup", nome: "Backup" }]);
  });

  it("acha o grupo da página aberta", () => {
    const itens = itensDoMenu(admin);
    expect(grupoDaPagina(itens, "/painel/acertos/pagar/x")?.chave).toBe("financas");
    expect(grupoDaPagina(itens, "/painel/equipe")?.chave).toBe("configuracao");
    expect(grupoDaPagina(itens, "/painel/pecas")).toBeUndefined();
  });
});
