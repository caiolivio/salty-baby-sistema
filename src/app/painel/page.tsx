import type { Metadata } from "next";
import { usuarioAtual } from "@/lib/acesso";
import estilos from "./painel.module.css";

export const metadata: Metadata = { title: "Painel · Salty Baby" };

const PROXIMAS_PARTES = [
  "Importação das peças e fornecedoras do Notion",
  "Fornecedoras",
  "Estoque, cadastro rápido e etiqueta com QR",
  "Vitrine e pedido pelo WhatsApp",
  "Confirmar pagamento e vendas",
];

export default async function Painel() {
  const usuario = await usuarioAtual();
  const primeiroNome = usuario?.nome.split(" ")[0];

  return (
    <>
      <h1 className={estilos.titulo}>Olá, {primeiroNome}!</h1>
      <p>O login está funcionando. As próximas partes do painel vão aparecer aqui:</p>
      <ul className={estilos.lista}>
        {PROXIMAS_PARTES.map((parte) => (
          <li key={parte}>{parte}</li>
        ))}
      </ul>
    </>
  );
}
