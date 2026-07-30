from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True

from common import ROOT, load


def main() -> int:
    report_path = ROOT / "validation-report.json"
    report_path.write_text(
        json.dumps({"status": "RUNNING"}, indent=2) + "\n",
        encoding="utf-8",
    )
    commands = [
        "validate-schema.py",
        "validate-fixtures.py",
        "validate-semantics.py",
        "validate-checksums.py",
    ]
    results = []
    for command in commands:
        completed = subprocess.run(
            [sys.executable, str(ROOT / "validators" / command)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )
        stdout = completed.stdout.strip()
        parsed = json.loads(stdout) if stdout else {}
        results.append(
            {
                "command": f"python validators/{command}",
                "exitCode": completed.returncode,
                "result": parsed,
                "stderr": completed.stderr.strip(),
            }
        )

    manifest = load(ROOT / "manifest.json")
    lifecycle_required = {
        "ARTIFACT_TASK_AUTHORIZED",
        "PRODUCTION_IMPLEMENTATION_NOT_AUTHORIZED",
        "MERGE_NOT_AUTHORIZED",
        "DEPLOYMENT_NOT_AUTHORIZED",
        "ISSUE_CLOSURE_NOT_AUTHORIZED",
    }
    lifecycle_ok = lifecycle_required.issubset(set(manifest["lifecycle"]))
    all_passed = all(result["exitCode"] == 0 for result in results)
    report = {
        "artifact": manifest["artifactName"],
        "artifactVersion": manifest["artifactVersion"],
        "baselineSha": manifest["productionBaselineSha"],
        "commands": results,
        "fixtureCount": manifest["fixtureCount"],
        "positiveFixtureCount": manifest["positiveFixtureCount"],
        "negativeFixtureCount": manifest["negativeFixtureCount"],
        "schemaCount": manifest["schemaCount"],
        "lifecycleGate": "PASS" if lifecycle_ok else "FAIL",
        "productionImplementationEvidenceAvailable": False,
        "status": "PASS" if all_passed and lifecycle_ok else "FAIL",
    }
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
