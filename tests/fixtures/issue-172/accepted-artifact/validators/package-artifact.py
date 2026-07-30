from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
from pathlib import Path


FIXED_ZIP_TIME = (2026, 7, 30, 0, 0, 0)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    parser.add_argument("zip_path", type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    zip_path = args.zip_path.resolve()
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    if zip_path.exists():
        zip_path.unlink()
    files = sorted(path for path in root.rglob("*") if path.is_file())
    with zipfile.ZipFile(
        zip_path,
        "w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as archive:
        for path in files:
            relative = Path(root.name) / path.relative_to(root)
            info = zipfile.ZipInfo(relative.as_posix(), FIXED_ZIP_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes(), compresslevel=9)
    digest = sha256_file(zip_path)
    sidecar = zip_path.with_suffix(zip_path.suffix + ".sha256")
    sidecar.write_text(
        f"{digest}  {zip_path.name}\n",
        encoding="utf-8",
        newline="\n",
    )
    result = {
        "artifactPath": str(zip_path),
        "artifactSha256": digest,
        "fileCount": len(files),
        "sha256Sidecar": str(sidecar),
        "status": "PASS",
    }
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
