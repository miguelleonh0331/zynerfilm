# CONTRACT.md - panel
## Responsabilidad contractual
Interfaz web compartida por navegador y Electron.
## Version
0.3 JavaScript. Las APIs C# 0.2 permanecen para la alternativa clasica.
## Entradas publicas
web/index.html, style.css y app.js. Consume API HTTP y WebSocket del backend. Se preserva api/Panel.cs para la alternativa WinForms 0.2.
## Salidas publicas
Login, agregar IP/puerto, listar/actualizar, controlar, cerrar pantalla y desconectar. WebCodecs decodifica H264 en contexto seguro: localhost o HTTPS. Raton y arrastre, teclas de navegacion y texto mediante scrcpy. Errores visibles; no guarda claves en localStorage. La clave de auto-login Electron se retira del fragmento URL al usarla.
## Errores posibles
Errores de validacion, conexion, autorizacion, codec, timeout o sistema se comunican al consumidor; no equivalen a ausencia de equipo.
## Dependencias permitidas
- web_backend
- conexion_adb (solo alternativa C# 0.2)
- equipos (solo alternativa C# 0.2)
- sesiones_scrcpy (solo alternativa C# 0.2)
## Dependencias prohibidas
- Implementacion interna de otro modulo.
- Dependencias externas no aprobadas por el arquitecto.
## Garantias
Login, agregar IP/puerto, listar/actualizar, controlar, cerrar pantalla y desconectar. WebCodecs decodifica H264 en contexto seguro: localhost o HTTPS. Raton y arrastre, teclas de navegacion y texto mediante scrcpy. Errores visibles; no guarda claves en localStorage. La clave de auto-login Electron se retira del fragmento URL al usarla.
## Prohibiciones
No ejecutar Node, ADB, procesos, escribir catalogos ni importar servicios del backend.
## Cambios de contrato
Escalar al ARCHITECT_AGENT, evaluar consumidores, obtener permiso escrito y registrar decision e impacto antes de implementar. No autoaprobar invasiones.
## Vista multiple
Los equipos conectados abren miniaturas independientes en una cuadricula. La barra lateral concentra altas y equipos disponibles.
Pulsar miniatura amplia el mismo canvas, sin reconexion ni toque Android. Volver o Escape conserva el video mini.
Los controles solo se envian a la pantalla ampliada. Pausar libera un visor; Desconectar conserva su comportamiento ADB.

## Actualizacion 0.4
El boton Agregar equipo abre un dialogo; los campos IP/puerto no se muestran en sidebar.
Acciones de cada miniatura en dropdown nativo details/summary: Pausar/Reanudar/Reconectar, Desconectar, Eliminar.
Eliminar abre confirmacion con equipo correcto y usa DELETE autenticado. Cancelar conserva registro.
Errores de alta/borrado se muestran dentro de su popup. No usa SQLite ni Node desde el renderer.

## Actualizacion 0.5 / AI-006
Configuracion IA en sidebar abre dialogo para cuenta ChatGPT por codigo de dispositivo.
Agente IA en dropdown abre preferencias y conversacion del endpoint seleccionado.
Polling solo con dialogo abierto; respuesta vieja no reemplaza datos de otro movil.
Solo consume HTTP. Textos de modelo renderizados con textContent. No muestra tokens ni promete control TikTok.

## BOT-007
Agente IA incluye selectores de modelo/esfuerzo por movil, guardado y boton Iniciar/Detener bot.
Modelos desde catalogo real; esfuerzos se recalculan segun modelo. No oculta una seleccion guardada que ya no existe.
Limite videos/espera/checkbox likes; guarda modelo/esfuerzo y preferencias antes de iniciar.
Muestra estado/conteos/eventos; actualiza por polling mientras dialogo abierto. Cambiar/cerrar dialogo no detiene tarea.
Inicio explicito, sin autoarranque. Lectura de bot independiente de catalogo para conservar Detener aunque falle model/list.

## BOT-008
Iniciar/Detener bot se mueve al dropdown de cada miniatura y actua sobre su endpoint sin abrir popup.
Dialogo Agente conserva parametros y boton Guardar tarea y volver (sin iniciar).
GET /api/bots actualiza indicadores globales cada 2s aunque dialogo este cerrado; marca/modelo de tarjeta y boton sidebar parpadean verde solo mientras running=true.
Estado inicial tambien proviene de GET devices.botRunning. El paro/error/completado quita el indicador.
Se respeta prefers-reduced-motion mostrando verde fijo. Controles manuales siguen bloqueados mientras tarea este reservada.

## MEM-010 / 0.7.1
Contador actual/total junto a marca y modelo, en la miniatura y en la lista lateral, solo mientras el bot trabaja.
Conserva el ultimo progreso conocido cuando un refresco llega sin esas cifras, para no parpadear.
Sin avance durante mas de 2 minutos lo marca con aviso; al detener el bot se oculta y no deja cifras viejas.
