# CONTRACT.md - bot_tiktok
## Responsabilidad contractual
Tareas finitas para observar TikTok, ver/pasar videos y dar like segun preferencias por movil.
## Entradas publicas
createBots({dataDir,agents,observer,delay?}) -> start(endpoint,{maxVideos,watchSeconds,likes,maxLikes?}), stop(endpoint), snapshot(endpoint), has(endpoint), any(), forget(endpoint), close().
agents: account(),snapshot(endpoint),models(),analyze(endpoint,{imagePath,prompt,schema,signal}).
createAndroidObserver(adb) -> capture(endpoint,signal),like(endpoint,scene,signal),next(endpoint,scene,signal), resume(endpoint,signal).
ADB consumido solo por api publica run(args,{signal,timeout,encoding}). Adaptador autorizado BOT-007 para lista fija de operaciones.
## Salidas publicas
snapshot: endpoint,running,status,watched,likes,options?,log (ultimos 50 eventos).
capture: png,width,height,like{x,y,liked}|null; like devuelve true solo tras confirmar seleccion.
Errores -> status error y evento visible; no retry automatico de likes.
## Dependencias permitidas
- agentes_ia
- conexion_adb
Node estandar y pngjs 7.0.0 para leer PNG (sin binario adicional). No importa implementacion privada de otros modulos.
## Dependencias prohibidas
Shell/ADB arbitrario, credenciales OAuth, acciones en otros endpoints, coordenadas generadas por IA.
## Garantias
Un controlador por endpoint; simultaneidad entre moviles. Stop aborta trabajo pendiente y espera su salida.
Solo TikTok foreground, feed validado por IA y decisiones con esquema. Sin boton unico verificable no hay like. Nunca desactiva un like.
Limites 1-100 videos y 2-60 segundos. Likes opt-in. Estado persistido, sin autoarranque al reiniciar.
Observa capturas estaticas, sin transcripcion/audio ni garantia de clasificacion semantica perfecta.
El consumidor valida catalogo y bloquea control manual/chat/config mientras running=true; detener permanece permitido.
## Cambios de contrato
ARCHITECT_AGENT registra impacto y permiso del usuario antes de cambios transversales.

## Compatibilidad validada durante BOT-007
Incluye TikTok Lite .go. Foreground usa dumpsys window completo; windows en este Android no informa mCurrentFocus.
En Lite el AX no publica selected en corazon. Se requiere resource-id i2d, icono hijo dentro de bounds y color PNG blanco/rojo reconocible, antes y despues. La IA no da coordenadas.
resume solo permite el play conocido fo7 de Lite verificado por AX. maxLikes acota intentos de like y evita reintentos aunque no se confirme el resultado.

## BOT-008 / 0.6.1
configure(endpoint,options) persiste opciones sin iniciar. start(endpoint) sin options reutiliza configuracion guardada.
createBots admite now/random inyectables para verificar tiempo sin esperas fisicas.
Cada video elige segundos enteros entre max(2,base-3) y base+3; el reloj incluye captura, IA y acciones. El tiempo ya consumido se descuenta; si excede objetivo, no agrega otra espera y lo registra.
Tras el ultimo video, estado locking mantiene reserva de control; observer.lock(endpoint,signal) ejecuta KEYCODE_SLEEP 223 una vez. completed implica comando aceptado; snapshot agrega screenLocked.
No bloquea al detener manualmente, salir del feed ni fallar analisis. Fallo al bloquear se informa como error.
No se usa POWER toggle ni se configura PIN/retardo de bloqueo de Android. No garantiza tiempo real si la inferencia/ADB superan objetivo.

## MEM-010 / 0.7.1
Triaje por audio antes de la imagen: con transcripcion utilizable se pide primero una decision de solo texto
(triageSchema: decided,relevant,reason). decided=true resuelve el video y la captura NO se envia al modelo.
decided=false, esquema invalido o error caen a la decision con imagen; un triaje roto nunca detiene la tarea.
El triaje no puede validar que la pantalla sea el feed: ante anuncio, directo, musica o ambiguedad debe devolver
decided=false y dejar que la imagen decida. La captura se sigue tomando en local para verificar el boton de like.
Un like propuesto por audio pasa por la misma verificacion de accesibilidad y color; el audio no otorga likes.
Memoria de criterio: cada 10 videos y al completar la tarea se resume en <=600 caracteres via profileSchema y se
guarda con agents.learn. Una tarea detenida o con error no aprende. Un fallo al resumir se registra y no rompe la tarea.
snapshot agrega current (video en curso), total (maxVideos de la tarea) y updatedAt ISO, para que el consumidor
muestre progreso y detecte una tarea sin avance. createBots admite stamp() inyectable.
