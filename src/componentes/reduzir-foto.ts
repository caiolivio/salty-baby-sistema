// Reduz a foto no próprio celular antes do envio: a foto da câmera tem vários
// MB e demoraria para subir. O servidor reduz de novo e guarda em webp.
const LADO_MAXIMO = 2000;

export async function reduzirFoto(arquivo: File): Promise<Blob> {
  try {
    const imagem = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height));
    const tela = document.createElement("canvas");
    tela.width = Math.round(imagem.width * escala);
    tela.height = Math.round(imagem.height * escala);
    tela.getContext("2d")?.drawImage(imagem, 0, 0, tela.width, tela.height);
    imagem.close();
    const reduzida = await new Promise<Blob | null>((ok) => tela.toBlob(ok, "image/jpeg", 0.85));
    return reduzida && reduzida.size < arquivo.size ? reduzida : arquivo;
  } catch {
    // Formato que o navegador não abre (ex.: HEIC no computador): o servidor tenta.
    return arquivo;
  }
}

/** Troca as fotos do formulário pelas versões reduzidas. */
export async function reduzirFotosDoFormulario(dados: FormData, campo = "fotos"): Promise<FormData> {
  const arquivos = dados.getAll(campo).filter((f): f is File => f instanceof File && f.size > 0);
  dados.delete(campo);
  for (const [i, arquivo] of arquivos.entries()) {
    dados.append(campo, await reduzirFoto(arquivo), `foto-${i + 1}.jpg`);
  }
  return dados;
}
