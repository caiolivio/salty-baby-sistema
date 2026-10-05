import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { formatarDataHora } from "@/lib/datas";
import { buscarSuporte } from "@/lib/equipe/gravar";
import { formatarTelefone } from "@/lib/pedidos/regras";
import estilos from "../../painel.module.css";
import proprios from "../../formulario.module.css";
import { HistoricoDoRegistro } from "../../historico/do-registro";
import { salvarAcessoDoSuporte, salvarDadosDaAdministradora } from "../acoes";
import { FormularioAdministradora } from "../formulario-administradora";
import { FormularioSuporte } from "../formulario-suporte";
import { LinkDeSenha } from "../link-de-senha";
import { TirarAdministradora } from "../tirar-administradora";
import { TirarDaEquipe } from "../tirar-da-equipe";
import { TornarAdministradora } from "../tornar-administradora";
import { Voltar } from "@/componentes/voltar";

export const metadata: Metadata = { title: "Equipe" };

export default async function Suporte({ params, searchParams }: PageProps<"/painel/equipe/[id]">) {
  const { id } = await params;
  const eu = await exigirAcesso("painel-administracao", `/painel/equipe/${id}`);
  const { salvo, administradora } = await searchParams;
  const s = await buscarSuporte(id);
  if (!s) notFound();
  const whatsapp = s.whatsapp ? formatarTelefone(s.whatsapp) : "";
  const dadosDaConta = (
    <p>
      Entra com o e-mail {s.email}.{" "}
      {s.ultimoAcessoEm ? `Último acesso em ${formatarDataHora(s.ultimoAcessoEm)}.` : "Ainda não entrou no painel."}
      {s.outrosPerfis.includes("cliente") && " Também é cliente do site."}
      {s.outrosPerfis.includes("fornecedora") && " Também é fornecedora."}
    </p>
  );

  if (s.administradora) {
    const souEu = s.id === eu.id;
    return (
      <>
        <p>
          <Voltar href="/painel/equipe">Equipe</Voltar>
        </p>
        <h1 className={estilos.titulo}>{s.nome} · Administradora</h1>
        {(salvo || administradora) && (
          <p className={proprios.aviso} role="status">
            {administradora ? "Agora ela é administradora, com todos os poderes do painel." : "Alterações salvas."}
          </p>
        )}
        {dadosDaConta}
        <p>Tem todos os poderes do painel.</p>
        {!souEu && <LinkDeSenha id={s.id} />}
        <FormularioAdministradora
          acao={salvarDadosDaAdministradora}
          textoBotao="Salvar alterações"
          iniciais={{ id: s.id, nome: s.nome, email: s.email, whatsapp }}
        />
        {!souEu && (
          <section className={proprios.zonaPerigo} aria-labelledby="tirar">
            <strong id="tirar">Tirar da equipe</strong>
            <span className={proprios.dica}>
              A pessoa perde o acesso ao painel na hora. O que ela fez continua no Histórico. A loja sempre fica com pelo
              menos uma administradora.
            </span>
            <TirarAdministradora id={s.id} nome={s.nome} />
          </section>
        )}
        <HistoricoDoRegistro tabela="equipe" registroId={id} verRestritos />
      </>
    );
  }

  return (
    <>
      <p>
        <Voltar href="/painel/equipe">Equipe</Voltar>
      </p>
      <h1 className={estilos.titulo}>{s.nome} · Suporte</h1>
      {salvo && (
        <p className={proprios.aviso} role="status">
          Alterações salvas. Já valem agora, mesmo se a pessoa estiver com o painel aberto.
        </p>
      )}
      {dadosDaConta}
      <LinkDeSenha id={s.id} />
      <FormularioSuporte
        acao={salvarAcessoDoSuporte}
        textoBotao="Salvar alterações"
        iniciais={{
          id: s.id,
          nome: s.nome,
          email: s.email,
          whatsapp,
          acesso: s.acesso,
        }}
      />
      <section className={proprios.zonaPerigo} aria-labelledby="tornar">
        <strong id="tornar">Tornar administradora</strong>
        <span className={proprios.dica}>
          Ela passa a ter todos os poderes do painel, os mesmos que você, e a lista de páginas acima deixa de valer.
        </span>
        <TornarAdministradora id={s.id} nome={s.nome} />
      </section>
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
