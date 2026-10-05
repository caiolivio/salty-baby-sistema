// Páginas de texto editáveis no painel (CLAUDE.md, "Páginas"): acordo de
// consignação, termos de uso, política de troca, sobre a loja e aviso de
// privacidade. O texto usa um formato simples (títulos, negrito, listas e
// links), lido aqui sem HTML, para ninguém conseguir pôr código na página.
// Funções puras, testadas.

import { z } from "zod";
import { formatarReais } from "../dinheiro";
import { TEXTO_CONTRATO, TITULO_CONTRATO } from "./contrato";

export const PAGINAS_EDITAVEIS = [
  {
    chave: "contrato",
    nome: "Contrato de consignação",
    endereco: "/acordo-de-consignacao",
    explica: "O contrato que a fornecedora lê e aceita na área dela. Ao mudar, você escolhe se elas precisam aceitar de novo.",
  },
  { chave: "termos", nome: "Termos de uso", endereco: "/termos-de-uso", explica: "Regras de uso do site e das compras." },
  { chave: "trocas", nome: "Política de troca", endereco: "/politica-de-troca", explica: "Como funcionam trocas e devoluções das compras." },
  { chave: "sobre", nome: "Sobre a loja", endereco: "/sobre", explica: "Quem é a loja, a história e como funciona." },
  {
    chave: "privacidade",
    nome: "Aviso de privacidade",
    endereco: "/privacidade",
    explica: "Que dados a loja guarda e para quê (LGPD). Aparece no cadastro.",
  },
] as const;

export type ChavePagina = (typeof PAGINAS_EDITAVEIS)[number]["chave"];

export const ehChavePagina = (chave: string): chave is ChavePagina => PAGINAS_EDITAVEIS.some((p) => p.chave === chave);
export const paginaEditavel = (chave: ChavePagina) => PAGINAS_EDITAVEIS.find((p) => p.chave === chave)!;

/** Versão do acordo antes de ele virar página editável (guardada nos aceites antigos). */
export const VERSAO_ACORDO_FIXO = "2026-10-v2";
/** Versão gravada no aceite: "v3" = 3ª versão salva no painel. */
export const versaoDoAcordo = (versaoDaPagina: number | null) => (versaoDaPagina ? `v${versaoDaPagina}` : VERSAO_ACORDO_FIXO);

// ---------------------------------------------------------------------------
// Variáveis: trocadas pelos dados da loja na hora de mostrar.

export type DadosDaLoja = {
  nome: string;
  nomeCurto: string;
  whatsapp: string;
  repassePadrao: number;
  mesesDevolucao: number;
  mesesSacolinha: number;
};

