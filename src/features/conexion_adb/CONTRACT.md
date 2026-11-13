# CONTRACT.md - conexion_adb
## Responsabilidad contractual
Validar endpoints y ejecutar ADB en Windows/Linux.
## Version
0.3 JavaScript. Las APIs C# 0.2 permanecen para la alternativa clasica.
## Entradas publicas
index.mjs exporta endpoint(value), parseDevices(text), createAdb(executable). El objeto ADB publica list(), connect(endpoint), disconnect(endpoint), run(args, options) y spawn(args). run/spawn son exclusivos para adaptadores de sesion aprobados.
## Salidas publicas
Endpoint IPv4/IPv6 y puerto 1-65535. connect confirma estado device. Procesos sin shell local y plazo 15 s para comandos breves. El backend no admite argumentos ADB arbitrarios del cliente.
## Errores posibles
Errores de validacion, conexion, autorizacion, codec, timeout o sistema se comunican al consumidor; no equivalen a ausencia de equipo.
## Dependencias permitidas
- Ninguna dependencia de otros modulos.
## Dependencias prohibidas
- Implementacion interna de otro modulo.
- Dependencias externas no aprobadas por el arquitecto.
## Garantias
Endpoint IPv4/IPv6 y puerto 1-65535. connect confirma estado device. Procesos sin shell local y plazo 15 s para comandos breves. El backend no admite argumentos ADB arbitrarios del cliente.
## Prohibiciones
No guardar catalogos ni iniciar scrcpy salvo por solicitud del adaptador de sesiones; nunca kill-server.
## Cambios de contrato
Escalar al ARCHITECT_AGENT, evaluar consumidores, obtener permiso escrito y registrar decision e impacto antes de implementar. No autoaprobar invasiones.

## BOT-007
run admite encoding='buffer' para capturas binarias, limite 8MiB. Conserva timeout/signal y sin shell.
bot_tiktok es adaptador aprobado para screencap, dumpsys window, uiautomator dump y comandos input tap/swipe fijos, siempre -s endpoint.
No publica argumentos libres al frontend.
