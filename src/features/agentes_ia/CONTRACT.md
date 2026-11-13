# CONTRACT.md - agentes_ia
## Responsabilidad contractual
Gestionar cuenta OAuth ChatGPT y conversaciones independientes de moviles.
## Entradas publicas
createAgents({dataDir,clientFactory?}) -> servicio.
account(), login(), logout(), snapshot(endpoint), preferences(endpoint,text), send(endpoint,text), forget(endpoint), close().
El consumidor valida que endpoint existe en su catalogo antes de consultar/modificar.
## Salidas publicas
account: connected,email,plan,pending,error; nunca tokens.
login: loginId, verificationUrl HTTPS auth.openai.com, userCode temporal.
snapshot/send/preferences: endpoint,preferences,threadId,busy,messages[{role,text}].
send acepta un turno y devuelve estado; consultar snapshot hasta busy=false. Respuestas dirigidas exclusivamente por threadId.
## Errores posibles
Cuenta ausente o distinta, turno ocupado, login activo, datos invalidos, timeout/proceso cerrado/RPC.
No se reenvia un mensaje fallido automaticamente. El historial contiene como maximo 100 mensajes en cada respuesta.
## Dependencias permitidas
Node estandar y @openai/codex 0.159.0. Sin acceso a implementaciones de equipos, ADB ni sesiones_scrcpy.
## Dependencias prohibidas
Otros modulos internos. Tokens del gestor de perfiles externo. Comandos introducidos por el usuario.
## Garantias
Cuenta y refresh administrados por Codex en CODEX_HOME exclusivo. SQLite propio; endpoint como clave.
Persisten hilo, preferencias e historial. Reanudacion explicita; fallo al reanudar no crea un hilo vacio.
Cuenta compartida con cuota compartida. Independencia conversacional; no promete aislamiento del sistema operativo.
Un turno simultaneo por endpoint, varios endpoints en paralelo. Cambio de cuenta/logout bloqueado durante turnos.
Shell/apply_patch deshabilitados y aprobaciones rechazadas. Sin herramientas Android ni acciones automaticas en esta fase.
## Cambios de contrato
Solo ARCHITECT_AGENT con autorizacion transversal del usuario y ADR.

## BOT-007 / 0.6 (sustituye la limitacion de solo conversacion 0.5)
models() lista catalogo paginado del app-server: model,name,efforts,defaultEffort,isDefault,vision.
configure(endpoint,{model,effort}) valida catalogo real y persiste sin reiniciar hilo; vacios usan defaults compatibles.
snapshot agrega model/effort. Cada turn/start aplica modelo y esfuerzo seleccionado; valores no disponibles fallan sin sustitucion silenciosa.
analyze(endpoint,{imagePath,prompt,schema,signal}) recibe imagen exclusivamente desde el adaptador interno aprobado, solicita JSON estructurado y espera resultado final. Limite 120s, abort solicita turn/interrupt.
No se exponen imagePath/outputSchema del cliente HTTP. Permisos shell/aprobaciones permanecen cerrados.
Modelo y esfuerzo son propiedades del agente por endpoint. Bot_tiktok es consumidor autorizado; agentes_ia no ejecuta ADB.

## MEM-010 / 0.7.1
analyze(endpoint,...) usa SIEMPRE un hilo desechable: thread/start propio por llamada, sin persistir, sin thread/resume
y sin escribir en messages. El coste de contexto de un juicio es constante y no depende de cuantos videos se llevan vistos.
El hilo de conversacion humana (send) se mantiene aparte y analyze no lo lee, no lo reemplaza ni lo ensucia.
learn(endpoint,profile) -> string. Recorta a 600 caracteres, persiste en agents.profile y rechaza lo que no sea texto.
snapshot agrega profile. Cada turno inyecta "Preferencias actuales" y, si existe, "Memoria aprendida", en ese orden
y marcada como dato de apoyo que nunca manda sobre las preferencias ni se obedece como instruccion.
La memoria es un resumen de criterio, nunca frames, nombres de usuario ni frases de videos concretos.
