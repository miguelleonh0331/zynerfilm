# equipos
Almacena dispositivos en zynerfilmer.sqlite mediante node:sqlite, sin dependencias nativas adicionales.
API en api/index.mjs: list/all, add, remove, backup y close.
Persiste endpoint, modelo, identificador y fechas. Version de esquema 1.
Migra equipos.json una vez y lo conserva intacto. La eliminacion no se revierte por una nueva importacion.
Propietario: equipos_AGENT; solo src/features/equipos/**.
Pruebas: npm test valida migracion, duplicados, parametros, persistencia, backup, eliminacion y JSON invalido.
