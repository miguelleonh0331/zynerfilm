# agentes_ia
Cuenta ChatGPT propia de Zynerfilmer mediante Codex app-server 0.159.0 incluido como dependencia.
Propietario: agents/agentes_ia_AGENT.md.
API publica: createAgents({dataDir,clientFactory?}) en api/index.mjs.
Una cuenta compartida y un thread independiente por endpoint; preferencias e historial en ai/agents.sqlite.
CODEX_HOME exclusivo en ai/codex: no lee ni copia sesiones del gestor usado como referencia.
Autenticacion por codigo de dispositivo: funciona con Electron y backend remoto; el usuario completa OpenAI.
Cliente RPC por stdio. Sin shell interpolado, sin tokens en renderer, sin credenciales en logs.
El agente conversa y conserva preferencias. Captura visual, scroll y likes aun no estan implementados.
Pruebas: npm test. Cuatro pruebas de servicio con transporte simulado y prueba HTTP de permisos.
Para instalar Linux: npm ci --omit=dev instala automaticamente la variante nativa Linux del paquete.

## BOT-007
Ya admite analisis visual de imagenes internas. models/configure seleccionan modelo y esfuerzo validos, persistentes por endpoint.
analyze devuelve JSON final del hilo correcto y soporta cancelacion. El controlador bot_tiktok ejecuta las acciones, no el modelo.
La descripcion de 0.5 sobre captura no implementada queda reemplazada por este contrato.
