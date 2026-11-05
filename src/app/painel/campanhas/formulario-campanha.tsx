"use client";

import { useActionState } from "react";
import { TAMANHOS } from "@/lib/tamanhos";
import estilos from "../formulario.module.css";
import { salvarCampanha } from "./acoes";

/** Formulário da campanha: página /c/<endereço>, tamanhos, faixa com contagem e cupom. */
export function FormularioCampanha({ iniciais, tamanhosIniciais }: { iniciais?: Record<string, string>; tamanhosIniciais?: string[] }) {
  const [estado, acao, enviando] = useActionState(salvarCampanha, undefined);
  const v = estado?.valores ?? iniciais ?? { ativa: "on" };
  const marcados = new Set(estado?.tamanhos ?? tamanhosIniciais ?? ["Prematuro", "RN"]);
  return (
    <form action={acao} className={estilos.formulario} key={JSON.stringify(estado ?? null)}>
      {v.id && <input type="hidden" name="id" value={v.id} />}
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <fieldset className={estilos.grupo}>
        <legend>Página da campanha</legend>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Nome
            <input name="nome" defaultValue={v.nome} maxLength={80} required placeholder="Lançamento RN" />
          </label>
          <label className={estilos.campo}>
            Endereço
            <input name="codigo" defaultValue={v.codigo} maxLength={40} placeholder="rn" />
            <span className={estilos.dica}>Fica /c/rn. Vazio: vem do nome.</span>
          </label>
        </div>
        <label className={estilos.campo}>
          Título da página
          <input name="titulo" defaultValue={v.titulo} maxLength={120} placeholder="O site da Salty abriu primeiro para o grupo RN" />
        </label>
        <label className={estilos.campo}>
          Texto
          <textarea name="texto" defaultValue={v.texto} rows={4} maxLength={2000} placeholder="Peças selecionadas para os primeiros meses do bebê." />
          <span className={estilos.dica}>Deixe uma linha em branco para começar outro parágrafo.</span>
        </label>
        <fieldset className={estilos.opcoes}>
          <legend>Tamanhos das peças da página</legend>
          {TAMANHOS.map((t) => (
            <label key={t.valor} className={estilos.marcar}>
              <input type="checkbox" name="tamanhos" value={t.valor} defaultChecked={marcados.has(t.valor)} />
              {t.valor}
            </label>
          ))}
        </fieldset>
        <span className={estilos.dica}>
          Entram as peças à venda desses tamanhos, inclusive as &ldquo;Não listado&rdquo; (que não aparecem na vitrine). Assim, deixe as
          peças da campanha como Não listado até abrir para todo mundo.
        </span>
      </fieldset>
      <fieldset className={estilos.grupo}>
        <legend>Faixa no alto do site e cupom</legend>
        <label className={estilos.campo}>
          Frase da faixa
          <input name="faixa" defaultValue={v.faixa} maxLength={160} placeholder="Cadastre-se até amanhã às 9h e ganhe 10% na primeira compra" />
          <span className={estilos.dica}>Aparece no alto de todas as páginas da loja e leva para a página da campanha. Vazia: sem faixa.</span>
        </label>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Fim da contagem (hora de Brasília)
            <input type="datetime-local" name="ate" defaultValue={v.ate} />
            <span className={estilos.dica}>A faixa mostra o tempo que falta e some nessa hora. Use o fim do prazo do cadastro.</span>
          </label>
          <label className={estilos.campo}>
            Cupom divulgado
            <input name="cupom" defaultValue={v.cupom} maxLength={30} placeholder="BEMVINDA10" style={{ textTransform: "uppercase" }} />
            <span className={estilos.dica}>O cupom criado em Cupons. A página mostra as regras dele.</span>
          </label>
        </div>
        <label className={estilos.marcar}>
          <input type="checkbox" name="ativa" defaultChecked={v.ativa === "on"} />
          Campanha no ar (só uma fica no ar por vez)
        </label>
      </fieldset>
      <button className={estilos.botao} type="submit" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar campanha"}
      </button>
    </form>
  );
}
