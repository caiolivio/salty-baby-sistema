"use client";

import { useActionState, useState } from "react";
import { contraste, CONTRASTE_MINIMO } from "@/lib/loja/cores";
import estilos from "../formulario.module.css";
import { salvarConfiguracoes } from "./acoes";

type Valores = {
  nome: string;
  nomeCurto: string;
  slogan: string;
  descricao: string;
  whatsapp: string;
  instagram: string;
  corDestaque: string;
  corPrincipal: string;
  corTexto: string;
  prefixoLoja: string;
  repassePadrao: string;
  minutosReserva: string;
  mesesDevolucao: string;
};

const CORES = [
  { campo: "corDestaque", nome: "Destaque", dica: "Ícones e detalhes. Pode ser clara." },
  { campo: "corPrincipal", nome: "Principal", dica: "Botões, links e títulos. Precisa ser escura o bastante para ler." },
  { campo: "corTexto", nome: "Texto", dica: "Texto das páginas. Quase preto." },
] as const;

export function FormularioLoja({
  iniciais,
  imagens,
  prefixoFixo,
}: {
  iniciais: Valores;
  imagens: { logo: string; icone: string; logoPropria: boolean; iconePropria: boolean };
  /** Já há peças da loja com o prefixo atual: ele não muda mais. */
  prefixoFixo: boolean;
}) {
  const [estado, enviar, enviando] = useActionState(salvarConfiguracoes, undefined);
  const v = (campo: keyof Valores) => (estado?.erro && estado.valores ? (estado.valores[campo] ?? "") : iniciais[campo]);
  const [cores, setCores] = useState({ corDestaque: v("corDestaque"), corPrincipal: v("corPrincipal"), corTexto: v("corTexto") });
  const clara = (cor: string) => /^#[0-9a-f]{6}$/i.test(cor) && contraste(cor, "#FFFFFF") < CONTRASTE_MINIMO;

  return (
    <form action={enviar} className={estilos.formulario} key={estado?.aviso ?? "configuracoes"}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      {estado?.aviso && (
        <p className={estilos.aviso} role="status">
          {estado.aviso}
        </p>
      )}

      <fieldset className={estilos.grupo}>
        <legend>Loja</legend>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Nome da loja
            <input name="nome" required maxLength={80} defaultValue={v("nome")} />
            <span className={estilos.dica}>No topo das páginas, nos títulos e nas mensagens.</span>
          </label>
          <label className={estilos.campo}>
            Nome curto
            <input name="nomeCurto" required maxLength={40} defaultValue={v("nomeCurto")} />
            <span className={estilos.dica}>Nos textos do dia a dia: &quot;a Salty entra em contato&quot;.</span>
          </label>
          <label className={estilos.campo}>
            Slogan
            <input name="slogan" maxLength={120} defaultValue={v("slogan")} />
          </label>
          <label className={estilos.campo}>
            Descrição
            <input name="descricao" maxLength={160} defaultValue={v("descricao")} />
            <span className={estilos.dica}>Uma linha sobre a loja, no rodapé do site. Ex.: Brechó infantil em Caraguatatuba-SP.</span>
          </label>
          <label className={estilos.campo}>
            WhatsApp da loja
            <input name="whatsapp" type="tel" inputMode="tel" required maxLength={20} defaultValue={v("whatsapp")} />
            <span className={estilos.dica}>Para onde vão os pedidos do site e os pedidos de ajuda.</span>
          </label>
          <label className={estilos.campo}>
            Instagram
            <input name="instagram" maxLength={60} defaultValue={v("instagram")} placeholder="@perfil" />
            <span className={estilos.dica}>Opcional. Aparece no rodapé do site.</span>
          </label>
        </div>
      </fieldset>

      <fieldset className={estilos.grupo}>
        <legend>Marca</legend>
        <div className={estilos.grade}>
          <div className={estilos.campo}>
            Logo
            {/* eslint-disable-next-line @next/next/no-img-element -- prévia da imagem atual */}
            <img src={imagens.logo} alt="Logo atual" className={estilos.previaLogo} />
            <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Novo logo" />
            <span className={estilos.dica}>PNG ou JPG, de preferência com fundo transparente ou branco.</span>
            {imagens.logoPropria && (
              <label className={estilos.marcar}>
                <input type="checkbox" name="logoPadrao" value="sim" /> Voltar ao logo original
              </label>
            )}
          </div>
          <div className={estilos.campo}>
            Ícone
            {/* eslint-disable-next-line @next/next/no-img-element -- prévia da imagem atual */}
            <img src={imagens.icone} alt="Ícone atual" className={estilos.previaIcone} />
            <input name="icone" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Novo ícone" />
            <span className={estilos.dica}>Quadrado. Aparece na aba do navegador, no painel e no atalho do celular.</span>
            {imagens.iconePropria && (
              <label className={estilos.marcar}>
                <input type="checkbox" name="iconePadrao" value="sim" /> Voltar ao ícone original
              </label>
            )}
          </div>
        </div>
        <div className={estilos.grade}>
          {CORES.map((c) => (
            <label key={c.campo} className={estilos.campo}>
              Cor {c.nome.toLowerCase()}
              <span className={estilos.linhaCor}>
                <input
                  type="color"
                  value={cores[c.campo]}
                  onChange={(e) => setCores({ ...cores, [c.campo]: e.target.value.toUpperCase() })}
                  aria-label={`Escolher a cor ${c.nome.toLowerCase()}`}
                />
                <input
                  name={c.campo}
                  value={cores[c.campo]}
                  onChange={(e) => setCores({ ...cores, [c.campo]: e.target.value })}
                  maxLength={7}
                  pattern="#[0-9A-Fa-f]{6}"
                  required
                />
              </span>
              <span className={estilos.dica}>{c.dica}</span>
              {c.campo !== "corDestaque" && clara(cores[c.campo]) && (
                <span className={estilos.erro}>Clara demais para ler sobre o branco.</span>
              )}
            </label>
          ))}
        </div>
        <div className={estilos.previaCores} aria-label="Prévia das cores">
          <span style={{ background: cores.corDestaque }} className={estilos.bolinha} aria-hidden />
          <strong style={{ color: cores.corPrincipal }}>Título na cor principal</strong>
          <span style={{ color: cores.corTexto }}>Texto das páginas na cor de texto.</span>
          <span className={estilos.botao} style={{ background: cores.corPrincipal }}>
            Botão
          </span>
        </div>
      </fieldset>

      <fieldset className={estilos.grupo}>
        <legend>Regras</legend>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            % repasse padrão
            <input name="repassePadrao" inputMode="decimal" required defaultValue={v("repassePadrao")} />
            <span className={estilos.dica}>Já vem preenchido nas fornecedoras novas. As que já existem não mudam.</span>
          </label>
          <label className={estilos.campo}>
            Minutos de reserva
            <input name="minutosReserva" type="number" min={5} max={1440} required defaultValue={v("minutosReserva")} />
            <span className={estilos.dica}>Quanto tempo as peças ficam guardadas depois de &quot;Fechar pedido&quot;.</span>
          </label>
          <label className={estilos.campo}>
            Meses para pedir devolução
            <input name="mesesDevolucao" type="number" min={0} max={36} required defaultValue={v("mesesDevolucao")} />
            <span className={estilos.dica}>A fornecedora pede a peça de volta só depois deste tempo da entrada.</span>
          </label>
          <label className={estilos.campo}>
            Prefixo das peças da loja
            {prefixoFixo ? (
              <>
                <input type="hidden" name="prefixoLoja" value={iniciais.prefixoLoja} />
                <span className={estilos.fixo}>{iniciais.prefixoLoja}</span>
                <span className={estilos.dica}>Não muda mais: já existem peças da loja com este código.</span>
              </>
            ) : (
              <>
                <input name="prefixoLoja" required minLength={2} maxLength={4} defaultValue={v("prefixoLoja")} />
                <span className={estilos.dica}>De 2 a 4 letras. As peças da loja ficam {v("prefixoLoja") || "SB"}-00001…</span>
              </>
            )}
          </label>
        </div>
      </fieldset>

      <div className={estilos.acoes}>
        <button className={estilos.botao} type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar configurações"}
        </button>
      </div>
    </form>
  );
}
