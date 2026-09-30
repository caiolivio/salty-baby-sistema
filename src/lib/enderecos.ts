// Endereços digitados no celular costumam chegar com letra maiúscula no começo
// ("/Painel") ou com acento do corretor ("/painel/peças"). Os endereços do
// sistema são sempre minúsculos e sem acento, então esses viram o certo.

/** Devolve o endereço corrigido, ou null se já está certo. */
export function enderecoNormalizado(caminho: string): string | null {
  let legivel: string;
  try {
    legivel = decodeURIComponent(caminho);
  } catch {
    return null;
  }
  const certo = legivel
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  return certo === caminho ? null : certo;
}
