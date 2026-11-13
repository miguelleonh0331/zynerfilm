#!/usr/bin/env bash
# Instalador nativo de Zynerfilmer. Idempotente: se puede repetir para actualizar.
#
#   sudo ./deploy/install.sh --origin https://host.tailnet.ts.net:8443
#
# No usa Docker. Instala un Node propio y su propio adb para no depender de las
# versiones del sistema ni pisarlas: otros proyectos del servidor siguen con las suyas.
set -euo pipefail

NODE_VERSION="24.21.0"
PLATFORM_TOOLS_URL="https://dl.google.com/android/repository/platform-tools_r37.0.1-linux.zip"
PLATFORM_TOOLS_SHA256="d230f13842f60f782a8645f9c813f8f845bf36089ea7289f28c48f17979313f1"

NAME="zynerfilm"
REPO="https://github.com/miguelleonh0331/zynerfilm.git"
REF="main"
APP_DIR="/opt/${NAME}"
RUNTIME_DIR="/opt/${NAME}-runtime"
DATA_DIR="/var/lib/${NAME}"
ENV_FILE="/etc/${NAME}.env"
HOST_ADDR="127.0.0.1"
PORT="4317"
ORIGIN=""
SERVE_PORT=""

while [ $# -gt 0 ]; do
  case "$1" in
    --origin) ORIGIN="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    --ref) REF="$2"; shift 2 ;;
    --dir) APP_DIR="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --serve-port) SERVE_PORT="$2"; shift 2 ;;
    *) echo "Opcion desconocida: $1" >&2; exit 2 ;;
  esac
done

[ "$(id -u)" -eq 0 ] || { echo "Ejecutar como root (sudo)." >&2; exit 1; }
case "$(uname -m)" in x86_64) ;; *) echo "Solo x86_64 por ahora." >&2; exit 1 ;; esac

say() { printf '\n== %s\n' "$1"; }
# -4 a proposito: el endpoint IPv6 de dl.google.com devuelve 404 para platform-tools
# desde algunos proveedores, y la descarga falla aunque la URL y la red sean correctas.
fetch() { curl -4 -fsSL "$1" -o "$2"; }

say "Dependencias del sistema"
if command -v dnf >/dev/null; then dnf -y install git curl tar unzip >/dev/null
elif command -v zypper >/dev/null; then zypper -n install git curl tar unzip >/dev/null
elif command -v apt-get >/dev/null; then apt-get update -qq && apt-get install -y -qq git curl tar unzip
else echo "Gestor de paquetes no reconocido." >&2; exit 1
fi

say "Node ${NODE_VERSION} propio en ${RUNTIME_DIR}"
NODE_BIN="${RUNTIME_DIR}/node/bin/node"
if [ "$("$NODE_BIN" --version 2>/dev/null || true)" != "v${NODE_VERSION}" ]; then
  tarball="node-v${NODE_VERSION}-linux-x64.tar.xz"
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  fetch "https://nodejs.org/dist/v${NODE_VERSION}/${tarball}" "${tmp}/${tarball}"
  fetch "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" "${tmp}/SHASUMS256.txt"
  ( cd "$tmp" && grep " ${tarball}\$" SHASUMS256.txt | sha256sum -c - >/dev/null )
  rm -rf "${RUNTIME_DIR}/node"; mkdir -p "${RUNTIME_DIR}/node"
  tar -xJf "${tmp}/${tarball}" -C "${RUNTIME_DIR}/node" --strip-components=1
  rm -rf "$tmp"; trap - EXIT
fi
"$NODE_BIN" --version

say "Android Platform Tools (adb) en ${RUNTIME_DIR}"
ADB_BIN="${RUNTIME_DIR}/platform-tools/adb"
if ! "$ADB_BIN" version >/dev/null 2>&1; then
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  fetch "$PLATFORM_TOOLS_URL" "${tmp}/pt.zip"
  echo "${PLATFORM_TOOLS_SHA256}  ${tmp}/pt.zip" | sha256sum -c - >/dev/null
  rm -rf "${RUNTIME_DIR}/platform-tools"; mkdir -p "$RUNTIME_DIR"
  unzip -q "${tmp}/pt.zip" -d "$RUNTIME_DIR"
  rm -rf "$tmp"; trap - EXIT
