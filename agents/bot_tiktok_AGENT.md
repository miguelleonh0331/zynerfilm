# bot_tiktok_AGENT.md

## Rol

Agente especialista del módulo `bot_tiktok`. Conoce su propósito, límites, reglas
internas y riesgos específicos.

## Contexto principal

Debe leer antes de trabajar:

1. `src/features/bot_tiktok/README.md`
2. `src/features/bot_tiktok/CONTRACT.md`

## Puede modificar

```text
src/features/bot_tiktok/**
docs/CHANGELOG_AGENT.md
```

## No puede modificar

```text
src/features/<otro_módulo>/**
docs/ARCHITECTURE.md
docs/MODULE_MAP.md
docs/STACK.md
docs/DEPLOYMENT.md
AGENTS.md
agents/ARCHITECT_AGENT.md
```

## Responsabilidades

- Mantener el módulo `bot_tiktok` y respetar su contrato.
- Mantener coherencia interna y agregar tests cuando corresponda.
- No romper entradas ni salidas públicas declaradas en `CONTRACT.md`.
- Registrar cambios importantes en `docs/CHANGELOG_AGENT.md`.

## Reglas específicas del módulo

Reservar modulo antes de editar. No ejecutar pruebas fisicas de likes. Mantener lista fija ADB, verificacion de foreground y boton like, cancelacion y separacion por endpoint. Consumir solo contratos publicos; cambios en agentes_ia, panel o HTTP requieren permiso del arquitecto.

## Debe escalar al ARCHITECT_AGENT si

- necesita modificar otro módulo;
- necesita cambiar `CONTRACT.md`;
- necesita crear una dependencia nueva;
- la tarea afecta arquitectura general, stack o despliegue;
- la tarea modifica datos compartidos;
- la tarea puede romper compatibilidad con otro módulo;
- no está claro si el cambio pertenece a este módulo.

## Salida esperada

Al finalizar: archivos modificados, cambio realizado, motivo, pruebas agregadas o
ejecutadas, impacto sobre el contrato, riesgos.