const porcento = (pontosBase: number) => `${(pontosBase / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const telefone = (n: string) => {
  const d = n.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : n;
};

const UNIDADES = [
  "zero",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];

/** "40%" por extenso: "quarenta por cento". Só para percentuais inteiros de 0 a 100. */
export function porcentoPorExtenso(pontosBase: number): string {
  const n = pontosBase / 100;
  if (!Number.isInteger(n) || n < 0 || n > 100) return `${porcento(pontosBase)}`;
  const numero =
    n === 100 ? "cem" : n < 20 ? UNIDADES[n] : `${DEZENAS[Math.floor(n / 10)]}${n % 10 ? ` e ${UNIDADES[n % 10]}` : ""}`;
  return `${numero} por cento`;
}

/** Exemplo do contrato: peça de R$ 100,00 vendida por R$ 80,00. */
const EXEMPLO_VENDA_CENTAVOS = 8000;

export const VARIAVEIS = [
  { nome: "loja", explica: "nome da loja", valor: (l: DadosDaLoja) => l.nome },
  {
    nome: "loja_maiusculas",
    explica: "nome da loja em maiúsculas",
    valor: (l: DadosDaLoja) => l.nome.toLocaleUpperCase("pt-BR"),
  },
  { nome: "nome_curto", explica: "nome curto da loja", valor: (l: DadosDaLoja) => l.nomeCurto },
  { nome: "whatsapp", explica: "WhatsApp da loja", valor: (l: DadosDaLoja) => telefone(l.whatsapp) },
  { nome: "repasse", explica: "% de repasse padrão", valor: (l: DadosDaLoja) => porcento(l.repassePadrao) },
  {
    nome: "repasse_por_extenso",
    explica: "% de repasse por extenso",
    valor: (l: DadosDaLoja) => porcentoPorExtenso(l.repassePadrao),
  },
  { nome: "parte_loja", explica: "% que fica com a loja", valor: (l: DadosDaLoja) => porcento(10000 - l.repassePadrao) },
  {
    nome: "parte_loja_por_extenso",
    explica: "% que fica com a loja, por extenso",
    valor: (l: DadosDaLoja) => porcentoPorExtenso(10000 - l.repassePadrao),
  },
  {
    nome: "exemplo_fornecedora",
    explica: "repasse de uma venda de R$ 80,00",
    valor: (l: DadosDaLoja) => formatarReais(Math.round((EXEMPLO_VENDA_CENTAVOS * l.repassePadrao) / 10000)),
  },
  {
    nome: "exemplo_loja",
    explica: "parte da loja numa venda de R$ 80,00",
    valor: (l: DadosDaLoja) =>
      formatarReais(EXEMPLO_VENDA_CENTAVOS - Math.round((EXEMPLO_VENDA_CENTAVOS * l.repassePadrao) / 10000)),
  },
  { nome: "meses_devolucao", explica: "meses para pedir devolução", valor: (l: DadosDaLoja) => String(l.mesesDevolucao) },
  { nome: "meses_sacolinha", explica: "meses de prazo da sacolinha", valor: (l: DadosDaLoja) => String(l.mesesSacolinha) },
] as const;

/** Troca {loja}, {repasse}… pelos valores das configurações. Uma variável desconhecida fica como está. */
export function preencher(texto: string, loja: DadosDaLoja): string {
  return texto.replace(/\{([a-z_]+)\}/g, (inteiro, nome: string) => {
    const v = VARIAVEIS.find((x) => x.nome === nome);
    return v ? v.valor(loja) : inteiro;
  });
}

// ---------------------------------------------------------------------------
// Formato do texto:
//   ## Título          ### Subtítulo
//   - item de lista    (linhas seguidas viram uma lista)
//   **negrito**        [texto do link](https://endereço)
//   linha em branco separa parágrafos.

export type Trecho = { tipo: "texto"; texto: string } | { tipo: "negrito"; texto: string } | { tipo: "link"; texto: string; href: string };

export type Bloco =
  | { tipo: "titulo"; nivel: 2 | 3; trechos: Trecho[] }
  | { tipo: "paragrafo"; linhas: Trecho[][] }
  | { tipo: "lista"; itens: Trecho[][] };

/** Só links para páginas do próprio site, https, e-mail ou telefone. */
export function linkSeguro(href: string): string | null {
  const h = href.trim();
  if (/^\/(?!\/)/.test(h) || /^https?:\/\/[^\s]+$/i.test(h) || /^(mailto|tel):[^\s]+$/i.test(h)) return h;
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(h)) return `https://${h}`;
  return null;
}

/** Negrito e links de uma linha. */
export function trechosDaLinha(linha: string): Trecho[] {
  const trechos: Trecho[] = [];
  const padrao = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let desde = 0;
  for (const achado of linha.matchAll(padrao)) {
    const antes = linha.slice(desde, achado.index);
    if (antes) trechos.push({ tipo: "texto", texto: antes });
    if (achado[1] !== undefined) trechos.push({ tipo: "negrito", texto: achado[1] });
    else {
      const href = linkSeguro(achado[3]);
      trechos.push(href ? { tipo: "link", texto: achado[2], href } : { tipo: "texto", texto: achado[2] });
    }
    desde = achado.index + achado[0].length;
  }
  if (desde < linha.length) trechos.push({ tipo: "texto", texto: linha.slice(desde) });
  return trechos;
}

