import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { podeAcessar } from "@/lib/permissoes";
import { formatarData } from "@/lib/datas";
import { mostrarPercentual } from "@/lib/fornecedoras/dados";
import { formatarReais } from "@/lib/dinheiro";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { enderecoDaFoto } from "@/lib/fotos";
import { listarGruposEmUso } from "@/lib/grupos/opcoes";
import { gruposSugeridos, linkDoPost, textoDoPost } from "@/lib/grupos/regras";
import { CONSERVACOES, reaisNoCampo, situacaoEditavel } from "@/lib/pecas/dados";
import { TAMANHOS } from "@/lib/tamanhos";
import { NOMES_SITUACAO } from "@/lib/situacoes";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import { apagarFotoDaPeca, duplicar, ordenarFoto, salvarPeca } from "../acoes";
import { opcoesDeCategoria } from "../categorias";
import { venderPeca } from "../../vendas/nova/acoes";
import { DivulgarNoGrupo } from "../divulgar-no-grupo";
import { AdicionarFotos } from "../fotos-peca";
import { FormularioPeca } from "../formulario-peca";

export const metadata: Metadata = { title: "Peça · Salty Baby" };

export default async function Peca({ params, searchParams }: PageProps<"/painel/pecas/[id]">) {
  const { id } = await params;
  const usuario = await exigirAcesso("painel", `/painel/pecas/${id}`);
  const aviso = await searchParams;

  const peca = await prisma.peca.findUnique({
    where: { id },
    include: {
      fornecedora: { select: { codigo: true, nome: true } },
      fotos: { orderBy: { ordem: "asc" } },
      categorias: { select: { categoriaId: true, categoria: { select: { nome: true } } } },
    },
  });
  if (!peca) notFound();
  const marcadas = peca.categorias.map((c) => c.categoriaId);
  const categorias = await opcoesDeCategoria(marcadas);
  const p = peca;
  const situacao = NOMES_SITUACAO[p.status] ?? p.status;

  // Post pronto para os grupos de WhatsApp, com o grupo sugerido marcado.
  const divulgavel = p.status === "publicada" && p.quantidade > 0;
  const grupos = divulgavel ? await listarGruposEmUso() : [];
  const sugeridos = gruposSugeridos({ genero: p.genero, categorias: p.categorias.map((c) => c.categoria.nome) }, grupos);
  const origem = origemDaRequisicao(await headers());
  const dadosDoPost = {
    codigo: p.codigo,
    nome: p.nome,
    tamanho: TAMANHOS.find((t) => t.valor === p.tamanho)?.nome ?? p.tamanho,
    marca: p.marca,
    conservacao: CONSERVACOES.find((c) => c.valor === p.conservacao)?.nome ?? null,
    medidas: p.medidas,
    preco: formatarReais(p.precoCentavos),
  };
  const posts = grupos.map((g) => ({
    id: g.id,
    nome: g.nome,
    sugerido: sugeridos.includes(g),
    texto: textoDoPost(dadosDoPost, linkDoPost(origem, p.codigo, g.codigo)),
  }));
  const fotoDoPost = p.fotos[0]
    ? { url: enderecoDaFoto(p.fotos[0].arquivo), nome: `${p.codigo}.jpg` }
    : null;

  return (
    <>
      <p>
        <Link href="/painel/pecas">← Peças</Link>
      </p>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>
          {p.codigo} · {p.nome}
        </h1>
        <div className={proprios.acoes}>
          {podeAcessar(usuario.perfis, "painel-administracao") && p.status === "publicada" && p.quantidade > 0 && (
            <form action={venderPeca}>
              <input type="hidden" name="id" value={p.id} />
              <button type="submit" className={proprios.botao}>
                Vender esta peça
              </button>
            </form>
          )}
          <Link href={`/etiquetas?ids=${p.id}&voltar=/painel/pecas/${p.id}`} className={proprios.botaoSecundario}>
            Imprimir etiqueta
          </Link>
          <form action={duplicar}>
            <input type="hidden" name="id" value={p.id} />
            <button type="submit" className={proprios.botaoSecundario}>
              Duplicar peça
            </button>
          </form>
        </div>
      </div>
      {aviso.criada && (
        <p className={proprios.aviso} role="status">
          Peça cadastrada com o código {p.codigo}.
        </p>
      )}
      {aviso.duplicada && (
        <p className={proprios.aviso} role="status">
          Cópia criada com o código {p.codigo}, como rascunho e sem fotos. Ajuste o que mudar e salve.
        </p>
      )}
      {aviso.salva && (
        <p className={proprios.aviso} role="status">
          Alterações salvas.
        </p>
      )}
      {aviso.fotosRecusadas && (
        <p className={proprios.erro} role="alert">
          {String(aviso.fotosRecusadas)} foto(s) não entrou(aram): limite de fotos ou imagem que não abriu.
        </p>
      )}
      <p>
        {situacao} · entrada em {formatarData(p.dataEntrada)}
        {p.codigoAntigo && ` · código antigo ${p.codigoAntigo}`}
      </p>

      <section aria-labelledby="divulgar">
        <h2 id="divulgar">Divulgar no grupo</h2>
        {divulgavel ? (
          <DivulgarNoGrupo posts={posts} foto={fotoDoPost} />
        ) : (
          <p>Para divulgar nos grupos, a peça precisa estar publicada e com estoque.</p>
        )}
      </section>

      <section className={proprios.formulario} aria-label="Fotos">
        <strong>Fotos</strong>
        {p.fotos.length > 1 && (
          <span className={proprios.dica}>A primeira é a foto em destaque, que aparece na lista e no site. Use as setas para mudar a ordem.</span>
        )}
        {p.fotos.length === 0 ? (
          <p>Esta peça ainda não tem foto.</p>
        ) : (
          <div className={proprios.fotos}>
            {p.fotos.map((foto, i) => (
              <div key={foto.id} className={proprios.foto}>
                <a href={enderecoDaFoto(foto.arquivo)} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniatura já reduzida no envio */}
                  <img src={enderecoDaFoto(foto.arquivo, true)} alt={`Foto ${i + 1}`} />
                </a>
                {i === 0 ? (
                  <span className={proprios.principal}>★ Foto em destaque</span>
                ) : (
                  <form action={ordenarFoto}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="fotoId" value={foto.id} />
                    <button type="submit" name="destino" value="0">
                      Pôr em destaque
                    </button>
                  </form>
                )}
                <form action={ordenarFoto} className={proprios.setas}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="fotoId" value={foto.id} />
                  <button type="submit" name="destino" value={i - 1} disabled={i === 0} aria-label="Mover para antes">
                    ←
                  </button>
                  <button
                    type="submit"
                    name="destino"
                    value={i + 1}
                    disabled={i === p.fotos.length - 1}
                    aria-label="Mover para depois"
                  >
                    →
                  </button>
                </form>
                <form action={apagarFotoDaPeca}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="fotoId" value={foto.id} />
                  <button type="submit">Apagar</button>
                </form>
              </div>
            ))}
          </div>
        )}
        <AdicionarFotos pecaId={p.id} />
      </section>

      <FormularioPeca
        acao={salvarPeca}
        textoBotao="Salvar alterações"
        voltar="/painel/pecas"
        categorias={categorias}
        podeIncluirCategoria={podeAcessar(usuario.perfis, "painel-administracao")}
        categoriasMarcadas={marcadas}
        fornecedoraFixa={{
          texto: p.fornecedora ? `${p.fornecedora.codigo} · ${p.fornecedora.nome}` : "Salty (peça da loja)",
          consignada: p.tipo === "consignada",
        }}
        situacaoFixa={situacaoEditavel(p.status) ? undefined : situacao}
        iniciais={{
          id: p.id,
          nome: p.nome,
          tamanho: p.tamanho ?? "",
          genero: p.genero ?? "",
          conservacao: p.conservacao ?? "",
          variacao: p.variacao ?? "",
          marca: p.marca ?? "",
          cor: p.cor ?? "",
          medidas: p.medidas ?? "",
          descricao: p.descricao ?? "",
          precoCentavos: p.precoCentavos ? reaisNoCampo(p.precoCentavos) : "",
          custoCentavos: reaisNoCampo(p.custoCentavos),
          percentualRepasse: p.percentualRepasse === null ? "" : mostrarPercentual(p.percentualRepasse),
          quantidade: String(p.quantidade),
          status: p.status,
          dataEntrada: p.dataEntrada.toISOString().slice(0, 10),
        }}
      />
    </>
  );
}
