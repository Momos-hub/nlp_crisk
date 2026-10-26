"""Package the prebuilt static site into an upload-ready folder and root ZIP."""
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "frontend" / "dist"
DEST = ROOT / "deployment" / "CLAUSERISK-STATIC-HOST"
ARCHIVE = ROOT / "deployment" / "CLAUSERISK-STATIC-HOST.zip"

if not (DIST / "index.html").is_file():
    raise SystemExit("Missing frontend/dist/index.html. Run `cd frontend && npm run build:static` first.")

if DEST.exists():
    shutil.rmtree(DEST)
shutil.copytree(DIST, DEST)
if ARCHIVE.exists():
    ARCHIVE.unlink()
with zipfile.ZipFile(ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for path in sorted(DEST.rglob("*")):
        if path.is_file():
            # Root entries are exactly what Netlify Drop/Vercel static publish need.
            zf.write(path, path.relative_to(DEST))

# Remove older, ambiguously named packages so there is one obvious upload target.
for old in (ROOT / "deployment" / "static-upload", ROOT / "deployment" / "static-upload.zip"):
    if old.is_dir():
        shutil.rmtree(old)
    elif old.exists():
        old.unlink()

files = [p for p in DEST.rglob("*") if p.is_file()]
print(f"Upload folder: {DEST.relative_to(ROOT)} ({len(files)} files)")
print(f"ZIP archive:   {ARCHIVE.relative_to(ROOT)} ({ARCHIVE.stat().st_size:,} bytes)")
print("Unzip the archive; index.html is at the extracted folder root. For Netlify Drop, drag that extracted folder.")
