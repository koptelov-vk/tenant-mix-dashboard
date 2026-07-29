from __future__ import annotations
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from semantic_validate import positive_errors, negative_errors, semantic_errors, percentage_point_boundary_errors

ROOT=Path(__file__).resolve().parent
ISSUE="141"

def sha(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda:f.read(1024*1024),b""): h.update(block)
    return h.hexdigest()

def main():
    manifest=json.loads((ROOT/"manifest.json").read_text(encoding="utf-8"))
    p_errors=positive_errors()
    n_errors,n_count=negative_errors()
    s_errors=semantic_errors()
    checksum_errors=[]
    for rel,expected in manifest["fileSha256"].items():
        path=ROOT/rel
        if not path.is_file() or sha(path)!=expected: checksum_errors.append(rel)
    sums={}
    for line in (ROOT/"SHA256SUMS").read_text(encoding="utf-8").splitlines():
        if line.strip():
            value,rel=line.split("  ",1); sums[rel]=value
    if sums!=manifest["fileSha256"]: checksum_errors.append("SHA256SUMS")
    actual_files=sorted(p.relative_to(ROOT).as_posix() for p in ROOT.rglob("*") if p.is_file() and p.name not in {"manifest.json","SHA256SUMS","validation-result.json"} and "__pycache__" not in p.parts)
    manifest_errors=[]
    if actual_files!=manifest["files"]: manifest_errors.append("files")
    if manifest["positiveFixtureCount"]!=len(list((ROOT/"fixtures").glob("F*.json"))): manifest_errors.append("positiveFixtureCount")
    if manifest["negativeFixtureCount"]!=n_count: manifest_errors.append("negativeFixtureCount")
    errors=sorted(set(p_errors+n_errors+s_errors))
    result={
      "package": f"#{ISSUE}", "positiveFixtures":manifest["positiveFixtureCount"],
      "positivePassed":manifest["positiveFixtureCount"]-len(set(p_errors)), "positiveFailed":len(set(p_errors)),
      "negativeFixtures":n_count, "expectedFailures":n_count-len(n_errors), "unexpectedPasses":len(n_errors),
      "schemaErrors":len(set(p_errors)), "semanticErrors":len(set(s_errors)),
      "checksumErrors":len(checksum_errors), "manifestErrors":len(manifest_errors),
      "implementationPhaseChecks":len(manifest["knownImplementationPhaseChecks"]),
      "implementationEvidenceAvailable":False,
      "statuses":["FIXTURE_SCHEMA_VALID","EXPECTED_PAYLOADS_VALID","IMMUTABLE_FIXTURE_PACKAGE_PREPARED_FOR_REVIEW","IMPLEMENTATION_EVIDENCE_NOT_AVAILABLE"],
      "errors":errors+checksum_errors+manifest_errors,
    }
    if ISSUE=="141":
        boundary_errors=percentage_point_boundary_errors()
        result["subOnePercentagePointPositiveCases"]=3
        result["subOnePercentagePointPassed"]=3-len(boundary_errors)
        result["fractionalPpMislabelCases"]=1
        result["fractionalPpMislabelRejected"]=1 if not any("N141_001" in error for error in n_errors) else 0
    if ISSUE=="126":
        result["populationPipelineChecks"]=manifest["positiveFixtureCount"]
        result["populationPipelinePassed"]=manifest["positiveFixtureCount"]-len(set(p_errors))
        result["pipelineMutationCases"]=4
        result["pipelineMutationRejected"]=4-len([error for error in n_errors if any(f"N126_00{i}" in error for i in range(4,8))])
        result["peerNullChecks"]=3
        result["peerNullPassed"]=3-len([error for error in n_errors if any(f"N126_00{i}" in error for i in range(1,4))])
    result["packageValid"]=not result["errors"]
    (ROOT/"validation-result.json").write_text(json.dumps(result,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(f"package=#{ISSUE}")
    print(f"positive_fixtures={result['positiveFixtures']} passed={result['positivePassed']} failed={result['positiveFailed']}")
    print(f"negative_fixtures={n_count} expected_failures={result['expectedFailures']} unexpected_passes={result['unexpectedPasses']}")
    if ISSUE=="141":
        print(f"sub_one_percentage_point_positive_cases=3 passed={result['subOnePercentagePointPassed']}")
        print(f"fractional_pp_mislabel_cases=1 rejected={result['fractionalPpMislabelRejected']}")
    if ISSUE=="126":
        print(f"population_pipeline_checks={result['populationPipelineChecks']} passed={result['populationPipelinePassed']} failed={result['positiveFailed']}")
        print(f"pipeline_mutation_cases=4 rejected={result['pipelineMutationRejected']}")
        print(f"peer_null_checks=3 passed={result['peerNullPassed']} failed={3-result['peerNullPassed']}")
    print(f"schema_errors={result['schemaErrors']}")
    print(f"semantic_errors={result['semanticErrors']}")
    print(f"checksum_errors={result['checksumErrors']}")
    print(f"manifest_errors={result['manifestErrors']}")
    print(f"implementation_phase_checks={result['implementationPhaseChecks']}")
    print("implementation_evidence_available=false")
    print(f"package_valid={str(result['packageValid']).lower()}")
    if result["errors"]:
        for error in result["errors"]: print(f"ERROR: {error}",file=sys.stderr)
        return 1
    return 0

if __name__=="__main__": raise SystemExit(main())
