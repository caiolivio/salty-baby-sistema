// Bloqueia tentativas de senha repetidas para o mesmo e-mail, para impedir que
// alguém fique testando senhas. Fica na memória do servidor (há um só processo).

export const MAXIMO_TENTATIVAS = 5;
export const BLOQUEIO_MS = 15 * 60 * 1000;

type Registro = { falhas: number; bloqueadoAte?: number };

export function criarLimitador(agora: () => number = Date.now) {
  const registros = new Map<string, Registro>();

  return {
    /** Milissegundos que ainda faltam de bloqueio (0 se pode tentar). */
    esperaRestante(chave: string): number {
      const r = registros.get(chave);
      if (!r?.bloqueadoAte) return 0;
      const falta = r.bloqueadoAte - agora();
      if (falta <= 0) {
        registros.delete(chave);
        return 0;
      }
      return falta;
    },
    registrarFalha(chave: string): void {
      const r = registros.get(chave) ?? { falhas: 0 };
      r.falhas += 1;
      if (r.falhas >= MAXIMO_TENTATIVAS) r.bloqueadoAte = agora() + BLOQUEIO_MS;
      registros.set(chave, r);
    },
    registrarSucesso(chave: string): void {
      registros.delete(chave);
    },
  };
}
