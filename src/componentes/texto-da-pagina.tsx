import Link from "next/link";
import type { Bloco, Trecho } from "@/lib/paginas/regras";

// Mostra o texto de uma página editável (títulos, parágrafos, listas, negrito e
// links), sem HTML vindo do banco. Serve no site e na prévia do painel.

function Trechos({ trechos }: { trechos: Trecho[] }) {
  return trechos.map((t, i) =>
    t.tipo === "negrito" ? (
      <strong key={i}>{t.texto}</strong>
    ) : t.tipo === "link" ? (
      t.href.startsWith("/") ? (
        <Link key={i} href={t.href}>
          {t.texto}
        </Link>
      ) : (
        <a key={i} href={t.href} target="_blank" rel="noopener noreferrer">
          {t.texto}
        </a>
      )
    ) : (
      t.texto
    ),
  );
}

export function TextoDaPagina({ blocos, nivel = 2 }: { blocos: Bloco[]; /** Nível do "##" (3 quando a página já está dentro de uma seção). */ nivel?: 2 | 3 }) {
  return blocos.map((b, i) => {
    if (b.tipo === "titulo") {
      const n = b.nivel + nivel - 2;
      const Titulo = n === 2 ? "h2" : n === 3 ? "h3" : "h4";
      return (
        <Titulo key={i}>
          <Trechos trechos={b.trechos} />
        </Titulo>
      );
    }
    if (b.tipo === "lista") {
      return (
        <ul key={i}>
          {b.itens.map((item, j) => (
            <li key={j}>
              <Trechos trechos={item} />
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i}>
        {b.linhas.map((linha, j) => (
          <span key={j}>
            {j > 0 && <br />}
            <Trechos trechos={linha} />
          </span>
        ))}
      </p>
    );
  });
}
