import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, Trash2 } from "lucide-react";
import { exigirAcesso } from "@/lib/acesso";
import { descricaoDoAlerta, MAXIMO_DE_ALERTAS } from "@/lib/alertas/regras";
import { alertasDaCliente, pecasDosAlertas } from "@/lib/alertas/servidor";
import { prisma } from "@/lib/banco";
import { fichaDaCliente } from "@/lib/clientes/contas";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { promocoesDasPecas } from "@/lib/promocoes/servidor";
import { TAMANHOS } from "@/lib/tamanhos";
import { PUBLICOS } from "@/lib/vitrine";
import { CartaoPeca, SELECAO_CARTAO } from "../../cartao-peca";
import estilos from "../../loja.module.css";
import { apagarAviso, criarAviso, sairDaFilaDeEspera } from "../acoes";
import { filasDaCliente } from "@/lib/fila/servidor";
import { ordinal, posicaoNaFila, situacaoNaFila, TEXTO_DA_SITUACAO } from "@/lib/fila/regras";
import { enderecoDaPeca } from "@/lib/vitrine";

export const metadata: Metadata = { title: "Me avise quando chegar" };

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// "Me avise quando chegar": a cliente diz o que procura e a loja avisa pelo
// WhatsApp quando chega peça assim. Mostra também o que já está à venda.
export default async function Avisos({ searchParams }: PageProps<"/minha-conta/avisos">) {
  const usuario = await exigirAcesso("area-cliente", "/minha-conta/avisos");
  const ficha = await fichaDaCliente(usuario);
  await liberarReservasVencidas();
  const busca = await searchParams;
  const [alertas, categorias, marcas, combinam, filas] = await Promise.all([
    alertasDaCliente(ficha.id),
    prisma.categoria.findMany({ where: { ativa: true }, orderBy: [{ ordem: "asc" }, { nome: "asc" }], select: { id: true, nome: true } }),
    prisma.peca.findMany({
      where: { marca: { not: null } },
      distinct: ["marca"],
      orderBy: { marca: "asc" },
      take: 300,
      select: { marca: true },
    }),
    pecasDosAlertas(ficha.id),
    filasDaCliente(ficha.id),
  ]);
  const ids = combinam.map((p) => p.id);
  const cartoes = ids.length ? await prisma.peca.findMany({ where: { id: { in: ids } }, select: SELECAO_CARTAO }) : [];
  const ordenadas = ids.map((id) => cartoes.find((c) => c.id === id)!).filter(Boolean);
  const [promocoes, favoritas] = await Promise.all([
    promocoesDasPecas(ordenadas),
    prisma.favorito.findMany({ where: { clienteId: ficha.id, pecaId: { in: ids } }, select: { pecaId: true } }),
  ]);
  const favorita = new Set(favoritas.map((f) => f.pecaId));
  const nomeDa = (id: string | null) => categorias.find((c) => c.id === id)?.nome ?? null;
  const erro = primeiro(busca.erro);
  const cheio = alertas.length >= MAXIMO_DE_ALERTAS;

  return (
    <>
      <section className={estilos.explicaSacolinha} aria-label="Como funciona">
        <p>
          <BellRing className="icone" aria-hidden /> Diga o que você procura e a gente avisa pelo WhatsApp quando chegar uma peça
          assim. Cada peça é única, então vale ser rápida!
        </p>
      </section>

      {erro && (
        <p className={estilos.erro} role="alert">
          {erro}
        </p>
      )}
      {busca.criado && (
        <p className={estilos.reservaAtiva} role="status">
          Pronto! Vamos avisar você quando chegar.
        </p>
      )}

      {!cheio && (
        <form action={criarAviso} className={estilos.filtros} aria-label="Novo aviso">
          <input type="hidden" name="voltar" value="/minha-conta/avisos" />
          <label>
            Tamanho
            <select name="tamanho" defaultValue={primeiro(busca.tamanho)}>
              <option value="">Qualquer</option>
              {TAMANHOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Para
            <select name="publico" defaultValue={primeiro(busca.publico)}>
              <option value="">Menina e menino</option>
              {PUBLICOS.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoria
            <select name="categoria" defaultValue={primeiro(busca.categoria)}>
              <option value="">Qualquer</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Marca
            <input name="marca" list="marcas-avisos" maxLength={80} defaultValue={primeiro(busca.marca)} placeholder="Qualquer" />
            <datalist id="marcas-avisos">
              {marcas.map((m) => (
                <option key={m.marca} value={m.marca!} />
              ))}
            </datalist>
          </label>
          <button type="submit">
            <BellRing className="icone" aria-hidden />
            Me avise quando chegar
          </button>
        </form>
      )}

      <section className={estilos.secao} aria-labelledby="meus-avisos">
        <h2 id="meus-avisos">Meus avisos</h2>
        {alertas.length === 0 ? (
          <p>Você ainda não pediu nenhum aviso. Escolha acima o tamanho, a categoria ou a marca que procura.</p>
        ) : (
          <ul className={estilos.listaAvisos}>
            {alertas.map((a) => (
              <li key={a.id}>
                <span>{descricaoDoAlerta(a, nomeDa(a.categoriaId))}</span>
                <form action={apagarAviso}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" aria-label={`Apagar o aviso ${descricaoDoAlerta(a, nomeDa(a.categoriaId))}`}>
                    <Trash2 className="icone" aria-hidden />
                    Apagar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {cheio && <p className={estilos.contagem}>Você pode ter até {MAXIMO_DE_ALERTAS} avisos. Apague um para criar outro.</p>}
      </section>

      {filas.length > 0 && (
        <section className={estilos.secao} aria-labelledby="fila-de-espera">
          <h2 id="fila-de-espera">Fila de espera</h2>
          <p className={estilos.contagem}>Peças reservadas por outra cliente que você está esperando. Se voltarem, a gente avisa.</p>
          <ul className={estilos.listaAvisos}>
            {filas.map(({ peca }) => {
              const situacao = situacaoNaFila(peca);
              const posicao = posicaoNaFila(peca.filaEspera, ficha.id);
              return (
                <li key={peca.id}>
                  <span>
                    {situacao === "saiu" ? peca.nome : <Link href={enderecoDaPeca(peca.codigo)}>{peca.nome}</Link>}
                    {peca.tamanho && ` · tam. ${peca.tamanho}`}
                    <br />
                    <span className={estilos.filaSituacao}>
                      {TEXTO_DA_SITUACAO[situacao]}
                      {situacao === "aguardando" && posicao && ` · você é a ${ordinal(posicao)} da fila`}
                    </span>
                  </span>
                  <form action={sairDaFilaDeEspera}>
                    <input type="hidden" name="pecaId" value={peca.id} />
                    <button type="submit" aria-label={`Sair da fila de ${peca.nome}`}>
                      <Trash2 className="icone" aria-hidden />
                      {situacao === "aguardando" ? "Sair da fila" : "Tirar da lista"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {alertas.length > 0 && (
        <section className={estilos.secao} aria-labelledby="ja-a-venda">
          <h2 id="ja-a-venda">Já à venda do jeito que você pediu</h2>
          {ordenadas.length === 0 ? (
            <p>
              Nada agora. Assim que chegar, a gente avisa. Enquanto isso, veja as <Link href="/">novidades da vitrine</Link>.
            </p>
          ) : (
            <ul className={estilos.grade}>
              {ordenadas.map((p) => (
                <li key={p.id}>
                  <CartaoPeca peca={p} promocao={promocoes.get(p.id)} favorita={favorita.has(p.id)} estrela voltar="/minha-conta/avisos" />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
