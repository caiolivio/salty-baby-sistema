import { describe, expect, it } from "vitest";
import { emLevas, linkDoWhatsApp } from "./compartilhar";

describe("compartilhar", () => {
  it("divide as fotos em levas de até 10", () => {
    const fotos = Array.from({ length: 23 }, (_, i) => i);
    expect(emLevas(fotos).map((l) => l.length)).toEqual([10, 10, 3]);
    expect(emLevas([])).toEqual([]);
  });

  it("link do WhatsApp com o texto", () => {
    expect(linkDoWhatsApp("Oi & tchau\nlinha")).toBe("https://wa.me/?text=Oi%20%26%20tchau%0Alinha");
  });
});
