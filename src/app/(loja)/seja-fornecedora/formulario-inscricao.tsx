"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { Desafio } from "@/componentes/desafio";
import { reduzirFoto } from "@/componentes/reduzir-foto";
import estilos from "../loja.module.css";
import { enviarInscricao } from "./acoes";

type PecaNaTela = { chave: number; foto: File | null; previa: string | null; descricao: string };

let proximaChave = 1;
const novaPeca = (descricao = ""): PecaNaTela => ({ chave: proximaChave++, foto: null, previa: null, descricao });

/** Passo 1: dados da pessoa e até 5 peças, cada uma com foto e descrição. */
export function FormularioInscricao({ desafio, limite }: { desafio: { imagem: string; ficha: string }; limite: number }) {
  const [estado, despachar, enviando] = useActionState(enviarInscricao, undefined);
  const [preparando, setPreparando] = useState(false);
  const [pecas, setPecas] = useState<PecaNaTela[]>(() => [novaPeca()]);
  const v = (campo: string) => estado?.valores[campo];
  const ocupado = enviando || preparando;

  function mudar(chave: number, mudanca: Partial<PecaNaTela>) {
    setPecas((atuais) => atuais.map((p) => (p.chave === chave ? { ...p, ...mudanca } : p)));
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setPreparando(true);
    const dados = new FormData(evento.currentTarget);
    for (const [i, p] of pecas.entries()) {
      dados.set(`descricao_${i}`, p.descricao);
      if (p.foto) dados.set(`foto_${i}`, await reduzirFoto(p.foto), `foto-${i + 1}.jpg`);
    }
    setPreparando(false);
    startTransition(() => despachar(dados));
  }

  return (
    <form onSubmit={enviar} className={`${estilos.formConta} ${estilos.formLargo}`} key={estado ? JSON.stringify(estado.valores) : "novo"}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <fieldset className={estilos.grupoForm}>
        <legend>Seus dados</legend>
        <label>
          Nome completo
          <input name="nome" autoComplete="name" required maxLength={160} defaultValue={v("nome")} />
        </label>
        <label>
          E-mail
          <input name="email" type="email" autoComplete="email" required maxLength={191} defaultValue={v("email")} />
        </label>
        <label>
          WhatsApp (com DDD)
          <input
            name="telefone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={20}
            placeholder="(11) 98765-4321"
            defaultValue={v("telefone")}
          />
        </label>
        <label>
          Endereço (rua, número e bairro)
          <input name="endereco" autoComplete="street-address" required maxLength={255} defaultValue={v("endereco")} />
        </label>
        <div className={estilos.linhaCampos}>
          <label>
            CEP
            <input name="cep" inputMode="numeric" autoComplete="postal-code" maxLength={15} defaultValue={v("cep")} />
          </label>
          <label>
            Cidade
            <input name="cidade" autoComplete="address-level2" maxLength={100} defaultValue={v("cidade")} />
          </label>
          <label>
            Estado
            <input name="estado" autoComplete="address-level1" maxLength={60} defaultValue={v("estado")} />
          </label>
        </div>
      </fieldset>

      <fieldset className={estilos.grupoForm}>
        <legend>Peças que você gostaria de enviar</legend>
        <p className={estilos.dica}>
          Mostre até {limite} peças nesta primeira etapa. Cada uma precisa de uma foto e de uma descrição
          curta (o que é, tamanho, marca e estado).
        </p>
        <ol className={estilos.pecasInscricao}>
          {pecas.map((p, i) => (
            <li key={p.chave}>
              <strong>Peça {i + 1}</strong>
              <div className={estilos.fotoInscricao}>
                {p.previa ? (
                  // eslint-disable-next-line @next/next/no-img-element -- prévia da foto escolhida
                  <img src={p.previa} alt={`Foto da peça ${i + 1}`} />
                ) : (
                  <span className={estilos.semFoto}>Sem foto</span>
                )}
                <label className={estilos.botaoFoto}>
                  {p.foto ? "Trocar foto" : "Tirar ou escolher foto"}
                  <input
                    type="file"
                    accept="image/*"
                    className={estilos.escondido}
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0];
                      if (!arquivo) return;
                      if (p.previa) URL.revokeObjectURL(p.previa);
                      mudar(p.chave, { foto: arquivo, previa: URL.createObjectURL(arquivo) });
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <label>
                Descrição
                <textarea
                  rows={2}
                  maxLength={500}
                  value={p.descricao}
                  placeholder="Ex.: Vestido de festa rosa, tamanho 2 anos, marca Fakini, usado poucas vezes"
                  onChange={(e) => mudar(p.chave, { descricao: e.target.value })}
                />
              </label>
              {pecas.length > 1 && (
                <button
                  type="button"
                  className={estilos.linkTirar}
                  onClick={() => setPecas((atuais) => atuais.filter((x) => x.chave !== p.chave))}
                >
                  Tirar esta peça
                </button>
              )}
            </li>
          ))}
        </ol>
        {pecas.length < limite && (
          <button type="button" className={estilos.botaoContorno} onClick={() => setPecas((atuais) => [...atuais, novaPeca()])}>
            + Mostrar outra peça
          </button>
        )}
      </fieldset>

      <label className={estilos.marcarLinha}>
        <input type="checkbox" name="privacidade" value="sim" required />
        <span>
          Li e aceito o{" "}
          <Link href="/privacidade" target="_blank">
            aviso de privacidade
          </Link>
          .
        </span>
      </label>
      <Desafio inicial={estado?.desafio ?? desafio} />
      <button type="submit" className={estilos.botaoWhats} disabled={ocupado}>
        {preparando ? "Preparando as fotos…" : enviando ? "Enviando…" : "Enviar inscrição"}
      </button>
    </form>
  );
}
