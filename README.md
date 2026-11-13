# Zynerfilmer 0.7
Panel web y cliente Electron para controlar Android mediante ADB y scrcpy a traves de VPN.
## Abrir
Abrir-Zynerfilmer.cmd inicia el portable Electron de dist/electron/Zynerfilmer-win32-x64.
Iniciar-Panel-Web.cmd arranca el servidor para navegador en http://127.0.0.1:4317.
El panel no queda escuchando solo: si la direccion no carga es que el servidor no esta arrancado.
HOST y PORT cambian la escucha; con HOST=0.0.0.0 se entra desde la LAN por la IP del equipo.
Clave local: %LOCALAPPDATA%/Zynerfilmer/access-token. Electron local inicia sesion automaticamente.
## Equipos
Agregar equipo abre un popup con IP y puerto. Los disponibles aparecen en la barra izquierda y en miniatura a la derecha.
Click en miniatura amplia; Volver/Escape conserva su vista. Solo la pantalla ampliada admite control.
Menu ⋯: Pausar/Reanudar, Desconectar y Eliminar del catalogo. Eliminar no borra datos del Android.
Requiere depuracion inalambrica activa y confianza ADB previa. El puerto puede cambiar.
## SQLite
Archivo zynerfilmer.sqlite en el directorio de datos. Guarda endpoint, modelo, ID y fechas.
Importa equipos.json una sola vez, preservando el original. Los equipos eliminados no reaparecen al reiniciar.
Datos y claves no se incluyen en Git ni en los paquetes de distribucion.
La alternativa C# 0.2 conserva un JSON independiente y se abre con Abrir-Zynerfilmer-Clasico.cmd.
## Desarrollo
Node 24+. npm ci; node node_modules/electron/install.js; npm test; npm run package:win.
Construir-Electron.ps1 automatiza compilacion y usa el runtime local disponible si es necesario.
Leer AGENTS.md y agend.md; seis modulos con agentes y contratos. No editar fuera del alcance sin permiso.
## GitHub y VPS mirmidon
node scripts/export-github.mjs genera un repositorio limpio y ZIP para publicar, sin reescribir el historial local.
Seguir docs/GITHUB_MIRMIDON.md para configurar, instalar, respaldar y revertir.
Dockerfile y Compose incluyen ADB Linux, Node 24 y volumenes persistentes. Electron no se ejecuta en el VPS.
Servidor Linux/TLS aun sin desplegar; analisis REA previos se conservan localmente y no se exportan.
## Procedencia
Motor scrcpy-server 3.3.4 sin modificar, Apache 2.0. Fuentes y hashes en LICENSES/SOURCES.md.
Electron y ws conservan licencias originales. No es un producto oficial de Genymobile.

## Configuracion IA (0.5)
Abre Configuracion IA, pulsa Conectar ChatGPT y abre el acceso oficial de OpenAI para introducir el codigo.
Zynerfilmer conserva su propia sesion; no utiliza las credenciales del gestor de perfiles.
En el menu de cada miniatura, Agente IA abre preferencias y conversacion independiente.
La misma cuenta comparte cuota entre moviles. Cada agente conversa y conserva su contexto; el bot TikTok de 0.6 utiliza ese mismo agente.
Datos locales: ai/codex (credenciales Codex) y ai/agents.sqlite (preferencias/historial) dentro del directorio de datos.
No publiques esos archivos ni los incluyas en una exportacion del repositorio.

## Bot TikTok (0.6)
1. Conecta ChatGPT en Configuracion IA y abre TikTok en el movil.
2. En Agente IA de esa miniatura, selecciona modelo/esfuerzo y escribe tus preferencias.
3. Escoge limite de videos (1-100), espera (2-60s), y activa likes si los deseas.
4. Iniciar bot guarda seleccion/preferencias. Detener cancela trabajo pendiente. Cerrar el dialogo deja la tarea ejecutandose hasta su limite.
El modelo analiza capturas; el audio solo entra si activas el oido Groq de 0.7. Los segundos son la espera posterior al analisis, no el tiempo total por video.
Likes solo si coincide el contenido y el boton puede verificarse mediante accesibilidad; si no aparece, no pulsa coordenadas inventadas.
Durante tarea el control manual de ese movil esta bloqueado; el video sigue disponible. No autoarranca tras reiniciar.
Repositorio para publicacion futura: https://github.com/miguelleonh0331/zynerfilmer

