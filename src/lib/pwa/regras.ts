// App instalável (PWA, CLAUDE.md "Stack"): o manifesto vem das configurações
// da loja (nome, cores e ícone), para servir também a outra loja. Funções puras, testadas.

/** Ícones do app, servidos por /loja/app-<nome>.png e gerados a partir do ícone da loja. */
export const ICONES_DO_APP = [
  { arquivo: "app-192.png", lado: 192, recortavel: false },
  { arquivo: "app-512.png", lado: 512, recortavel: false },
  // "maskable": o celular pode recortar em círculo; o desenho fica numa área segura no meio.
  { arquivo: "app-recortavel.png", lado: 512, recortavel: true },
] as const;

export const iconeDoApp = (arquivo: string) => ICONES_DO_APP.find((i) => i.arquivo === arquivo);

/** Quanto do lado o desenho ocupa: 80% no ícone recortável (área segura), 100% no comum. */
export const ocupacaoDoIcone = (recortavel: boolean) => (recortavel ? 0.8 : 1);

type LojaDoApp = { nome: string; nomeCurto: string; descricao: string | null; corPrincipal: string; versao: number };

export function manifestoDaLoja(loja: LojaDoApp) {
  return {
    name: loja.nome,
    short_name: loja.nomeCurto.slice(0, 12),
    description: loja.descricao ?? loja.nome,
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone" as const,
    orientation: "portrait" as const,
    background_color: "#ffffff",
    theme_color: loja.corPrincipal,
    icons: ICONES_DO_APP.map((i) => ({
      src: `/loja/${i.arquivo}?v=${loja.versao}`,
      sizes: `${i.lado}x${i.lado}`,
      type: "image/png",
      purpose: i.recortavel ? ("maskable" as const) : ("any" as const),
    })),
    shortcuts: [
      { name: "Minha conta", url: "/minha-conta" },
      { name: "Carrinho", url: "/carrinho" },
      { name: "Painel da loja", url: "/painel" },
    ],
  };
}

export type Aparelho = "android" | "iphone" | "outro";

/** Que aparelho é, para explicar como instalar (no iPhone não há botão: é pelo Compartilhar). */
export function aparelhoPeloNavegador(userAgent: string): Aparelho {
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iphone";
  if (/android/i.test(userAgent)) return "android";
  return "outro";
}
