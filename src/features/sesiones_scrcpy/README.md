# sesiones_scrcpy
## Responsabilidad
Video H264 y control de sesiones scrcpy propias para el panel web.
## Estado
Implementado para Zynerfilmer 0.3. Los archivos C# de 0.2 se conservan como alternativa y no se usan en Electron.
## API
index.mjs exporta createSessions({adb, serverPath}): attach(endpoint, ws), has(endpoint), close(endpoint), closeAll(). VideoParser y controlMessage documentan el protocolo 3.3.4 para pruebas.
## Propietario
agents/sesiones_scrcpy_AGENT.md. Editar solo src/features/sesiones_scrcpy/** despues de reservar.
## Verificacion
npm test desde raiz; prueba de video real documentada en docs/VERIFICATION.md.
Para cambios de contratos o de otros modulos: solicitar permiso escrito al arquitecto y propietario.
