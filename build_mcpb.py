"""Build the MCPB package for google-ai-mcp."""

import json
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
MANIFEST = ROOT / "manifest.json"
SERVER_DIR = ROOT / "src" / "google_ai_mcp"
ASSETS_DIR = ROOT / "assets"

INCLUDE_EXTS = {".py", ".md", ".txt", ".json", ".toml", ".png", ".svg", ".ico"}
EXCLUDE_DIRS = {"__pycache__", ".git", ".venv", "node_modules"}


def build() -> str:
    DIST.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    version = manifest.get("version", "0.1.0")
    out_path = DIST / f"google-ai-mcp-v{version}.mcpb"

    with tarfile.open(out_path, "w:gz") as tar:
        tar.add(MANIFEST, arcname="manifest.json")

        for f in SERVER_DIR.rglob("*"):
            if f.is_dir() and f.name in EXCLUDE_DIRS:
                continue
            if f.is_file() and f.suffix in INCLUDE_EXTS:
                tar.add(f, arcname=f.relative_to(ROOT).as_posix())

        readme = ROOT / "README.md"
        if readme.exists():
            tar.add(readme, arcname="README.md")

        if ASSETS_DIR.exists():
            for f in ASSETS_DIR.rglob("*"):
                if f.is_file() and f.suffix in INCLUDE_EXTS:
                    tar.add(f, arcname=f.relative_to(ROOT).as_posix())

    size = out_path.stat().st_size
    print(f"Built {out_path.name} ({size / 1024:.0f} KB)")
    print(f"  Server: google-ai-mcp v{version}")
    print(f"  Tools:  {len(manifest.get('tools', []))}")
    return str(out_path)


if __name__ == "__main__":
    build()
