# CONTRACT.md - web_backend
## Responsabilidad contractual
Servidor HTTP/WebSocket y autorizacion del panel.
## Version
0.3 JavaScript. Las APIs C# 0.2 permanecen para la alternativa clasica.
## Entradas publicas
index.mjs exporta accessToken(dataDir, supplied) y createWebServer({adb,store,sessions,token,webDir,host,port,publicOrigin,secureCookies}). Devuelve origin, server, close(). Composicion en server.mjs.
## Salidas publicas
GET /api/health; POST /api/login {token}; POST /api/logout; GET /api/devices; POST /api/devices {endpoint}; POST /api/disconnect {endpoint}; WS /api/stream?endpoint=IP:puerto. Cookie HttpOnly/SameSite Strict por 8h; Origin exacto para mutaciones y WS; rate limit login; JSON 4 KiB. Solo equipos guardados. Otro login no desconecta la sesion activa ajena. Rutas estaticas cerradas y CSP.
## Errores posibles
Errores de validacion, conexion, autorizacion, codec, timeout o sistema se comunican al consumidor; no equivalen a ausencia de equipo.
## Dependencias permitidas
- conexion_adb
- equipos
- sesiones_scrcpy
## Dependencias prohibidas
- Implementacion interna de otro modulo.
- Dependencias externas no aprobadas por el arquitecto.
## Garantias
GET /api/health; POST /api/login {token}; POST /api/logout; GET /api/devices; POST /api/devices {endpoint}; POST /api/disconnect {endpoint}; WS /api/stream?endpoint=IP:puerto. Cookie HttpOnly/SameSite Strict por 8h; Origin exacto para mutaciones y WS; rate limit login; JSON 4 KiB. Solo equipos guardados. Otro login no desconecta la sesion activa ajena. Rutas estaticas cerradas y CSP.
## Prohibiciones
No exponer comandos libres ni claves, servir archivos arbitrarios o importar implementaciones internas de otros modulos.
## Cambios de contrato
Escalar al ARCHITECT_AGENT, evaluar consumidores, obtener permiso escrito y registrar decision e impacto antes de implementar. No autoaprobar invasiones.

## Actualizacion 0.4
store publica all/list, add(endpoint, model) y remove(endpoint).
GET devices conserva metadatos SQLite incluso offline. DELETE /api/devices {endpoint} requiere login y Origin valido, cierra la vista propia y elimina el registro.
Rechaza borrado si otro login controla ese equipo. No modifica datos Android ni ejecuta adb disconnect al olvidar un registro.
Bloquea nuevas vistas durante el borrado. API health publica version 0.4.0.

## Actualizacion 0.5 / AI-006
Dependencia publica adicional: agentes_ia inyectado en createWebServer.
GET /api/ai/account; POST /api/ai/login; POST /api/ai/logout.
GET /api/ai/agent?endpoint=...; PUT /api/ai/agent {endpoint,preferences}; POST /api/ai/message {endpoint,text}.
Mismo login y Origin de mutaciones; solo endpoints guardados, cuerpo maximo 4KiB.
Eliminar equipo rechaza agente ocupado y olvida contexto local tras retirar registro.

## BOT-007
Inyeccion publica adicional: bots.
GET /api/ai/models -> {models}; PUT /api/ai/config {endpoint,model,effort}.
GET /api/bot?endpoint=...; POST /api/bot {endpoint,options:{maxVideos,watchSeconds,likes}}; DELETE /api/bot {endpoint}.
Mismo login y Origin para mutaciones. Solo equipos guardados. Start rechaza stream de otro login.
Bots activos bloquean chat/config/preferencias/borrado por endpoint y cambio global de cuenta. Logout del panel detiene sus bots; desconectar movil tambien.
No exponer imagePath, comandos, esquemas ni coordenadas libres. El panel puede consultar/detener tareas con su acceso de administrador.

## BOT-008
GET /api/bots autenticado -> {bots:[{endpoint,running,status}]} solo catalogo guardado, sin logs ni metadatos personales.
GET devices agrega botRunning. PUT /api/bot {endpoint,options} guarda tarea sin iniciar y exige login/Origin/catalogo.
POST /api/bot {endpoint} reutiliza opciones persistidas. No cambia modelo/esfuerzo/preferencias.

## MEM-010 / 0.7.1
GET /api/bots agrega current,total,updatedAt por equipo para que el panel pinte progreso y detecte cuelgues.
No expone la memoria aprendida ni el contenido de los analisis.
