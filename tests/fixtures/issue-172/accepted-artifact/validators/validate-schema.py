from __future__ import annotations

import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True

from jsonschema import Draft202012Validator

from common import ROOT, load


def main() -> int:
    schemas = {
        path.name: load(path)
        for path in sorted((ROOT / "schemas").glob("*.json"))
    }
    errors = []
    for name, schema in schemas.items():
        try:
            Draft202012Validator.check_schema(schema)
        except Exception as exc:
            errors.append(f"{name}: invalid schema: {exc}")

    envelope = Draft202012Validator(schemas["fixture-envelope.schema.json"])
    canonical = Draft202012Validator(
        schemas["canonical-comparison-state.schema.json"]
    )
    projection = Draft202012Validator(schemas["display-projection.schema.json"])
    export_projection = Draft202012Validator(
        schemas["export-projection.schema.json"]
    )
    negative = Draft202012Validator(schemas["negative-fixture.schema.json"])

    positive_count = 0
    for path in sorted((ROOT / "fixtures" / "positive").glob("*.json")):
        positive_count += 1
        fixture = load(path)
        for label, validator, value in (
            ("envelope", envelope, fixture),
            ("canonical", canonical, fixture.get("canonicalPayload")),
            ("projection", projection, fixture.get("expectedProjection")),
            ("export", export_projection, fixture.get("expectedExportProjection")),
            (
                "export.projection",
                projection,
                fixture.get("expectedExportProjection", {}).get("projection"),
            ),
        ):
            for error in validator.iter_errors(value):
                errors.append(
                    f"{path.name}:{label}:{'/'.join(map(str, error.path))}:"
                    f"{error.message}"
                )

    negative_count = 0
    for path in sorted((ROOT / "fixtures" / "negative").glob("*.json")):
        negative_count += 1
        fixture = load(path)
        for error in negative.iter_errors(fixture):
            errors.append(
                f"{path.name}:negative:{'/'.join(map(str, error.path))}:"
                f"{error.message}"
            )

    result = {
        "schemaCount": len(schemas),
        "positiveFixtureSchemasPassed": positive_count,
        "negativeFixtureWrapperSchemasPassed": negative_count,
        "errors": errors,
        "status": "PASS" if not errors else "FAIL",
    }
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
