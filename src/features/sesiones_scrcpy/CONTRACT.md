# CONTRACT.md - sesiones_scrcpy
## Responsabilidad contractual
Video H264 y control de sesiones scrcpy propias para el panel web.
## Version
0.3 JavaScript. Las APIs C# 0.2 permanecen para la alternativa clasica.
## Entradas publicas
index.mjs exporta createSessions({adb, serverPath}): attach(endpoint, ws), has(endpoint), close(endpoint), closeAll(). VideoParser y controlMessage documentan el protocolo 3.3.4 para pruebas.
## Salidas publicas
Version exacta 3.3.4. Una sesion por endpoint y proceso; dos sockets via tunel ADB local. WebSocket envia metadatos JSON y paquetes binarios scrcpy de cabecera 12 bytes. Recibe touch, key y text validados. Limites 8 MiB/paquete, 4 MiB de salida pendiente y 300 bytes de texto. Al cerrar quita tunel y archivo temporal propios; sin audio.
## Errores posibles
Errores de validacion, conexion, autorizacion, codec, timeout o sistema se comunican al consumidor; no equivalen a ausencia de equipo.
## Dependencias permitidas
- conexion_adb
## Dependencias prohibidas
- Implementacion interna de otro modulo.
- Dependencias externas no aprobadas por el arquitecto.
## Garantias
Version exacta 3.3.4. Una sesion por endpoint y proceso; dos sockets via tunel ADB local. WebSocket envia metadatos JSON y paquetes binarios scrcpy de cabecera 12 bytes. Recibe touch, key y text validados. Limites 8 MiB/paquete, 4 MiB de salida pendiente y 300 bytes de texto. Al cerrar quita tunel y archivo temporal propios; sin audio.
## Prohibiciones
No publicar shell remoto libre, cerrar procesos ajenos ni interpretar credenciales del panel.
## Cambios de contrato
Escalar al ARCHITECT_AGENT, evaluar consumidores, obtener permiso escrito y registrar decision e impacto antes de implementar. No autoaprobar invasiones.

## BOT-007
createSessions admite canControl(endpoint) opcional, por defecto true.
Se evalua antes de cada mensaje de control. Si false, rechaza entrada manual con error, preservando el video.
Arquitecto inyecta !bots.has(endpoint) para exclusividad de tarea.
