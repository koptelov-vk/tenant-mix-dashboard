from __future__ import annotations
import hashlib
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ISSUE = "141"

def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))

def digest(value):
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(raw).hexdigest()

def median(values):
    values = sorted(values)
    if not values: return None
    m = len(values)//2
    return values[m] if len(values)%2 else (values[m-1]+values[m])/2

TOLERANCE = 1e-12

def close(a, b):
    return math.isclose(a, b, rel_tol=1e-12, abs_tol=TOLERANCE)

def percentage_point_boundary_errors():
    if ISSUE!="141": return []
    errors=[]
    cases=[
        (0.205, 0.200, 0.5),
        (0.19995, 0.200, -0.005),
        (0.200, 0.200, 0.0),
    ]
    for focus, peer, expected in cases:
        exact_delta=focus-peer
        deviation=exact_delta*100
        if not close(exact_delta, focus-peer) or not close(deviation, expected):
            errors.append(f"sub-1 percentage-point boundary: {focus}, {peer}")
    return errors

def recompute_pipeline(pipeline):
    eligible_statuses=set(pipeline["eligibleStatuses"])
    excluded_statuses=set(pipeline["excludedStatuses"])
    aliases=pipeline["aliasRegistry"]
    normalized=[]
    for raw in pipeline["rawPresenceRows"]:
        row=dict(raw)
        row["canonicalBrand"]=aliases.get(raw["brand"],raw["brand"])
        normalized.append(row)
    eligible=[
        row for row in normalized
        if row["status"] in eligible_statuses
        and row["status"] not in excluded_statuses
        and not row.get("qualityBlocking",False)
        and not row.get("evidenceBlocking",False)
    ]
    dedup={}
    for row in eligible:
        dedup[(row["canonicalBrand"],row["categoryId"])]=row
    deduplicated=list(dedup.values())
    canonical=sorted({row["canonicalBrand"] for row in deduplicated})
    by_category={}
    for row in deduplicated:
        by_category[row["categoryId"]]=by_category.get(row["categoryId"],0)+1
    counts=[by_category[key] for key in sorted(by_category)]
    n=sum(counts)
    value=sum((count/n)**2 for count in counts) if n else None
    return normalized,deduplicated,canonical,counts,n,value

def pipeline_mismatches(pipeline, payload):
    normalized,deduplicated,canonical,counts,n,value=recompute_pipeline(pipeline)
    errors=[]
    comparisons=[
        ("normalizedRows",normalized),
        ("deduplicatedPresenceRows",deduplicated),
        ("canonicalActiveBrandSet",canonical),
        ("categoryCounts",counts),
        ("N",n),
    ]
    for field,actual in comparisons:
        if pipeline[field]!=actual: errors.append(field)
    if pipeline["expectedValue"] is None:
        if value is not None: errors.append("expectedValue")
    elif value is None or not close(pipeline["expectedValue"],value):
        errors.append("expectedValue")
    if payload["categoryCounts"]!=counts: errors.append("payload.categoryCounts")
    if payload["N"]!=n: errors.append("payload.N")
    if payload["value"] is None:
        if value is not None and payload["state"] not in ("no_data","not_applicable","quality_excluded"):
            errors.append("payload.value")
    elif value is None or not close(payload["value"],value):
        errors.append("payload.value")
    return errors

