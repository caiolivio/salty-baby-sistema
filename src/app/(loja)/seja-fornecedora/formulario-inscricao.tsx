"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useState, type ReactNode } from "react";
import { useAvisoDoEnvio } from "@/componentes/aviso-do-envio";
import { Desafio } from "@/componentes/desafio";
import { reduzirFoto } from "@/componentes/reduzir-foto";
import estilos from "../loja.module.css";
import { enviarInscricao } from "./acoes";

type PecaNaTela = { chave: number; foto: File | null; previa: string | null; descricao: string };

let proximaChave = 1;
const novaPeca = (descricao = ""): PecaNaTela => ({ chave: proximaChave++, foto: null, previa: null, descricao });

/** Passo 1: dados da pessoa e até 5 peças, cada uma com foto e descrição. */
export function FormularioInscricao({
  desafio,
  limite,
  tituloResumo,
  resumo,
}: {
  desafio: { imagem: string; ficha: string };
  limite: number;
  tituloResumo: string;
  resumo: ReactNode;
}) {
  const [estado, despachar, enviando] = useActionState(enviarInscricao, undefined);
  const [preparando, setPreparando] = useState(false);
  const [pecas, setPecas] = useState<PecaNaTela[]>(() => [novaPeca()]);
  const v = (campo: string) => estado?.valores[campo];
  const ocupado = enviando || preparando;
  const { aviso, setAviso, aoFaltarCampo } = useAvisoDoEnvio();

  function mudar(chave: number, mudanca: Partial<PecaNaTela>) {
    setPecas((atuais) => atuais.map((p) => (p.chave === chave ? { ...p, ...mudanca } : p)));
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const preenchidas = pecas.filter((p) => p.foto || p.descricao.trim());
    const falta = preenchidas.length === 0 ? 0 : preenchidas.findIndex((p) => !p.foto || !p.descricao.trim());
    if (preenchidas.length === 0 || falta >= 0) {
      const i = preenchidas.length === 0 ? 0 : pecas.indexOf(preenchidas[falta]);
      const p = pecas[i];
      setAviso(`Preencha todos os dados. Falta ${p?.foto ? "a descrição" : "a foto"} da peça ${i + 1}.`);
      return;
    }
    setAviso(null);
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
    <form onSubmit={enviar} onInvalidCapture={aoFaltarCampo} className={`${estilos.formConta} ${estilos.formLargo}`} key={estado ? JSON.stringify(estado.valores) : "novo"}>
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
            <Plus className="icone" aria-hidden />
            Mostrar outra peça
          </button>
        )}
      </fieldset>

      <section className={estilos.grupoForm} aria-labelledby="resumo-contrato">
        <h2 id="resumo-contrato" className={estilos.tituloResumo}>
          {tituloResumo}
        </h2>
        <div className={estilos.acordo} tabIndex={0} aria-label="Texto do resumo do contrato">
          {resumo}
        </div>
      </section>
      <label className={estilos.marcarLinha}>
        <input type="checkbox" name="resumo" value="sim" required />
        <span>Li o resumo do contrato e quero me inscrever.</span>
      </label>
      <p className={estilos.dica}>
        Seus dados são usados só para a inscrição, como explica o{" "}
        <Link href="/privacidade" target="_blank">
          aviso de privacidade
        </Link>
        .
      </p>
      <Desafio inicial={estado?.desafio ?? desafio} />
      {(aviso || estado?.erro) && (
        <p className={estilos.avisoPerto} role={aviso ? "alert" : undefined}>
          {aviso ?? estado?.erro}
        </p>
      )}
      <button type="submit" className={estilos.botaoWhats} disabled={ocupado}>
        {preparando ? "Preparando as fotos…" : enviando ? "Enviando…" : "Enviar inscrição"}
      </button>
    </form>
  );
}