/** O texto da página em blocos (títulos, parágrafos e listas), prontos para mostrar. */
export function blocosDoTexto(texto: string): Bloco[] {
  const blocos: Bloco[] = [];
  let paragrafo: Trecho[][] = [];
  let lista: Trecho[][] = [];
  const fecharParagrafo = () => {
    if (paragrafo.length) blocos.push({ tipo: "paragrafo", linhas: paragrafo });
    paragrafo = [];
  };
  const fecharLista = () => {
    if (lista.length) blocos.push({ tipo: "lista", itens: lista });
    lista = [];
  };
  for (const crua of texto.replace(/\r\n?/g, "\n").split("\n")) {
    const linha = crua.trim();
    const titulo = /^(#{1,3})\s+(.+)$/.exec(linha);
    const item = /^[-*•]\s+(.+)$/.exec(linha);
    if (!linha) {
      fecharParagrafo();
      fecharLista();
    } else if (titulo) {
      fecharParagrafo();
      fecharLista();
      blocos.push({ tipo: "titulo", nivel: titulo[1].length === 3 ? 3 : 2, trechos: trechosDaLinha(titulo[2]) });
    } else if (item) {
      fecharParagrafo();
      lista.push(trechosDaLinha(item[1]));
    } else {
      fecharLista();
      paragrafo.push(trechosDaLinha(linha));
    }
  }
  fecharParagrafo();
  fecharLista();
  return blocos;
}

// ---------------------------------------------------------------------------
// Formulário do painel.

export const TAMANHO_MAXIMO = 60_000;

const formulario = z.object({
  titulo: z.string().trim().min(2, "Escreva o título da página.").max(160, "Use no máximo 160 caracteres no título."),
  conteudo: z
    .string()
    .trim()
    .min(20, "Escreva o texto da página.")
    .max(TAMANHO_MAXIMO, `O texto pode ter no máximo ${TAMANHO_MAXIMO.toLocaleString("pt-BR")} caracteres.`),
});

export type DadosDaPagina = z.output<typeof formulario> & { publicada: boolean; exigirAceite: boolean };

export function lerFormularioPagina(
  valores: Record<string, string>,
  chave: ChavePagina,
): { ok: true; dados: DadosDaPagina } | { ok: false; erro: string } {
  const lido = formulario.safeParse({ titulo: valores.titulo ?? "", conteudo: valores.conteudo ?? "" });
  if (!lido.success) return { ok: false, erro: lido.error.issues[0]?.message ?? "Confira os campos." };
  // O acordo e o aviso de privacidade ficam sempre no ar: as fornecedoras e o cadastro dependem deles.
  const sempreNoAr = chave === "contrato" || chave === "privacidade";
  return {
    ok: true,
    dados: {
      ...lido.data,
      publicada: sempreNoAr || valores.publicada === "sim",
      exigirAceite: chave === "contrato" && valores.exigirAceite === "sim",
    },
  };
}

// ---------------------------------------------------------------------------
// Textos iniciais (rascunhos para a loja revisar). Usam as variáveis acima.

export const TEXTOS_INICIAIS: Record<ChavePagina, { titulo: string; conteudo: string }> = {
  contrato: { titulo: TITULO_CONTRATO, conteudo: TEXTO_CONTRATO },
  termos: {
    titulo: "Termos de uso",
    conteudo: `Estes termos explicam como funcionam o site e as compras na {loja}. Ao usar o site ou fazer um pedido, você concorda com eles.

## Peças
- As peças são, na maioria, **usadas ou seminovas**, e cada uma é única. As fotos e a descrição mostram o estado de cada peça, incluindo marcas de uso quando houver.
- As medidas são aproximadas. Em caso de dúvida, pergunte antes de comprar pelo WhatsApp {whatsapp}.

## Pedido e reserva
- Ao fechar o pedido, as peças ficam reservadas por alguns minutos enquanto você combina o pagamento pelo WhatsApp.
- Se o pagamento não for confirmado nesse prazo, a reserva acaba e as peças voltam para a vitrine.
- O pedido só vale depois que a {nome_curto} confirma o pagamento.

## Pagamento e entrega
- O pagamento é combinado pelo WhatsApp (Pix, cartão ou dinheiro).
- O frete é por conta de quem compra, e o valor é combinado antes do envio. Também dá para retirar na loja.

## Sacolinha
- Na sacolinha, as peças já pagas ficam guardadas na loja para você juntar várias compras e pagar um frete só.
- O prazo é de {meses_sacolinha} meses a partir da primeira peça. Se o envio não for pedido até lá, **as peças são doadas**.

## Conta no site
- Você é responsável pelos dados que informa e por manter a sua senha em segredo.
- Os seus dados são tratados como explica o [Aviso de privacidade](/privacidade).

## Dúvidas
Fale com a gente pelo WhatsApp {whatsapp}.`,
  },
  trocas: {
    titulo: "Política de troca",
    conteudo: `Queremos que cada peça chegue do jeito que você esperava. Veja como funcionam trocas e devoluções na {loja}.

## Compras pelo site ou pelo WhatsApp
- Você pode desistir da compra em até **7 dias** depois de receber a peça (direito de arrependimento do Código de Defesa do Consumidor).
- A peça precisa voltar no mesmo estado em que foi enviada.
- Avise pelo WhatsApp {whatsapp} antes de mandar a peça de volta.

## Compras na loja
- Como as peças são únicas, confira tudo na hora da compra. Trocas de compras feitas na loja dependem de combinar com a gente.

## Peça com defeito não informado
- Se a peça tiver um defeito que não aparecia nas fotos nem na descrição, fale com a gente pelo WhatsApp e mande uma foto. A {nome_curto} resolve com troca, crédito na loja ou devolução do valor.

## Como recebo o valor
- A devolução é feita pela mesma forma de pagamento ou como crédito na loja, como você preferir.
- O frete da devolução por arrependimento é por conta da {nome_curto}. Nos outros casos, combinamos pelo WhatsApp.`,
  },
  sobre: {
    titulo: "Sobre a {loja}",
    conteudo: `A {loja} é um brechó infantil que dá uma nova vida para roupas, calçados, brinquedos e acessórios de criança.

## Como funciona
- Recebemos peças de mães e famílias (as nossas fornecedoras), escolhemos com cuidado e colocamos à venda.
- Cada peça é única, e a descrição mostra o estado dela.
- Você compra pelo site, pelo WhatsApp ou nos nossos grupos.

## Moda sustentável
Criança cresce rápido, e muita roupa fica quase nova no armário. Comprar e vender peças usadas economiza dinheiro e evita desperdício.

## Quer vender as peças que não servem mais?
Conheça o nosso programa de fornecedoras em [Seja uma fornecedora](/seja-fornecedora).

## Fale com a gente
WhatsApp {whatsapp}.`,
  },
  privacidade: {
    titulo: "Aviso de privacidade",
    conteudo: `A {loja} guarda os dados do seu cadastro só para atender você. Este aviso explica quais dados são esses e o que fazemos com eles.

## Quais dados guardamos
- Nome, e-mail e WhatsApp, que você informa ao criar a conta ou ao fazer um pedido.
- Suas compras, pedidos e as peças que você marca como favoritas.
- Se você quiser informar, dados das crianças (como idade e tamanho), para sugerir peças que sirvam.

## Para que usamos
- Combinar pagamento, envio ou retirada dos seus pedidos.
- Mostrar suas compras e favoritos na sua conta e sugerir peças do seu interesse.
- Avisar sobre novidades da loja pelo WhatsApp, se você quiser recebê-las.

## Com quem compartilhamos
Com ninguém de fora da loja, a não ser quando for necessário para entregar sua compra (por exemplo, os Correios ou um entregador). Não vendemos seus dados.

## Seus direitos
Você pode ver e corrigir seus dados na sua conta a qualquer momento. Para pedir uma cópia dos seus dados ou a exclusão do cadastro, fale com a loja pelo WhatsApp {whatsapp}.`,
  },
};

/** Páginas que já ficam no ar com o texto inicial, antes de a loja salvar (as outras esperam a loja revisar). */
export const NO_AR_SEM_SALVAR: readonly ChavePagina[] = ["contrato", "privacidade"];
