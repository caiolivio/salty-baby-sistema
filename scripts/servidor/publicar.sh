#!/usr/bin/env bash
# Roda na VPS, como o usuário de publicação do site (sbdeployteste ou sbdeployapp).
# Recebe o pacote já montado pelo GitHub Actions em ~/saltybaby/upload/app.tgz
# e as variáveis de ambiente em ~/saltybaby/.env.
# Uso: publicar.sh <nome-do-processo> <porta> <versao>
set -euo pipefail

NOME="$1"
PORTA="$2"
VERSAO="$3"
BASE="$HOME/saltybaby"
NODE_MAIOR=22

mkdir -p "$BASE/releases" "$BASE/upload" "$HOME/.local/bin"
export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"

versao_node() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }

# 1. Node: usa o do servidor se for o 22 ou mais novo; senão instala só para este usuário.
if [ "$(versao_node)" -lt "$NODE_MAIOR" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh" && nvm use "$NODE_MAIOR" >/dev/null 2>&1 || true
fi
if [ "$(versao_node)" -lt "$NODE_MAIOR" ]; then
  echo "Instalando o Node $NODE_MAIOR em ~/.local/node"
  case "$(uname -m)" in
    x86_64) ARQ=x64 ;;
    aarch64) ARQ=arm64 ;;
    *) echo "Arquitetura não suportada: $(uname -m)" >&2; exit 1 ;;
  esac
  ORIGEM="https://nodejs.org/dist/latest-v$NODE_MAIOR.x"
  ARQUIVO="$(curl -fsSL "$ORIGEM/SHASUMS256.txt" | awk -v a="linux-$ARQ.tar.xz" '$2 ~ a"$" {print $2}')"
  rm -rf "$HOME/.local/node" && mkdir -p "$HOME/.local/node"
  curl -fsSL "$ORIGEM/$ARQUIVO" | tar -xJ -C "$HOME/.local/node" --strip-components=1
fi
echo "Node $(node -v)"

# 2. Chave que assina os logins. Criada uma vez, aqui mesmo na VPS, e nunca
#    sai daqui. O .env é regravado a cada publicação, então ela é somada a ele.
SEGREDOS="$BASE/segredos-do-servidor.env"
if [ ! -s "$SEGREDOS" ]; then
  echo "Criando a chave de login do servidor"
  (umask 077 && printf 'AUTH_SECRET=`%s`\n' "$(od -An -tx1 -N32 /dev/urandom | tr -d ' \n')" > "$SEGREDOS")
fi
cat "$SEGREDOS" >> "$BASE/.env"

# Fotos das peças: numa pasta fixa, fora das versões, para não se perderem a cada publicação.
mkdir -p "$BASE/fotos"
echo "FOTOS_DIR=$BASE/fotos" >> "$BASE/.env"

# 3. PM2 mantém o sistema rodando e o reinicia se cair.
if ! command -v pm2 >/dev/null; then
  echo "Instalando o PM2"
  npm install -g pm2 --prefix "$HOME/.local" --no-fund --no-audit >/dev/null
fi

# 4. Nova versão numa pasta própria; a pasta "atual" aponta para ela.
DESTINO="$BASE/releases/$(date +%Y%m%d%H%M%S)-${VERSAO:0:7}"
mkdir -p "$DESTINO"
tar -xzf "$BASE/upload/app.tgz" -C "$DESTINO"
ln -sfn "$DESTINO" "$BASE/atual"

if pm2 describe "$NOME" >/dev/null 2>&1; then
  pm2 restart "$NOME" --update-env >/dev/null
else
  pm2 start "$BASE/atual/server.js" --name "$NOME" --cwd "$BASE/atual" \
    --node-args="--env-file=$BASE/.env" >/dev/null
fi
pm2 save >/dev/null

# Religa o sistema sozinho se a VPS reiniciar.
if command -v crontab >/dev/null; then
  LINHA="@reboot PATH=$HOME/.local/node/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin pm2 resurrect"
  (crontab -l 2>/dev/null | grep -v 'pm2 resurrect' || true; echo "$LINHA") | crontab - \
    || echo "Aviso: não foi possível agendar o religamento automático"
fi

# 5. Confere se o sistema respondeu.
for tentativa in $(seq 1 15); do
  if RESPOSTA="$(curl -s -m 5 -w ' %{http_code}' "http://127.0.0.1:$PORTA/api/saude")"; then
    CODIGO="${RESPOSTA##* }"
    if [ "$CODIGO" = "200" ] || [ "$CODIGO" = "503" ]; then
      echo "Resposta do sistema: $RESPOSTA"
      if [ "$CODIGO" = "503" ]; then
        echo "::warning::O sistema subiu, mas não conectou no banco de dados."
        # A mensagem do MySQL diz o usuário e a origem recusados (nunca mostra a senha).
        pm2 logs "$NOME" --err --lines 20 --nostream 2>/dev/null | grep -E "sqlMessage|Access denied|ECONNREFUSED|ENOENT" | tail -5 || true
      fi
      # Guarda só as 5 versões mais recentes.
      ls -1dt "$BASE"/releases/*/ | tail -n +6 | xargs -r rm -rf
      exit 0
    fi
  fi
  sleep 2
done

echo "O sistema não respondeu na porta $PORTA. Últimas linhas do registro:" >&2
pm2 logs "$NOME" --lines 40 --nostream >&2 || true
exit 1
