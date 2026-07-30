from __future__ import annotations

import json
import sys

sys.dont_write_bytecode = True

from common import ROOT, load, sha256_file


def main() -> int:
    manifest = load(ROOT / "manifest.json")
    excluded = set(manifest["integrityExclusions"])
    expected = manifest["fileSha256"]
    actual_files = sorted(
        path.relative_to(ROOT).as_posix()
        for path in ROOT.rglob("*")
        if path.is_file()
    )
    integrity_files = [path for path in actual_files if path not in excluded]
    errors = []
    missing = sorted(set(expected) - set(integrity_files))
    extra = sorted(set(integrity_files) - set(expected))
    checksum_mismatches = sorted(
        relative
        for relative in set(expected) & set(integrity_files)
        if sha256_file(ROOT / relative) != expected[relative]
    )
    zero_length = sorted(
        relative
        for relative in actual_files
        if (ROOT / relative).stat().st_size == 0
    )
    sums = {}
    for line in (ROOT / "SHA256SUMS").read_text(encoding="utf-8").splitlines():
        if line.strip():
            value, relative = line.split("  ", 1)
            sums[relative] = value
    if sums != expected:
        errors.append("SHA256SUMS_MISMATCH")
    if missing:
        errors.append("MISSING_FILES")
    if extra:
        errors.append("EXTRA_FILES")
    if checksum_mismatches:
        errors.append("CHECKSUM_MISMATCH")
    if zero_length:
        errors.append("ZERO_LENGTH_FILES")
    if manifest["fileCount"] != len(actual_files):
        errors.append("FILE_COUNT_MISMATCH")
    if manifest["integrityFileCount"] != len(integrity_files):
        errors.append("INTEGRITY_FILE_COUNT_MISMATCH")
    result = {
        "fileCount": len(actual_files),
        "integrityFileCount": len(integrity_files),
        "missingFiles": missing,
        "extraFiles": extra,
        "checksumMismatches": checksum_mismatches,
        "zeroLengthFiles": zero_length,
        "errors": errors,
        "status": "PASS" if not errors else "FAIL",
    }
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
