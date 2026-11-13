#!/usr/bin/env python3
"""Create deployment settings without overwriting an existing configuration."""
import argparse
import os
from pathlib import Path
import secrets
from urllib.parse import urlsplit

parser = argparse.ArgumentParser()
parser.add_argument("--origin", required=True, help="Origen HTTPS real del panel")
parser.add_argument("--output", default=".env")
args = parser.parse_args()
origin = args.origin.rstrip("/")
parsed = urlsplit(origin)
if any(char.isspace() for char in origin) or parsed.scheme != "https" or not parsed.hostname or parsed.path or parsed.query or parsed.fragment or parsed.username is not None:
    parser.error("--origin debe ser un origen HTTPS sin ruta ni credenciales")
target = Path(args.output)
payload = "\n".join([
    "HOST=0.0.0.0", "PORT=4317", "PUBLIC_ORIGIN=" + origin,
    "ZYNER_DATA_DIR=/data", "ZYNER_TOKEN=" + secrets.token_hex(32), ""
])
descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
    stream.write(payload)
print("Configuracion creada en " + str(target) + ". La clave no se imprime.")
