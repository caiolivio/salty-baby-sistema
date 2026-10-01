import estilos from "../loja.module.css";

export type ValoresDados = Partial<Record<"nome" | "email" | "telefone" | "endereco" | "cep" | "cidade" | "estado" | "pix", string>>;

/** Campos do cadastro que a própria fornecedora completa. Obrigatórios: nome, e-mail e endereço. */
export function CamposDaFornecedora({ valores }: { valores: ValoresDados }) {
  return (
    <>
      <p className={estilos.dica}>
        Preencha tudo o que puder. Os campos com <strong>*</strong> são obrigatórios.
      </p>
      <label>
        Nome completo *
        <input name="nome" autoComplete="name" required maxLength={160} defaultValue={valores.nome} />
      </label>
      <label>
        E-mail *
        <input name="email" type="email" autoComplete="email" required maxLength={191} defaultValue={valores.email} />
        <span className={estilos.dica}>É com ele que você entra na sua área.</span>
      </label>
      <label>
        WhatsApp (com DDD)
        <input name="telefone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} defaultValue={valores.telefone} />
      </label>
      <label>
        Endereço (rua, número e bairro) *
        <input name="endereco" autoComplete="street-address" required maxLength={255} defaultValue={valores.endereco} />
      </label>
      <div className={estilos.linhaCampos}>
        <label>
          CEP
          <input name="cep" inputMode="numeric" autoComplete="postal-code" maxLength={15} defaultValue={valores.cep} />
        </label>
        <label>
          Cidade
          <input name="cidade" autoComplete="address-level2" maxLength={100} defaultValue={valores.cidade} />
        </label>
        <label>
          Estado
          <input name="estado" autoComplete="address-level1" maxLength={60} defaultValue={valores.estado} />
        </label>
      </div>
      <label>
        Chave Pix (para receber os repasses)
        <input name="pix" maxLength={191} defaultValue={valores.pix} />
      </label>
    </>
  );
}