def positive_errors():
    errors=percentage_point_boundary_errors()
    for path in sorted((ROOT/"fixtures").glob("F*.json")):
        f=load(path); p=f["expectedPayload"]
        required={"fixtureId","sourceIssue","rawInput","expectedPayload","executionPhase"}
        if not required.issubset(f): errors.append(f"{path.name}: envelope")
        if ISSUE=="141":
            for key in ("payloadId","payloadVersion","categoryId","focusObjectId","peerObjectIds","count","share","quality","provenance"):
                if key not in p: errors.append(f"{path.name}: missing {key}")
            raw=f["rawInput"]; mode=raw.get("mode", "count")
            if mode=="share" and raw.get("focus") is not None and raw.get("peers"):
                med=median([x for x in raw["peers"] if x is not None]); delta=raw["focus"]-med
                if abs(p["share"]["shareExactDelta"]-delta)>1e-12: errors.append(f"{path.name}: exact delta")
                if abs(p["share"]["deviation"]-delta*100)>1e-10: errors.append(f"{path.name}: percentage points")
                if p["share"]["deviationUnit"]!="percentage_points": errors.append(f"{path.name}: share unit")
        elif ISSUE=="142":
            required_payload={"payloadId","payloadVersion","categoryId","mode","focusValue","peerMedian","deviation","deviationUnit","state","limitations","quality","provenance"}
            if not required_payload.issubset(p): errors.append(f"{path.name}: payload contract")
            if p["mode"]=="share" and p["focusValue"] is not None and p["peerMedian"] is not None:
                delta=p["focusValue"]-p["peerMedian"]
                if abs(p["shareExactDelta"]-delta)>1e-12 or abs(p["deviation"]-delta*100)>1e-10: errors.append(f"{path.name}: share scale")
                if p["deviationUnit"]!="percentage_points": errors.append(f"{path.name}: share unit")
            if p["mode"]=="count" and p["deviationUnit"]!="brands": errors.append(f"{path.name}: count unit")
            for directory in ("expected-ui-states/desktop","expected-ui-states/mobile","expected-pdf-states","expected-export-states"):
                snap=load(ROOT/directory/path.name)
                if snap["rawValues"]!=p: errors.append(f"{path.name}: raw equality {directory}")
                if snap["consumerCalculations"]!=[]: errors.append(f"{path.name}: consumer calculation {directory}")
        else:
            required_pipeline={"rawPresenceRows","aliasRegistry","eligibleStatuses","excludedStatuses","normalizedRows","deduplicatedPresenceRows","canonicalActiveBrandSet","categoryCounts","N","expectedValue","expectedState"}
            if not required_pipeline.issubset(f["rawInput"]): errors.append(f"{path.name}: population pipeline")
            if p["methodologyId"]!="tenantMix.categoryConcentration.brandCountHhi" or p["methodologyVersion"]!="1.0.0": errors.append(f"{path.name}: methodology")
            if any(p[k] is not None for k in ("comparisonPeerSet","peerMedian","differenceFromPeerMedian")): errors.append(f"{path.name}: peer fields")
            mismatches=pipeline_mismatches(f["rawInput"],p)
            if mismatches: errors.append(f"{path.name}: pipeline mismatch {','.join(mismatches)}")
            if p["N"]!=sum(p["categoryCounts"]): errors.append(f"{path.name}: N")
            computed=sum((n/p["N"])**2 for n in p["categoryCounts"]) if p["N"] else None
            if p["state"] in ("no_data","not_applicable","quality_excluded"):
                if p["value"] is not None: errors.append(f"{path.name}: null state")
            elif p["value"] is None or not (0 < p["value"] <= 1) or abs(p["value"]-computed)>1e-12:
                errors.append(f"{path.name}: HHI")
            if p["state"]=="partial_quality" and not p["limitations"]: errors.append(f"{path.name}: limitations")
    return errors

def rejects_negative(doc):
    if ISSUE=="141":
        m=doc["mutatedContract"]
        if m.get("consumerCalculations") or m.get("implementationEvidenceAvailable"):
            return True
        if m.get("deviationUnit")=="percentage_points":
            required=("focusShareExact","peerMedianShareExact","shareExactDelta","deviation")
            if not all(key in m for key in required):
                return True
            exact_delta=m["focusShareExact"]-m["peerMedianShareExact"]
            expected_deviation=exact_delta*100
            return not close(m["shareExactDelta"],exact_delta) or not close(m["deviation"],expected_deviation)
        return False
    if ISSUE=="142":
        m=doc["mutatedContract"]
        return bool(m.get("consumerCalculations") or m.get("overlayController")=="local" or m.get("deviationUnit")=="fraction")
    p=doc["mutatedPayload"]
    if any(p.get(k) is not None for k in ("comparisonPeerSet","peerMedian","differenceFromPeerMedian")):
        return True
    return bool(pipeline_mismatches(doc["mutatedPipeline"],p)) if "mutatedPipeline" in doc else False

def negative_errors():
    errors=[]
    paths=sorted((ROOT/("negative-fixtures" if ISSUE=="141" else "fixtures")).glob("N*.json"))
    for path in paths:
        if not rejects_negative(load(path)): errors.append(f"{path.name}: unexpected pass")
    return errors, len(paths)

def semantic_errors():
    errors=positive_errors()
    text=" ".join(p.read_text(encoding="utf-8") for d in ("expected-ui-states","expected-pdf-states","expected-export-states") if (ROOT/d).exists() for p in (ROOT/d).rglob("*.json"))
    if ISSUE=="126" and "peer comparison unavailable" in text.lower(): errors.append("unsupported peer user-facing text")
    return errors
