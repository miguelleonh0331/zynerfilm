# CONTRACT.md - equipos
## Responsabilidad contractual
Persistir dispositivos en SQLite y conservar el catalogo JSON durante su migracion.
## Version
0.4; requiere Node 24 o Electron con node:sqlite.
## Entradas publicas
createEquipmentStore(path, {legacyPath?, validateEndpoint?}) devuelve:
list() -> endpoints; all() -> registros con id, endpoint, model, createdAt, updatedAt;
add(endpoint validado, model?); remove(endpoint) -> boolean; backup(destination nuevo); close().
Composicion inyecta validacion IP/puerto desde conexion_adb para importar el JSON.
## Salidas publicas
Tabla devices con endpoint unico y fechas UTC; tabla migrations; esquema user_version=1.
Importacion JSON una sola vez y transaccional. Mantiene archivo original y no reimporta eliminados.
Peticiones parametrizadas, WAL y timeout de bloqueo 5s. Backup consistente sin sobrescribir destinos existentes.
## Dependencias permitidas
- Ninguna dependencia de otros modulos.
## Errores posibles
JSON invalido, SQLite corrupto/version futura, errores de acceso y bloqueo se comunican; no se borran datos para recuperarse.
## Garantias
Close libera conexion. Nueva instalacion crea esquema sin dispositivos. Datos, WAL, claves y backups no se versionan.
La alternativa C# mantiene su JSON independiente; no sincroniza con SQLite.
## Prohibiciones
No ejecutar ADB ni guardar credenciales, capturas o datos internos del telefono.
No importar implementaciones ajenas ni modificar otro modulo sin permiso.
## Cambios de contrato
Escalar al arquitecto y registrar decision, consumidores y pruebas.