## Controles de tarea (0.6.1)
Guarda modelo, preferencias y parametros en Agente IA mediante Guardar tarea y volver.
Inicia o deten desde el dropdown de la miniatura; marca/modelo parpadean verde mientras corre.
Con 30 segundos el objetivo aleatorio es 27-33 segundos por video; incluye captura/analisis. Si la IA tarda mas, no se anade otra espera.
Al completar la cantidad de videos se apaga/bloquea la pantalla segun la configuracion de Android. Una parada manual o un error no bloquea.

## Oido del bot con Groq (0.7)
En Configuracion IA, seccion Oido del bot, pega la clave de Groq y pulsa Guardar clave de Groq.
La clave se guarda en el directorio privado de datos con permisos cerrados; no vuelve al panel, no entra en Git ni en los registros.
Captura unos segundos del audio interno que reproduce el movil mediante una sesion scrcpy propia de solo audio y lo transcribe con whisper-large-v3-turbo.
Nunca usa el microfono; el buffer vive en memoria y no se graba ni se exporta. Requiere Android 11 (SDK 30) o superior.
El agente decide combinando lo que ve y lo que oye. La transcripcion es dato externo no confiable: si pide acciones, se ignora.
Si falta clave, hay silencio, el video es muy corto o la red falla, el bot continua solo con la captura. Nunca pide mas de 8 segundos por video.
No se puede cambiar la clave con bots trabajando.

## Memoria y coste por video (0.7.1)
Cada video se juzga en un hilo desechable: el video 500 cuesta lo mismo que el primero.
Antes se reutilizaba el hilo del agente y cada video apilaba su captura; a 100 videos el contexto era inmanejable.
Lo que el bot recuerda es un resumen de criterio de 600 caracteres como maximo, no las capturas.
Se actualiza cada 10 videos y al completar la tarea, y se reinyecta en cada analisis junto a tus preferencias.
Las preferencias que escribes mandan siempre sobre esa memoria, que viaja marcada como dato y nunca como orden.
Una tarea detenida o con error no aprende. Si el resumen falla, se registra y la tarea termina igual.
La memoria vive en agents.sqlite por movil y desaparece al eliminar el equipo del catalogo.

## Oido primero (0.7.1)
Con transcripcion utilizable el bot decide primero solo con el texto, que es mucho mas barato que enviar la captura.
Si el audio basta, la imagen no se envia al modelo y el registro lo indica con "captura no enviada".
Si el audio es ambiguo, suena a anuncio, directo o musica sin tema, decide la imagen como antes.
La captura se sigue tomando en local para verificar el boton de like: un like propuesto por audio pasa la misma
verificacion de accesibilidad y color. El audio no otorga likes por si solo.

## Contador de videos (0.7.1)
Junto a marca y modelo aparece actual/total mientras el bot trabaja, en la miniatura y en la lista lateral.
Sirve para ver cuantos videos quedan y si la tarea dejo de avanzar.
Sin progreso durante mas de dos minutos el contador avisa; al detener el bot se oculta.

## Resumen de actividad (0.7)
Resumen de actividad en la barra izquierda abre el acumulado y se refresca cada 3 segundos.
Totales: videos recorridos, likes confirmados, videos escuchados y tareas lanzadas.
Tabla por equipo con esas cuatro cifras, la ultima actividad y la fila resaltada si el bot corre ahora.
Los contadores viven en la tabla metrics de ai/bot/tasks.sqlite, sobreviven reinicios y se borran al eliminar el equipo del catalogo.
Los equipos que ya no estan en el panel se marcan como fuera del panel en lugar de desaparecer del historico.
