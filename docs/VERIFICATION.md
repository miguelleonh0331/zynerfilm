# Verificacion
## Migracion inicial 0.2
Se conserva el checkpoint Git 2f8f64b con sus pruebas WinForms.
## Electron/web 0.3
Fecha: 2026-11-13.
- REA: inspeccion managed estatica del ensamblado 0.2; dependencias WinForms observadas.
- Ocho pruebas Node de endpoints/estados, catalogo concurrente/JSON corrupto, control binario, fragmentacion de video, acceso/origen/API/WebSocket, rechazo sin autorizacion, cierre durante preparacion y claves invalidas.
- Telefono real autorizado por el usuario: Samsung SM-G975F; video H264 recibido y decodificado en navegador y Electron, 608 x 1280. No se enviaron pulsaciones al telefono.
- Se uso agent-browser para verificar UI, decodificacion y ausencia de errores de pagina. Captura del panel sin pantalla privada en verification/electron-panel.png (local, fuera de Git).
- npm audit: cero vulnerabilidades tras actualizar ws 8.23.0 y @electron/packager 20.3.0.
- Portable Electron Windows x64 generado; no requiere Node instalado en destino.
- Documentacion y contratos: repo_agent.py validate.
## Limites de lo observado
No se ha desplegado ni probado CentOS, Docker, proxy TLS ni VPN desde el servidor destino.
Los eventos de raton/teclado/texto se probaron como protocolo binario, sin ejecutar acciones en el telefono real.
No se midieron latencia/FPS sostenidos, audio ni sesiones largas.

El portable final se lanzo desde dist/electron: Agregar por formulario aprobado y video real decodificado (608x1280). window.require resulto undefined y el renderer fue un contexto seguro. Sin errores de pagina. REA analizo 29 archivos del portable sin fallos de parseo; una BrowserWindow y tres preferencias web explicitas.
## UI-003: sidebar y cuadricula
Prueba con telefono autorizado: miniatura H264 real, click para ampliar y regreso al mismo canvas con cero nuevas conexiones y cero entradas remotas.
Prueba reproducible src/features/panel/tests/grid.check.js: dos streams independientes simulados, aislamiento de controles, Escape sin tecla Android y pausa independiente; aprobada.
No se ha medido carga con muchos telefonos simultaneos.
Portable Electron actualizado: sidebar visible, 11 frames decodificados en miniatura, ampliacion y regreso a una miniatura aprobados. Sin errores de pagina ni entradas al Android real.

## DATA-004
Nueve pruebas Node aprobadas: SQLite real, migracion unica/rollback, persistencia, consultas parametrizadas, backup, borrado durable y rechazo de borrado ajeno.
Popup probado con IP invalida (error dentro del dialogo) y alta valida. Dropdown nativo abre tres acciones.
Se agrego y elimino mediante UI un registro sintetico reservado para pruebas; el telefono real se conservo.
actions.check.js y grid.check.js aprobados: popup, agrupacion, confirmacion/cancelacion, dos vistas independientes y controles aislados.
node:sqlite verificado dentro del Electron distribuido. GitHub y VPS aun sin publicar/desplegar.
Verificacion final DATA-004: diez pruebas Node aprobadas, incluido configurador de despliegue (clave no impresa, sin sobrescritura). Backup consistente SQLite y rechazo de borrado de sesion ajena aprobados.

## AI-006
15 pruebas automatizadas aprobadas: aislamiento concurrente de dos moviles, reanudacion persistente, cuenta distinta rechazada, OAuth simulado y permisos HTTP.
Handshake real con binario Codex incluido y account/read sin cuenta, aprobado.
Flujo device-code real genero codigo con host oficial y se cancelo sin vincular cuenta; codigo no registrado.
No se realizaron inferencias con una cuenta real ni acciones TikTok; requiere que el usuario complete OAuth.
Prueba UI Electron: preferencias y mensajes A/B aislados con HTTP simulado; popup/dropdown y confirmacion existentes conservados. Consulta real de cuenta en portable: sin cuenta conectada, sin errores de pagina.

## BOT-007 / 0.6
25 pruebas automatizadas aprobadas: modelos/esfuerzos persistentes, vision con esquema, respuesta final por hilo, tareas simultaneas aisladas, stop durante inferencia, limite de intentos like, foreground y confirmacion visual Lite.
Electron: selectores reales del catalogo y prueba UI simulada de esfuerzos compatibles, configuracion por movil y start/stop sin acciones fisicas. Popup/dropdown previos conservados.
Prueba fisica autorizada por el usuario: TikTok Lite, tres videos revisados, dos swipes y un like confirmado en contenido sobre SaaS/software personalizado. Los otros dos videos se descartaron por no coincidir con preferencias. Final completed, running=false.
Modelo efectivo de esa prueba: default de la cuenta gpt-6.1-sol y esfuerzo predeterminado. Prueba limitada a maxLikes=1; sin reintentos.
Se corrigio deteccion de foreground en este Android (dumpsys window completo), control AX sin descripcion en Lite y verificacion del corazon blanco/rojo.
Evidencia de pantalla solo en verification/ local ignorado. No se publicaron datos, credenciales ni fuente.
Limitaciones: capturas estaticas sin audio; soporte Lite basado en controles conocidos de esta version; si cambia interfaz o estado no es verificable, no da like.

## BOT-008 / 0.6.1
28 pruebas automatizadas aprobadas. Se verifican limites27/33 para base30, descuento de12s de analisis (espera18s), configuracion sin autoarranque, reutilizacion al iniciar y comando SLEEP223 sin togglePOWER.
Electron: dropdown inicia/detiene sin popup, marca/modelo activa/inactiva, configuracion guardada y selectores existentes aprobados con HTTP simulado.
Prueba fisica de un video con likes desactivados: inicio desde dropdown, verde=true; objetivo aleatorio27s para base30; final completed,watched1,screenLocked=true. ADB power informa Dozing. Estado global vuelve a verde=false e Iniciar bot.
Se restauraron opciones de tarea previas del usuario tras la prueba; no se cambiaron modelo/preferencias ni se despert? la pantalla.
Limite temporal: el objetivo incluye captura/IA/acciones; si la inferencia excede objetivo, no se agrega espera y se registra el exceso. No garantiza tiempo real duro.
