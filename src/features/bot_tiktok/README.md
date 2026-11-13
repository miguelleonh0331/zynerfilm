# bot_tiktok
Controlador de tarea por movil. Consume agentes_ia y un observador Android por contrato.
Implementacion publica: api/index.mjs. Propietario: agents/bot_tiktok_AGENT.md.
Captura PNG mediante ADB y comprueba TikTok en primer plano antes/despues de capturar y antes de actuar.
IA devuelve watch/skip/like/stop en JSON validado. Like requiere preferencia explicita, contenido relevante y boton de accesibilidad unico no seleccionado. Se vuelve a leer el boton antes del tap y se confirma despues.
Pasar video usa swipe de coordenadas proporcionales fijas; el modelo no puede inventar comandos/coordenadas.
Likes desactivados por defecto. Limite 1-100 videos, espera 2-60 segundos; detener cancela espera/inferencia y no se reanuda al reiniciar.
Estado y ultimas acciones en ai/bot/tasks.sqlite. Captura temporal local eliminada al terminar.
Pruebas con observador/IA simulados: npm test. No ejecutar likes reales para verificar cambios sin instruccion especifica.
Compatibilidad inicial: TikTok com.zhiliaoapp.musically, com.ss.android.ugc.trill y TikTok Lite com.zhiliaoapp.musically.go. Sin Douyin. No resuelve login/captcha/anuncios/dialogos.
La deteccion por captura no escucha audio ni analiza un clip completo. La interfaz de accesibilidad de TikTok puede impedir identificar el boton; en ese caso no da like.

TikTok Lite: control conocido i2d + limites de su icono y verificacion PNG del corazon blanco/rojo mediante pngjs 7.0.0. Estado ambiguo no permite tap. Reanuda el video pausado solo si encuentra el control play conocido fo7; no pulsa el centro sin verificar.
maxLikes limita intentos de like por tarea (por defecto maxVideos), incluidos intentos sin confirmacion.

## BOT-008
Ahora el tiempo es un objetivo aleatorio +/-3s e incluye el analisis. Si la inferencia es mas lenta, se avanza sin espera adicional y se registra el exceso.
Al completar normalmente se apaga/bloquea pantalla con SLEEP 223; detener manualmente o error no apaga pantalla.
configure guarda opciones para arrancar luego desde dropdown sin popup.
