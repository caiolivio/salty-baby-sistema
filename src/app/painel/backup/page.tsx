import type { Metadata } from "next";
import { exigirExtra } from "@/lib/acesso";
import { copiasNoServidor, situacaoDoDrive, ultimosBackups } from "@/lib/backup/executar";
import { tamanhoLegivel } from "@/lib/backup/regras";
import { formatarDataHora } from "@/lib/datas";
import { TABELAS } from "@/lib/exportacao/tabelas";
import { podeVer } from "@/lib/permissoes";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";
import { BotoesExportar } from "../exportar/botoes";
import { desconectarDrive, fazerCopiaAgora } from "./acoes";
import { AtualizarSozinho } from "./atualizar-sozinho";

export const metadata: Metadata = { title: "Backup" };

const ERROS: Record<string, string> = {
  "sem-chave": "Falta configurar a chave de acesso do Google no sistema (passo do Caio no Google Cloud).",
  recusado: "A conexão com o Google Drive foi cancelada na tela do Google.",
  expirou: "A conexão demorou demais ou veio de outra aba. Tente de novo.",
  "sem-permissao": "A permissão para guardar arquivos no Drive não foi marcada. Conecte de novo e marque essa opção.",
  "sem-autorizacao": "O Google não liberou o acesso permanente. Tente conectar de novo.",
  falhou: "Não foi possível conectar ao Google Drive. Tente de novo em alguns minutos.",
  "em-andamento": "Já tem uma cópia em andamento. Espere ela terminar.",
};

const SITUACOES = { rodando: "Em andamento…", ok: "Feita", erro: "Com erro" } as const;

export default async function Backup({ searchParams }: PageProps<"/painel/backup">) {
  const { acesso } = await exigirExtra("backup", "/painel/backup");
  const { erro, drive: avisoDrive } = await searchParams;
  const [drive, backups, locais] = await Promise.all([situacaoDoDrive(), ultimosBackups(), copiasNoServidor()]);
  const rodando = backups.some((b) => b.situacao === "rodando");
  const ultimaBoa = backups.find((b) => b.situacao === "ok");

  return (
    <>
      {rodando && <AtualizarSozinho />}
      <h1 className={estilos.titulo}>Backup e exportação</h1>
      {typeof erro === "string" && ERROS[erro] && (
        <p className={proprios.erro} role="alert">
          {ERROS[erro]}
        </p>
      )}
      {avisoDrive === "ligado" && <p className={proprios.aviso}>Google Drive conectado. As cópias vão para lá todo dia.</p>}
      {avisoDrive === "desligado" && <p className={proprios.aviso}>Google Drive desconectado.</p>}

      <section aria-labelledby="titulo-copias">
        <h2 id="titulo-copias">Cópia de segurança</h2>
        <p>
          Todo dia de madrugada o sistema copia o banco de dados inteiro (peças, vendas, clientes, fornecedoras) e guarda
          no servidor. Com o Google Drive conectado, a cópia vai também para lá, junto com as fotos novas. No Drive ficam a
          cópia de cada um dos últimos 7 dias e uma por semana do último mês; as mais antigas são apagadas sozinhas.
        </p>
        <p>
          {ultimaBoa?.terminadoEm
            ? `Última cópia feita em ${formatarDataHora(ultimaBoa.terminadoEm)}${ultimaBoa.noDrive ? ", enviada ao Google Drive" : ", só no servidor"}.`
            : "Nenhuma cópia feita ainda."}
        </p>
        <form action={fazerCopiaAgora}>
          <button type="submit" className={proprios.botao} disabled={rodando}>
            {rodando ? "Fazendo a cópia…" : "Fazer uma cópia agora"}
          </button>
        </form>
      </section>

      <section aria-labelledby="titulo-drive">
        <h2 id="titulo-drive">Google Drive</h2>
        {!drive.configurado ? (
          <p>
            Ainda falta a chave de acesso do Google. Depois que ela for cadastrada, aparece aqui o botão para conectar.
          </p>
        ) : drive.conectado ? (
          <>
            <p>
              Conectado {drive.email ? <strong>à conta {drive.email}</strong> : "a uma conta Google"}
              {drive.conectadoEm ? ` desde ${formatarDataHora(drive.conectadoEm)}` : ""}. O sistema só enxerga a pasta de
              cópias que ele mesmo criou, nunca o resto do seu Drive.
            </p>
            <div className={proprios.acoes}>
              {drive.linkDaPasta && (
                <a href={drive.linkDaPasta} target="_blank" rel="noopener noreferrer" className={proprios.botaoSecundario}>
                  Abrir a pasta no Google Drive
                </a>
              )}
              <form action={desconectarDrive}>
                <button type="submit" className={proprios.botaoSecundario}>
                  Desconectar
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <p>Conecte a conta Google da loja para guardar uma cópia fora do servidor.</p>
            <a href="/api/google/conectar" className={proprios.botao}>
              Conectar Google Drive
            </a>
          </>
        )}
      </section>

      <section aria-labelledby="titulo-historico">
        <h2 id="titulo-historico">Últimas cópias</h2>
        {backups.length === 0 ? (
          <p>Nenhuma cópia ainda.</p>
        ) : (
          <div className={estilos.tabelaCaixa}>
            <table className={estilos.tabela}>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Como</th>
                  <th>Situação</th>
                  <th className={estilos.numero}>Tamanho</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id}>
                    <td>{formatarDataHora(b.iniciadoEm)}</td>
                    <td>{b.origem === "painel" ? "Pelo botão" : "Automática"}</td>
                    <td>{SITUACOES[b.situacao]}</td>
                    <td className={estilos.numero}>{b.tamanho ? tamanhoLegivel(b.tamanho) : "–"}</td>
                    <td>{b.mensagem ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p>
          {locais.length
            ? `No servidor: ${locais.length} cópia(s) guardada(s), a mais recente com ${tamanhoLegivel(locais[0].tamanho)}.`
            : "Nenhuma cópia guardada no servidor ainda."}
        </p>
      </section>

      <section aria-labelledby="titulo-exportar">
        <h2 id="titulo-exportar">Exportar para Excel</h2>
        <p>Baixe qualquer tabela do sistema em Excel ou CSV. Os mesmos botões ficam no alto de cada lista do painel.</p>
        <div className={estilos.tabelaCaixa}>
          <table className={estilos.tabela}>
            <tbody>
              {Object.entries(TABELAS)
                .filter(([, tabela]) => podeVer(acesso, tabela.pagina) && (!tabela.soAdministradora || acesso.administradora))
                .map(([chave, tabela]) => (
                <tr key={chave}>
                  <td>{tabela.titulo}</td>
                  <td>
                    <BotoesExportar tabela={chave} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
