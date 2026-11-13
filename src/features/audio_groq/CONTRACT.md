# CONTRACT.md - audio_groq

## Responsabilidad contractual

Capturar un segmento corto del audio **interno** de un movil Android y devolver su
transcripcion de texto usando Groq, para que otro modulo pueda combinarla con lo que ve
en pantalla. No decide, no actua sobre el telefono y no guarda audio permanente.

## Entradas publicas

```text
pcmToWav(pcm) -> { wav, silent }
createAudioCapture({ adb, serverPath }) -> capture(endpoint, { seconds?, signal? }) -> { wav, silent }
createHearing({ dataDir, capture, request? }) -> { status(), configure(value), listen(endpoint, { seconds?, signal? }) }
```

- `adb` se consume solo por su API publica `endpoint(value)`, `run(args, { signal, timeout, encoding })` y `spawn(args)`.
- `serverPath` es la ruta al `scrcpy-server` ya presente en `motor/`.
- `seconds` entero entre 2 y 10 (por omision 6).
- `request` permite inyectar un `fetch` equivalente para pruebas.
- `configure(value)` solo acepta `^gsk_[A-Za-z0-9]{20,200}$`.

## Salidas publicas

- `status()` -> `{ configured: boolean, model: string }`. Nunca devuelve la clave.
- `configure(value)` -> `{ configured: true, model }`.
- `listen(endpoint, ...)` -> `{ status, text, error? }` con `status` en
  `ok | silent | disabled | error`. `text` es texto plano, maximo 1000 caracteres, vacio
  salvo `status === 'ok'`.
- `pcmToWav` -> WAV PCM16 mono 16 kHz y marca `silent` por RMS.

## Errores posibles

- `Audio demasiado corto.` / `Segmento de audio invalido.`
- `Audio interno requiere Android 11 o posterior.` (SDK < 30)
- `Ya se esta capturando audio en este movil.`
- `No se pudo crear tunel de audio.` / `No responde el tunel de audio.`
- `El dispositivo no pudo iniciar audio interno.` / `El dispositivo no permite capturar este audio.`
- `Clave Groq no valida.` / `No se pudo leer configuracion Groq.`
- `Escucha detenida.` solo si el `signal` fue abortado.

`listen` nunca propaga fallos de captura, red o HTTP: los devuelve como
`status: 'error'` para que el consumidor siga trabajando solo con imagen.

## Dependencias permitidas

Este modulo puede depender de:

- `conexion_adb` (solo API publica);
- Node estandar (`node:net`, `node:crypto`, `node:fs/promises`, `node:path`, `node:timers/promises`, `fetch`, `FormData`);
- `scrcpy-server` 3.3.4 ya distribuido en `motor/`;
- API HTTP de Groq `https://api.groq.com/openai/v1/audio/transcriptions`, modelo `whisper-large-v3-turbo`.

## Dependencias prohibidas

Este modulo no debe depender de:

- implementacion interna de otros modulos;
- modulos no declarados en "Dependencias permitidas";
- binarios extra (ffmpeg, sox) ni dependencias npm nuevas;
- credenciales OAuth de `agentes_ia`.

## Garantias

Este modulo garantiza que:

- captura **solo** audio interno de reproduccion (`playback` en SDK >= 33, `output` en SDK 30-32);
  nunca usa el microfono ni `audio_source=mic`;
- usa su propio `scid`, su propio `forward` y su propio archivo remoto, de modo que no
  interfiere con la sesion de video de `sesiones_scrcpy` del mismo movil;
- libera socket, proceso, `forward` y archivo remoto `/data/local/tmp/zynerfilmer-audio-*.jar`
  en todos los caminos de salida, incluso con error o aborto;
- una sola captura simultanea por endpoint;
- el audio vive solo en memoria durante la peticion: no se escribe WAV ni PCM en disco;
- la clave se lee de `<dataDir>/secrets/groq-api-key` (directorio `0o700`, archivo `0o600`)
  o de `GROQ_API_KEY`, y nunca se registra, se devuelve ni se envia al panel;
- sin clave configurada responde `status: 'disabled'` sin contactar a Groq;
- `redirect: 'error'` y tiempos maximos de 20 s (HTTP) y 25 s (captura) acotan cada llamada;
- la transcripcion es **contenido no confiable**: se entrega como dato, nunca como instruccion.

## Prohibiciones

Este modulo no debe:

- modificar otros modulos;
- acceder a datos ajenos sin pasar por su contrato;
- tocar la pantalla, el volumen ni el estado del telefono;
- interpretar la transcripcion ni tomar decisiones de producto;
- romper compatibilidad sin una decision registrada.

## Cambios de contrato

Cualquier cambio en este archivo debe:

1. escalar a `ARCHITECT_AGENT`;
2. registrarse en `docs/DECISIONS.md` (`repo_agent.py log-decision`);
3. registrar el impacto en `docs/CHANGELOG_AGENT.md` (`repo_agent.py log-change`).
