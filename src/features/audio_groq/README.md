# Módulo: audio_groq

## Propósito

Darle oído al bot: captura unos segundos del audio interno que está reproduciendo el
móvil y devuelve su transcripción con Groq (`whisper-large-v3-turbo`), para que el agente
decida combinando lo que **ve** y lo que **oye** del video.

## Responsabilidad

Este módulo se encarga de:

- abrir una sesión `scrcpy` propia de solo audio (`video=false`, `control=false`) con su
  `scid`, su `forward` y su archivo remoto, sin estorbar a la vista de video;
- convertir el PCM crudo (estéreo 48 kHz) a WAV mono 16 kHz y detectar silencio por RMS;
- guardar y leer la clave de Groq en el directorio privado de datos, con permisos cerrados;
- transcribir el segmento y devolver texto plano acotado;
- degradar con elegancia: si falta clave, hay silencio o algo falla, devuelve un estado y
  deja que el consumidor siga solo con la imagen.

## No responsabilidad

Este módulo no se encarga de:

- decidir si un video es relevante, dar like, pasar video ni bloquear la pantalla;
- capturar el micrófono (nunca se usa `audio_source=mic`);
- grabar, acumular ni exportar audio: el buffer vive solo en memoria;
- mostrar nada en el panel ni exponer rutas HTTP;
- gestionar la cuenta de OpenAI o el catálogo de modelos de `agentes_ia`.

## Estructura

```text
api/        createAudioCapture, createHearing y pcmToWav
services/   reservado
models/     reservado
tests/      pruebas del módulo
```

## Dependencias principales

- `conexion_adb` (solo API pública: `endpoint`, `run`, `spawn`).
- `scrcpy-server` 3.3.4 en `motor/`.
- Node estándar y `fetch`; sin dependencias npm nuevas ni binarios extra.
- API de Groq: `POST https://api.groq.com/openai/v1/audio/transcriptions`.

## Casos principales

- **Sin clave configurada** → `listen` responde `{ status: 'disabled', text: '' }` y no
  contacta a Groq.
- **Video con voz** → `{ status: 'ok', text: '...' }` (máximo 1000 caracteres).
- **Video sin voz o mudo** → `{ status: 'silent', text: '' }`, ya sea por RMS bajo o por
  `no_speech_prob` alto en todos los segmentos.
- **Android 10 o anterior** → `{ status: 'error' }`: el audio interno requiere SDK 30+.
- **App que prohíbe captura, red caída o HTTP != 2xx** → `{ status: 'error' }` con mensaje
  legible; el bot continúa analizando solo la captura de pantalla.
- **Bot detenido durante la escucha** → lanza `Escucha detenida.` para que aborte limpio.

## Notas para agentes

Antes de modificar este módulo, leer en orden:

1. este `README.md`;
2. `CONTRACT.md`;
3. `agents/audio_groq_AGENT.md` si existe, o `agents/_DEFAULT_MODULE_AGENT.md`.

La transcripción es **texto de origen externo**: quien la consuma debe tratarla como dato
no confiable y nunca como instrucción para el modelo.
