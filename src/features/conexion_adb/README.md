# conexion_adb
## Responsabilidad
Validar endpoints y ejecutar ADB en Windows/Linux.
## Estado
Implementado para Zynerfilmer 0.3. Los archivos C# de 0.2 se conservan como alternativa y no se usan en Electron.
## API
index.mjs exporta endpoint(value), parseDevices(text), createAdb(executable). El objeto ADB publica list(), connect(endpoint), disconnect(endpoint), run(args, options) y spawn(args). run/spawn son exclusivos para adaptadores de sesion aprobados.
## Propietario
agents/conexion_adb_AGENT.md. Editar solo src/features/conexion_adb/** despues de reservar.
## Verificacion
npm test desde raiz; prueba de video real documentada en docs/VERIFICATION.md.
Para cambios de contratos o de otros modulos: solicitar permiso escrito al arquitecto y propietario.
