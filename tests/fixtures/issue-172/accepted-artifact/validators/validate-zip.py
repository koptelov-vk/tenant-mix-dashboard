from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("zip_path", type=Path)
    parser.add_argument("report_path", type=Path)
    args = parser.parse_args()
    zip_path = args.zip_path.resolve()
    errors = []
    with zipfile.ZipFile(zip_path) as archive:
        infos = archive.infolist()
        names = [info.filename for info in infos]
        if len(names) != len(set(names)):
            errors.append("DUPLICATE_ZIP_ENTRIES")
        if archive.testzip() is not None:
            errors.append("ZIP_CRC_FAILURE")
        for info in infos:
            pure = PurePosixPath(info.filename)
            if pure.is_absolute() or ".." in pure.parts:
                errors.append("ZIP_PATH_TRAVERSAL")
            if not info.is_dir() and info.file_size == 0:
                errors.append("ZIP_ZERO_LENGTH_FILE")
        roots = {PurePosixPath(name).parts[0] for name in names if name}
        if len(roots) != 1:
            errors.append("ZIP_ROOT_COUNT")
        with tempfile.TemporaryDirectory(prefix="issue-172-zip-verify-") as temp:
            archive.extractall(temp)
            extracted_root = Path(temp) / next(iter(roots))
            completed = subprocess.run(
                [
                    sys.executable,
                    str(extracted_root / "validators" / "validate-package.py"),
                ],
                cwd=extracted_root,
                capture_output=True,
                text=True,
                encoding="utf-8",
            )
            package_result = (
                json.loads(completed.stdout.strip())
                if completed.stdout.strip()
                else {}
            )
            if completed.returncode != 0:
                errors.append("EXTRACTED_PACKAGE_VALIDATION_FAILURE")
    digest = sha256_file(zip_path)
    report = {
        "artifactFilename": zip_path.name,
        "artifactPath": str(zip_path),
        "artifactSha256": digest,
        "checksumGate": "PASS" if not errors else "FAIL",
        "fileCount": len(infos),
        "packageValidation": package_result,
        "schemaCount": package_result.get("schemaCount"),
        "fixtureCount": package_result.get("fixtureCount"),
        "positiveFixtureCount": package_result.get("positiveFixtureCount"),
        "negativeFixtureCount": package_result.get("negativeFixtureCount"),
        "zipIntegrity": "PASS" if not errors else "FAIL",
        "errors": errors,
        "status": "PASS" if not errors else "FAIL",
    }
    args.report_path.resolve().write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
