"use client";

import { moverNaLista } from "@/lib/pecas/dados";
import estilos from "../formulario.module.css";

export type FotoNova = { chave: string; arquivo: File; previa: string };

/**
 * Fotos escolhidas no cadastro de uma peça nova, antes de salvar: dá para
 * mudar a ordem e escolher a foto em destaque (a primeira).
 */
export function FotosNovas({ fotos, mudar }: { fotos: FotoNova[]; mudar: (fotos: FotoNova[]) => void }) {
  function acrescentar(lista: FileList | null) {
    const novas = [...(lista ?? [])].map((arquivo) => ({
      chave: `${arquivo.name}-${arquivo.size}-${Math.random()}`,
      arquivo,
      previa: URL.createObjectURL(arquivo),
    }));
    mudar([...fotos, ...novas]);
  }
  const mover = (foto: FotoNova, destino: number) => mudar(moverNaLista(fotos, foto, destino));
  function tirar(foto: FotoNova) {
    URL.revokeObjectURL(foto.previa);
    mudar(fotos.filter((f) => f !== foto));
  }

  // Os campos de arquivo não têm "name": as fotos vão na ordem desta lista.
  const campo = (rotulo: string, camera: boolean) => (
    <label className={estilos.botaoSecundario}>
      {rotulo}
      <input
        className={estilos.escondido}
        type="file"
        accept="image/*"
        capture={camera ? "environment" : undefined}
        multiple
        onChange={(e) => {
          acrescentar(e.target.files);
          e.target.value = ""; // permite escolher a mesma foto de novo
        }}
      />
    </label>
  );

  return (
    <fieldset className={estilos.grupo}>
      <legend>Fotos</legend>
      <div className={estilos.acoes}>
        {campo("Tirar foto", true)}
        {campo("Escolher da galeria", false)}
      </div>
      <span className={estilos.dica}>
        {fotos.length > 1
          ? "A primeira é a foto em destaque, que aparece na lista e no site. Use as setas para mudar a ordem."
          : "As fotos são reduzidas antes de enviar."}
      </span>
      {fotos.length > 0 && (
        <div className={estilos.fotos}>
          {fotos.map((foto, i) => (
            <div key={foto.chave} className={estilos.foto}>
              {/* eslint-disable-next-line @next/next/no-img-element -- prévia local, antes do envio */}
              <img src={foto.previa} alt={`Foto ${i + 1}`} />
              {i === 0 ? (
                <span className={estilos.principal}>★ Foto em destaque</span>
              ) : (
                <button type="button" onClick={() => mover(foto, 0)}>
                  Pôr em destaque
                </button>
              )}
              <div className={estilos.setas}>
                <button type="button" onClick={() => mover(foto, i - 1)} disabled={i === 0} aria-label="Mover para antes">
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => mover(foto, i + 1)}
                  disabled={i === fotos.length - 1}
                  aria-label="Mover para depois"
                >
                  →
                </button>
              </div>
              <button type="button" onClick={() => tirar(foto)}>
                Tirar
              </button>
            </div>
          ))}
        </div>
      )}
    </fieldset>
  );
}
