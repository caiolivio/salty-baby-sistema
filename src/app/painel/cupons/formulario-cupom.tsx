"use client";

import { useActionState, useState } from "react";
import { GENEROS } from "@/lib/pecas/dados";
import { TAMANHOS } from "@/lib/tamanhos";
import estilos from "../formulario.module.css";
import { salvarCupom } from "./acoes";

type Opcao = { id: string; nome: string; detalhe?: string };

/** Formulário do cupom: código, desconto, validade, limites e restrições. */
export function FormularioCupom({
  iniciais,
  clientes,
  fornecedoras,
}: {
  iniciais?: Record<string, string>;
  clientes: Opcao[];
  fornecedoras: Opcao[];
}) {
  const [estado, acao, enviando] = useActionState(salvarCupom, undefined);
  const v = estado?.valores ?? iniciais ?? {};
  const [tipo, setTipo] = useState(v.tipo || "percentual");
  const novo = !v.id;
  return (
    <form action={acao} className={estilos.formulario} key={JSON.stringify(estado ?? null)}>
      {v.id && <input type="hidden" name="id" value={v.id} />}
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <fieldset className={estilos.grupo}>
        <legend>Cupom</legend>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Código
            <input
              name="codigo"
              defaultValue={v.codigo}
              maxLength={30}
              required
              placeholder="Ex.: BEMVINDA10"
              autoCapitalize="characters"
              style={{ textTransform: "uppercase" }}
            />
          </label>
          <label className={estilos.campo}>
            Desconto em
            <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="percentual">% do valor das peças</option>
              <option value="reais">R$ (valor fixo)</option>
            </select>
          </label>
          <label className={estilos.campo}>
            {tipo === "reais" ? "Desconto (R$)" : "Desconto (%)"}
            <input name="valor" defaultValue={v.valor} inputMode="decimal" required placeholder={tipo === "reais" ? "10,00" : "10"} />
          </label>
        </div>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Vale a partir de
            <input type="date" name="inicio" defaultValue={v.inicio} />
          </label>
          <label className={estilos.campo}>
            Vale até
            <input type="date" name="fim" defaultValue={v.fim} />
          </label>
          <label className={estilos.campo}>
            Limite de usos
            <input name="limite" defaultValue={v.limite} inputMode="numeric" placeholder="Sem limite" />
          </label>
          <label className={estilos.campo}>
            Pedido mínimo (R$)
            <input name="minimo" defaultValue={v.minimo} inputMode="decimal" placeholder="Sem mínimo" />
          </label>
        </div>
        <span className={estilos.dica}>Datas vazias: vale desde já e sem data para acabar. Cada pedido do site conta um uso.</span>
        <fieldset className={estilos.opcoes}>
          <legend>Quem paga o desconto das peças consignadas</legend>
          <label className={estilos.marcar}>
            <input type="radio" name="quem" value="dividido" defaultChecked={v.quem !== "loja"} /> Dividido com a fornecedora
          </label>
          <label className={estilos.marcar}>
            <input type="radio" name="quem" value="loja" defaultChecked={v.quem === "loja"} /> Por conta da loja
          </label>
        </fieldset>
        {!novo && (
          <label className={estilos.marcar}>
            <input type="checkbox" name="ativo" defaultChecked={v.ativo !== ""} /> Cupom ativo (desmarque para pausar)
          </label>
        )}
      </fieldset>
      <fieldset className={estilos.grupo}>
        <legend>Só para (opcional)</legend>
        <span className={estilos.dica}>Deixe tudo em branco para o cupom valer para todas as clientes e peças.</span>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Cliente
            <select name="clienteId" defaultValue={v.clienteId ?? ""}>
              <option value="">Todas as clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.detalhe ? ` · ${c.detalhe}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className={estilos.campo}>
            Marca
            <input name="marca" defaultValue={v.marca} maxLength={80} placeholder="Todas as marcas" />
          </label>
          <label className={estilos.campo}>
            Tamanho
            <select name="tamanho" defaultValue={v.tamanho ?? ""}>
              <option value="">Todos os tamanhos</option>
              {TAMANHOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
          <label className={estilos.campo}>
            Gênero
            <select name="genero" defaultValue={v.genero ?? ""}>
              <option value="">Todos</option>
              {GENEROS.map((g) => (
                <option key={g.valor} value={g.valor}>
                  {g.nome}
                </option>
              ))}
            </select>
          </label>
          <label className={estilos.campo}>
            Fornecedora
            <select name="fornecedoraId" defaultValue={v.fornecedoraId ?? ""}>
              <option value="">Todas</option>
              {fornecedoras.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
        <span className={estilos.dica}>
          Com cliente escolhida, ela precisa entrar na conta para usar. Com marca, tamanho, gênero ou fornecedora, o desconto vale só para
          essas peças do carrinho.
        </span>
      </fieldset>
      <div className={estilos.acoes}>
        <button type="submit" className={estilos.botao} disabled={enviando}>
          {enviando ? "Salvando…" : novo ? "Criar cupom" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