fi
"$ADB_BIN" version | head -1

say "Usuario de servicio y directorio de datos"
id -u "$NAME" >/dev/null 2>&1 || useradd --system --home-dir "$DATA_DIR" --shell /sbin/nologin "$NAME"
mkdir -p "$DATA_DIR"; chown "$NAME:$NAME" "$DATA_DIR"; chmod 700 "$DATA_DIR"

say "Codigo fuente en ${APP_DIR}"
if [ -d "${APP_DIR}/.git" ]; then
  git -C "$APP_DIR" remote set-url origin "$REPO"
  git -C "$APP_DIR" fetch --depth 1 origin "$REF"
  git -C "$APP_DIR" checkout -q FETCH_HEAD
else
  rm -rf "$APP_DIR"; git clone --depth 1 --branch "$REF" "$REPO" "$APP_DIR"
fi
git -C "$APP_DIR" --no-pager log --oneline -1

say "Dependencias de produccion"
( cd "$APP_DIR" && PATH="${RUNTIME_DIR}/node/bin:$PATH" npm ci --omit=dev --ignore-scripts --no-audit --no-fund >/dev/null )
chown -R root:"$NAME" "$APP_DIR"; chmod -R go-w "$APP_DIR"

say "Configuracion ${ENV_FILE}"
if [ -f "$ENV_FILE" ]; then
  echo "Ya existe; se conserva (la clave no se regenera)."
else
  [ -n "$ORIGIN" ] || { echo "Primera instalacion: falta --origin https://..." >&2; exit 2; }
  umask 077
  {
    echo "HOST=${HOST_ADDR}"
    echo "PORT=${PORT}"
    echo "PUBLIC_ORIGIN=${ORIGIN}"
    echo "ZYNER_DATA_DIR=${DATA_DIR}"
    echo "ADB_PATH=${ADB_BIN}"
    echo "SCRCPY_SERVER_PATH=${APP_DIR}/motor/scrcpy-server"
    echo "ZYNER_TOKEN=$(openssl rand -hex 32)"
  } > "$ENV_FILE"
  chown root:"$NAME" "$ENV_FILE"; chmod 640 "$ENV_FILE"
  echo "Creado. La clave no se imprime; leerla con: sudo grep ZYNER_TOKEN ${ENV_FILE}"
fi

say "Servicio systemd"
cat > "/etc/systemd/system/${NAME}.service" <<UNIT
[Unit]
Description=Zynerfilmer web backend
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${NAME}
Group=${NAME}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
Environment=HOME=${DATA_DIR}
ExecStart=${NODE_BIN} ${APP_DIR}/server.mjs
Restart=on-failure
TimeoutStopSec=45
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=${DATA_DIR}

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now "${NAME}.service" >/dev/null
systemctl restart "${NAME}.service"

say "Verificacion"
for i in $(seq 1 30); do
  if curl -fsS "http://${HOST_ADDR}:${PORT}/api/health" >/dev/null 2>&1; then break; fi
  [ "$i" -eq 30 ] && { echo "El backend no respondio."; journalctl -u "${NAME}.service" -n 30 --no-pager; exit 1; }
  sleep 1
done
echo "health: $(curl -fsS "http://${HOST_ADDR}:${PORT}/api/health")"
systemctl is-active "${NAME}.service"

if [ -n "$SERVE_PORT" ] && command -v tailscale >/dev/null; then
  say "Publicando en el tailnet por HTTPS"
  tailscale serve --bg --https="$SERVE_PORT" "http://${HOST_ADDR}:${PORT}" >/dev/null
  tailscale serve status | head -3
fi

say "Listo"
echo "Origen configurado: $(grep '^PUBLIC_ORIGIN=' "$ENV_FILE" | cut -d= -f2-)"
echo "Clave de acceso:    sudo grep ZYNER_TOKEN ${ENV_FILE}"
