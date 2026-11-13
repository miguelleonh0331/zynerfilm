# DECISIONS.md

Registro append-only de decisiones técnicas importantes.

No reescribir entradas antiguas. Agregar nuevas entradas al final con
`repo_agent.py log-decision`.

## Formato

### ADR-0001 - Título de la decisión

Fecha: YYYY-MM-DD

Estado: propuesta | aceptada | reemplazada | descartada

Contexto:
Explicar el problema o situación.

Decisión:
Explicar qué se decidió.

Motivo:
Explicar por qué.

Alternativas evaluadas:
- alternativa 1

Impacto:
- módulos afectados
- contratos afectados
- riesgos

Seguimiento:
Pendientes o validaciones futuras.

### ADR-0002 - Fronteras multiagente y transición del código raíz

Fecha: 2026-11-13

Estado: aceptada

Contexto:
Versión 0.1 en Program.cs y Engine.cs; usuario solicita agentes por función con permisos.

Decisión:
Cuatro módulos y agentes dedicados; arquitecto custodia raíz; permiso escrito entre propietarios; extracción por etapas.

Motivo:
Evitar ediciones concurrentes y documentar contratos sin afirmar una modularización inexistente.

Alternativas evaluadas:
- (ninguna registrada)

Impacto:
(pendiente)

Seguimiento:
(ninguno)

### ADR-0003 - Implementar contratos CSharp de la migracion inicial

Fecha: 2026-11-13

Estado: aceptada

Contexto:
Desarrollo autorizado por el usuario; una sola sesion migra los cuatro modulos.

Decisión:
Contratos publicos en api, implementaciones internas en services y composicion solo en Program.cs. Reutilizar procesos sin shell; conservar catalogo existente.

Motivo:
Separar responsabilidades y permitir especialistas sin compartir archivos de implementacion.

Alternativas evaluadas:
- (ninguna registrada)

Impacto:
(pendiente)

Seguimiento:
(ninguno)

### ADR-0004 - Panel web y Electron con backend headless

Fecha: 2026-11-13

Estado: aceptada

Contexto:
Usuario confirma VPN y autoriza migracion y telefono de prueba.

Decisión:
Node.js con HTTP/WebSocket, panel HTML/JS compartido con Electron y servidor Android scrcpy 3.3.4; video H264 WebCodecs y control binario. Mantener C# 0.2.

Motivo:
Permitir control real dentro del navegador y backend Linux sin escritorio ni scrcpy.exe de Windows.

Alternativas evaluadas:
- (ninguna registrada)

Impacto:
(pendiente)

Seguimiento:
(ninguno)

### ADR-0005 - Cuadricula de miniaturas con ampliacion reutilizando sesion

Fecha: 2026-11-13

Estado: aceptada

Contexto:
Usuario solicita sidebar y pantallas mini ampliables como referencia.

Decisión:
Panel mantiene una conexion y decoder por equipo. Sidebar para altas/listado; dialog reutiliza canvas existente. Solo vista ampliada envia controles; volver mantiene miniatura.

Motivo:
Evitar reconexiones, conservar vistas simultaneas y no confundir click de ampliacion con toque remoto.

Alternativas evaluadas:
- (ninguna registrada)

Impacto:
(pendiente)

Seguimiento:
(ninguno)

### ADR-0006 - SQLite y borrado de dispositivos con popup y menu

Fecha: 2026-11-13

Estado: aceptada

Contexto:
Usuario solicita SQLite, eliminar equipo y preparar GitHub/VPS.

Decisión:
Usar node:sqlite de Node 24/Electron, transacciones y migracion JSON unica; API DELETE autenticada; popup alta y dropdown accesible. Preparar export limpio sin publicar ni desplegar.

Motivo:
Persistir dispositivos sin bibliotecas nativas extra y preservar catalogo e historial Git.

Alternativas evaluadas:
- (ninguna registrada)

Impacto:
(pendiente)

Seguimiento:
(ninguno)

### ADR-0007 - AI-006: OAuth propio y un hilo independiente por movil

Fecha: 2026-11-13

Estado: aceptada

Contexto:
Usuario autoriza Configuracion OAuth y agente independiente por movil usando como referencia el gestor local

Decisión:
Codex app-server con device-code, CODEX_HOME exclusivo y SQLite propio por endpoint. Panel/web_backend consumen contrato publico agentes_ia. Electron abre enlace oficial.

Motivo:
Compatible con VPS y evita mezclar credenciales o conversaciones entre moviles

Alternativas evaluadas:
- (ninguna registrada)

Impacto:
Nuevo modulo y dependencia de produccion; contratos panel/web_backend/desktop ampliados. Sin automatizacion TikTok en esta fase.

Seguimiento:
(ninguno)

### ADR-0008 - BOT-007: modelos por agente y controlador TikTok acotado

Fecha: 2026-11-13

Estado: aceptada

Contexto:
Usuario solicita bot TikTok con modelo/esfuerzo elegibles y destino GitHub futuro

Decisión:
Catalogo model/list y esfuerzo validado por endpoint; inferencia visual JSON con cancelacion. Nuevo bot_tiktok controla captura, like verificable y swipe fijos via ADB. Exclusividad frente a control manual. Limites finitos y likes opt-in.

Motivo:
Reutiliza OAuth y hilos aislados sin exponer comandos o coordenadas al modelo; compatible con VPS

Alternativas evaluadas:
- (ninguna registrada)

Impacto:
Amplia contratos agentes_ia/panel/web_backend/conexion_adb/sesiones_scrcpy y composicion. Guarda origin sin publicar. Observacion mediante capturas, no audio/video completo.

Seguimiento:
(ninguno)

### ADR-0009 - BOT-008: control visible, tiempo aleatorio y bloqueo final

Fecha: 2026-11-13

Estado: aceptada

Contexto:
Usuario solicita inicio en dropdown, marca/modelo verde activo y bloqueo al terminar; tiempo de visualizacion aleatorio +/-3s

Decisión:
Opciones persistidas con configure; start por endpoint desde dropdown y polling ligero global. Reloj monotono descuenta analisis. SLEEP 223 tras completar, sin POWER toggle ni bloqueo en cancelacion/error.

Motivo:
Permite observar pantalla mientras tarea corre y evita sumar la espera completa tras inferencia o encender una pantalla apagada

Alternativas evaluadas:
- (ninguna registrada)

Impacto:
Contratos panel/bot_tiktok/web_backend ampliados; base30 produce objetivo27-33. Inferencia superior al objetivo se registra sin espera extra.

Seguimiento:
(ninguno)
