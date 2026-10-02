import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { formatarDataHora } from "@/lib/datas";
import { buscarSuporte } from "@/lib/equipe/gravar";
import { formatarTelefone } from "@/lib/pedidos/regras";
import estilos from "../../painel.module.css";
import proprios from "../../formulario.module.css";
import { HistoricoDoRegistro } from "../../historico/do-registro";
import { salvarAcessoDoSuporte } from "../acoes";
import { FormularioSuporte } from "../formulario-suporte";
import { LinkDeSenha } from "../link-de-senha";
import { TirarDaEquipe } from "../tirar-da-equipe";

export const metadata: Metadata = { title: "Suporte" };

export default async function Suporte({ params, searchParams }: PageProps<"/painel/equipe/[id]">) {
  const { id } = await params;
  await exigirAcesso("painel-administracao", `/painel/equipe/${id}`);
  const { salvo } = await searchParams;
  const s = await buscarSuporte(id);
  if (!s) notFound();

  return (
    <>
      <p>
        <Link href="/painel/equipe">← Equipe</Link>
      </p>
      <h1 className={estilos.titulo}>{s.nome} · Suporte</h1>
      {salvo && (
        <p className={proprios.aviso} role="status">
          Alterações salvas. Já valem agora, mesmo se a pessoa estiver com o painel aberto.
        </p>
      )}
      <p>
        Entra com o e-mail {s.email}.{" "}
        {s.ultimoAcessoEm ? `Último acesso em ${formatarDataHora(s.ultimoAcessoEm)}.` : "Ainda não entrou no painel."}
        {s.outrosPerfis.includes("cliente") && " Também é cliente do site."}
        {s.outrosPerfis.includes("fornecedora") && " Também é fornecedora."}
      </p>
      <LinkDeSenha id={s.id} />
      <FormularioSuporte
        acao={salvarAcessoDoSuporte}
        textoBotao="Salvar alterações"
        iniciais={{
          id: s.id,
          nome: s.nome,
          email: s.email,
          whatsapp: s.whatsapp ? formatarTelefone(s.whatsapp) : "",
          acesso: s.acesso,
        }}
      />
      <section className={proprios.zonaPerigo} aria-labelledby="tirar">
        <strong id="tirar">Tirar da equipe</strong>
        <span className={proprios.dica}>
          A pessoa perde o acesso ao painel na hora. O que ela fez continua no Histórico.
        </span>
        <TirarDaEquipe id={s.id} nome={s.nome} />
      </section>
      <HistoricoDoRegistro tabela="equipe" registroId={id} verRestritos />
    </>
  );
}
