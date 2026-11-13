# Arquitectura 0.4
Navegador/Electron -> API HTTP y WebSocket -> backend Node 24 -> ADB sobre VPN -> scrcpy-server Android 3.3.4.
Video H264 decodificado con WebCodecs en cliente. Sin escritorio ni decodificacion en VPS.
server.mjs compone conexion_adb, equipos(SQLite), sesiones_scrcpy y web_backend. Electron local arranca esa composicion; remoto abre ZYNER_SERVER_URL HTTPS.
## Persistencia
zynerfilmer.sqlite en ZYNER_DATA_DIR. Windows predetermina %LOCALAPPDATA%/Zynerfilmer; Linux ~/.local/share/zynerfilmer; contenedor /data.
Esquema v1: devices(id, endpoint UNIQUE, model, created_at, updated_at); migrations(name, applied_at).
Importacion JSON una vez dentro de transaccion; no se altera equipos.json. validateEndpoint se inyecta desde ADB.
SQLite WAL, consultas parametrizadas y busy timeout. Un backend por catalogo; SQLite permite backups consistentes.
La aplicacion C# usa su JSON anterior y no sincroniza altas/bajas posteriores.
## Interfaz
Sidebar con boton de alta y disponibles; popup con IP/puerto. Cuadricula de vistas independientes.
Dropdown compacto por equipo; pausa, desconexion y olvido del registro. Confirmacion antes de DELETE.
Ampliar mueve el canvas existente; solo vista grande envia controles. Cerrar vuelve a miniatura sin reconectar.
## Acceso y recursos
Clave administradora y cookies HttpOnly/SameSite Strict por 8h; Origin estricto y HTTPS remoto.
DELETE requiere pertenencia de la sesion y bloquea apertura durante eliminacion. No borra datos del telefono.
Video/procesos/tuneles y JAR pertenecen a cada sesion. No apagar servidor ADB ni cerrar scrcpy ajeno.
Datos, SQLite/WAL, backups, .env, access-token y claves ADB permanecen fuera de Git/distribucion.
## Distribucion
Git conserva el historial local. export-github.mjs genera un repo inicial limpio y ZIP sin historial privado.
Docker y systemd preparados; despliegue real en mirmidon pendiente, sin tocar produccion.
