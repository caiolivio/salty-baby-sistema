import type { Metadata } from "next";
import { exigirFornecedoraLiberada } from "../liberada";
import { EnviarPecas } from "../propostas";

export const metadata: Metadata = { title: "Enviar peças", robots: { index: false } };

export default async function Enviar() {
  const { fornecedora } = await exigirFornecedoraLiberada("/fornecedora/enviar");
  return <EnviarPecas dono={{ fornecedoraId: fornecedora.id }} titulo="Enviar novas peças" />;
}
