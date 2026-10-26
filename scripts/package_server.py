"""Create the lean, deployable app folder (no archive, docs, or developer extras)."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
DIST = FRONTEND / "dist"
DEST = ROOT.parent / "CLAUSERISK-APP"

if not (DIST / "index.html").is_file() or not (DIST / "assets").is_dir():
    raise SystemExit("Build the frontend first: `cd frontend && npm ci && npm run build`.")

if DEST.exists():
    shutil.rmtree(DEST)
(DEST / "backend").mkdir(parents=True)
(DEST / "frontend").mkdir(parents=True)
shutil.copytree(BACKEND / "app", DEST / "backend" / "app", ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
shutil.copytree(FRONTEND / "src", DEST / "frontend" / "src")
for filename in ("index.html", "vite.config.js", "package.json", "package-lock.json"):
    source = FRONTEND / filename
    if source.is_file():
        shutil.copy2(source, DEST / "frontend" / filename)
shutil.copytree(DIST, DEST / "frontend" / "dist")
shutil.copy2(BACKEND / "requirements.txt", DEST / "requirements.txt")
(DEST / "Procfile").write_text("web: sh start.sh\n", encoding="utf-8")
(DEST / "start.sh").write_text(
    "#!/usr/bin/env sh\n"
    "set -eu\n"
    "cd \"$(dirname \"$0\")\"\n"
    "PORT_VALUE=\"${PORT:-8000}\"\n"
    "if [ -n \"${SSL_CERTFILE:-}\" ] || [ -n \"${SSL_KEYFILE:-}\" ]; then\n"
    "  if [ -z \"${SSL_CERTFILE:-}\" ] || [ -z \"${SSL_KEYFILE:-}\" ]; then\n"
    "    echo 'Set both SSL_CERTFILE and SSL_KEYFILE, or leave both unset.' >&2\n"
    "    exit 2\n"
    "  fi\n"
    "  exec python -m uvicorn backend.app.main:app --host 0.0.0.0 --port \"$PORT_VALUE\" --ssl-certfile \"$SSL_CERTFILE\" --ssl-keyfile \"$SSL_KEYFILE\"\n"
    "fi\n"
    "exec python -m uvicorn backend.app.main:app --host 0.0.0.0 --port \"$PORT_VALUE\"\n",
    encoding="utf-8",
)

# Remove earlier generated delivery outputs; only the app folder is provided.
old_deployment = ROOT / "deployment"
if old_deployment.exists():
    shutil.rmtree(old_deployment)

print(f"Lean application folder: {DEST}")
print("Contains FastAPI backend, React source + built UI, runtime requirements and launch config. No ZIP or README is generated.")
