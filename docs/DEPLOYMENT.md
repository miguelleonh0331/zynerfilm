# Ejecutar y desplegar Zynerfilmer
## Windows
Abrir-Zynerfilmer.cmd abre el portable Electron. Iniciar-Panel-Web.cmd arranca backend en http://127.0.0.1:4317 para navegador.
Clave del panel web: archivo %LOCALAPPDATA%/Zynerfilmer/access-token. Electron local inicia sesion automaticamente.
Conservar toda dist/electron/Zynerfilmer-win32-x64; no distribuir equipos.json, claves ADB ni access-token.
El catalogo existente de C# se conserva. Usar un unico backend propietario del catalogo: modo Electron local o servidor web.
Para usar Electron con servidor central: definir ZYNER_SERVER_URL=https://dominio-panel antes de abrir. Pedira clave del servidor y no ejecutara ADB local.
La alternativa C# se abre con Abrir-Zynerfilmer-Clasico.cmd.
## Compilar
Instalar Node >=22.12 y ejecutar Construir-Electron.ps1. Si el Node global es antiguo, el script aprovecha el runtime existente D:/rea/.local/node-v24.21.0-win-x64.
Manual: npm ci; node node_modules/electron/install.js; npm test; npm run package:win.
## Servidor CentOS: despliegue pendiente
No se ha accedido ni instalado nada en un servidor. Confirmar version de CentOS y compatibilidad con el runtime antes de instalar.
Opcion nativa: Node >=22.12 y Android Platform Tools para Linux (adb). Copiar package.json, package-lock.json, server.mjs, src/ y motor/scrcpy-server a /opt/zynerfilmer. Ejecutar npm ci --omit=dev --ignore-scripts.
Crear usuario de servicio zynerfilmer y /var/lib/zynerfilmer de su propiedad. Preparar /etc/zynerfilmer.env desde deploy/zynerfilmer.env.example y ajustar PUBLIC_ORIGIN al origen HTTPS exacto, sin barra final. Ajustar la ruta real de node en la unidad systemd.
Usar deploy/zynerfilmer.service como plantilla tras revisar rutas. No se instala automaticamente.
Opcion contenedor: Dockerfile usa Node 24 y ADB Linux; puede ejecutarse sobre el host CentOS con motor de contenedores compatible. Preparar .env con PUBLIC_ORIGIN=https://dominio y ZYNER_TOKEN aleatorio de al menos 24 caracteres. docker compose up -d --build. El contenedor conserva catalogo en /data y claves ADB en /home/node/.android; compose incluye ambos volumenes persistentes.
## VPN, TLS y ADB
El proceso/contendor debe alcanzar IP:puerto del telefono por VPN. Comprobar desde ese mismo entorno, no solo desde el host.
La VPN no sustituye autorizacion ADB: el servidor Linux tiene otra identidad. Vincular su adb una vez con adb pair IP:PUERTO_DE_VINCULACION y codigo, despues conectar al puerto de conexion. No copiar claves privadas por automatismo.
Mantener backend ligado a loopback y publicarlo por proxy HTTPS sobre la VPN. El fragmento deploy/nginx-location.conf habilita WebSocket; certificados, dominio, firewall y SELinux se configuran en el servidor real segun su entorno.
WebCodecs necesita contexto seguro: localhost o HTTPS. HTTP sobre una IP remota no basta, aunque circule por VPN.
No abrir el puerto ADB al Internet publico ni publicar el backend sin clave/TLS.
## Limites
Audio apagado. H264 solicita maximo 1280px/30 FPS/8 Mbit; rendimiento depende de dispositivo y red. No se prometen FPS ni latencia.
Texto depende de caracteres soportados por la inyeccion scrcpy. No hay multiusuario con roles ni auto-descubrimiento sobre VPN.
Los archivos de despliegue estan preparados; no se ha verificado un despliegue CentOS/contenedor real.

El Dockerfile fija Android Platform Tools Linux x64 37.0.1, verifica SHA256 y conserva su NOTICE. Se contrasto la descarga con el SHA1 publicado en https://dl.google.com/android/repository/repository2-1.xml (canal estable). No usa el adb 29 del repositorio Debian porque no cubre la vinculacion inalambrica moderna. Docker no esta instalado en este PC: el contenedor queda sin prueba de ejecucion.

El servidor Android motor/scrcpy-server esta versionado. Los binarios ADB Windows permanecen en el motor local y en el portable; si se clona el repositorio para recompilar en Windows, proveer adb.exe, AdbWinApi.dll y AdbWinUsbApi.dll desde Platform Tools oficiales en motor/.

## Version 0.4 - prevalece sobre instrucciones anteriores
Node minimo 24.0.0. Catalogo activo SQLite, no JSON: ZYNER_DATA_DIR/zynerfilmer.sqlite.
equipos.json se importa una sola vez si existe y se conserva; no es el respaldo de cambios futuros.
Usar scripts/database-backup.mjs para backup consistente y docs/GITHUB_MIRMIDON.md para instalacion/restore/actualizacion.
scripts/configure.py genera .env con clave aleatoria sin imprimirla ni sobrescribir un archivo existente.
GitHub se prepara mediante snapshot limpio con historial independiente; no se publica el historial local por automatismo.

## Instalacion nativa con deploy/install.sh (verificada en Rocky Linux 10.2)
Alternativa a Docker, util cuando el runtime de contenedores del host no es fiable.
  sudo ./deploy/install.sh --origin https://HOST.TAILNET.ts.net:8443 --serve-port 8443
Instala un Node propio y su propio adb bajo /opt/NOMBRE-runtime; no toca ni sustituye las
versiones del sistema, asi que otros proyectos del servidor conservan las suyas.
Crea usuario de servicio, /var/lib/NOMBRE con permisos 700, /etc/NOMBRE.env con 640 y clave
aleatoria que no se imprime, unidad systemd habilitada, y verifica /api/health antes de terminar.
Es idempotente: repetirlo actualiza codigo y dependencias y conserva la clave y los datos.
Parametros: --origin --repo --ref --dir --port --serve-port.
Con --serve-port publica por tailscale serve en HTTPS solo dentro del tailnet; evita abrir
puertos y resuelve el contexto seguro que WebCodecs exige, sin tocar el proxy del servidor.
Sin --serve-port el backend queda en loopback y el proxy HTTPS se configura aparte.

### Descargas y IPv6
dl.google.com devuelve 404 por IPv6 para platform-tools desde algunos proveedores (verificado
en OVH): la misma URL responde 206 por IPv4. El instalador fuerza IPv4 en las descargas.
Si una descarga falla con 404 aunque la URL sea correcta, comprobar esto antes que la URL.
El SHA256 fijado de platform-tools r37.0.1 se contrasto contra la descarga real y coincide.

### Verificacion posterior
curl -fsS http://127.0.0.1:PUERTO/api/health debe responder ok y la version del paquete.
Las rutas /api/* sin sesion responden 401; un POST con Origin distinto de PUBLIC_ORIGIN responde 403.
El emparejamiento ADB de cada Android es un paso manual posterior: la VPN no sustituye la
autorizacion y el servidor tiene identidad propia.
