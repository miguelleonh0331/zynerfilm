# Tablero
| Tarea | Responsable | Alcance | Estado |
|---|---|---|---|
| MIG-001 | ARCHITECT_AGENT, autorizado por usuario | Modularizacion C# 0.2 | Terminado |
| MIG-002 | ARCHITECT_AGENT, autorizado por usuario | Electron/web, seis modulos, contratos y despliegue | Terminado |

Sin reservas activas ni workers externos. Permisos transversales cerrados.
Proxima tarea pendiente de entorno: desplegar CentOS, TLS y autorizacion ADB del servidor.
Ver docs/VERIFICATION.md para resultados y limites de las pruebas.
UI-003: panel_AGENT reserva src/features/panel/web/** para sidebar, cuadricula y ampliacion. Arquitecto integra portable; alcance autorizado por usuario. En curso.
UI-003 terminado: miniatura real y ampliacion/regreso probados en portable Electron; dos vistas simuladas con aislamiento de controles. Reserva liberada.
DATA-004 reservado por ARCHITECT_AGENT: SQLite, menu, popup y preparacion GitHub/mirmidon. Sin workers concurrentes.
DATA-004 implementado y verificado en rama aislada; sin reservas activas. Integracion/publicacion portable a cargo del arquitecto. GitHub y VPS no modificados.

UI-005: panel_AGENT reserva panel/web y panel/tests para compactar cabecera de miniatura; alcance solicitado por usuario. Arquitecto integra portable y registro.
UI-005 terminado: portable reconstruido, popup/menu/confirmacion probados en Electron y dropdown visible verificado. Reserva liberada.
AI-006 reservado: ARCHITECT_AGENT integra agentes_ia, panel, web_backend, server.mjs, dependencias, pruebas y documentacion. Autorizacion transversal explicita del usuario: agente independiente por movil y conexion OAuth. Sin workers.
AI-006 terminado: 15 pruebas, UI simulada A/B y consulta real de cuenta en portable aprobadas. Device-code real generado y cancelado sin registrar codigo ni vincular cuenta. Reserva transversal liberada. Pendiente vinculacion del usuario e inferencia real; automatizacion TikTok fuera de esta fase.
BOT-007 reservado: bot_tiktok nuevo, agentes_ia modelos/esfuerzo y analisis visual, panel/HTTP, adaptador ADB y exclusividad scrcpy. Arquitecto integra por solicitud actual del usuario. Sin workers ni publicacion.

BOT-007 terminado: modelos/esfuerzos por movil y bot finito TikTok/Lite. 25 pruebas y UI Electron aprobadas; usuario autorizo prueba fisica de 3 videos/2 swipes/1 like confirmado. Bot terminado, sin tareas activas. Origin guardado; sin publicacion. Reserva liberada.
BOT-008 reservado: panel dropdown/indicadores globales, bot_tiktok tiempo aleatorio y bloqueo al completar, HTTP configuracion persistente. Arquitecto integra por procede del usuario, sin workers.

BOT-008 terminado: dropdown/indicadores, tarea persistida, tiempo objetivo aleatorio y bloqueo final. 28 pruebas y Electron aprobados; prueba real sin likes termino y pantalla en Dozing. Opciones anteriores restauradas. Reserva liberada.
AUDIO-009 reservado: nuevo audio_groq, bot_tiktok fusion auditiva y metricas SQLite, panel resumen/configuracion y HTTP/composicion. Autorizacion actual del usuario; sin workers ni publicacion.

AUDIO-009 verificado en hardware real (SM-G975F, Android 12, IP-TAILSCALE:PUERTO). La captura
fallaba siempre en el movil aunque las 52 pruebas pasaban: el bucle de reintentos de
`createAudioCapture` daba el tunel por listo al conectar, pero `adb forward` acepta el TCP en 2 ms
aunque scrcpy todavia no haya creado su socket abstracto y adbd lo cierra a los 16 ms. El socket
roto salia del bucle y la lectura moria con "El dispositivo no permite capturar este audio".
Corregido: el tunel solo se acepta cuando llega el primer byte real, ese bloque se conserva y el
socket pausado se reanuda al leer. Verificado 5 de 5 transcripciones correctas contra TikTok Lite
(contrastadas con captura de pantalla). Añadida prueba de regresion que falla con el codigo previo.
Scripts de comprobacion manual en verification/ (ignorado por git).

MEM-010 cerrado: memoria base, triaje por audio y contador de progreso.
El hilo del agente se reutilizaba en cada analisis, asi que cada video apilaba su captura en el mismo
contexto: el video 100 arrastraba 99 frames y la cuenta crecia sin tope entre tareas y entre dias.
Ahora analyze usa un hilo desechable (coste constante) y lo que se recuerda es un resumen de criterio
de 600 caracteres en agents.profile, actualizado cada 10 videos y al completar la tarea.
Con transcripcion utilizable se decide primero solo con texto; la captura solo se envia cuando el audio
no basta. El triaje no valida que la pantalla sea el feed: ante duda, anuncio o musica cae a la imagen.
snapshot y GET /api/bots exponen current/total/updatedAt; el panel pinta actual/total y avisa si una
tarea lleva mas de 2 minutos sin avanzar.
Pendiente de verificar por el usuario: src/features/panel/tests/counter.check.js. El arnes de Electron
no arranca sin sesion de escritorio (app.whenReady no resuelve), asi que no se pudo ejecutar aqui.
