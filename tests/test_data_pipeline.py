import json
import unittest
from collections import Counter, defaultdict
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.build_aggregates import BRAND_ALIASES, build, canonical_brand, extract_date
from scripts.build_dashboard_data import brand_match_key, clean_upcoming, normalize_upcoming_status
from scripts.status_semantics import canonical_status


class DataPipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload = build()

    def test_city_alias_is_removed(self):
        cities = {mall["city"] for mall in self.payload["mallSummary"]}
        self.assertNotIn("НН", cities)
        self.assertIn("Нижний Новгород", cities)

    def test_megafon_aliases_share_one_canonical_brand(self):
        for alias in BRAND_ALIASES:
            self.assertEqual(canonical_brand(alias, alias), "Мегафон")
        if self.payload["dataQuality"]["activeRows"]:
            self.assertIn("Мегафон", self.payload["brandPresence"])
        self.assertNotIn("мегафон yota", self.payload["brandPresence"])
        self.assertNotIn("Мегафон-Yota", self.payload["brandPresence"])
        pairs = [(row["mall"], row["brandNormalized"]) for row in self.payload["rows"]]
        self.assertEqual(len(pairs), len(set(pairs)))

    def test_missing_source_date_remains_missing(self):
        self.assertIsNone(extract_date("OK", "нет даты"))

    def test_category_counts_use_distinct_active_normalized_brands(self):
        expected = defaultdict(lambda: defaultdict(set))
        for row in self.payload["rows"]:
            if row["statusNormalized"] == "active":
                expected[row["mall"]][row["category"]].add(row["brandNormalized"])
        for mall in self.payload["mallSummary"]:
            for category, count in mall["categoryCounts"].items():
                self.assertEqual(count, len(expected[mall["mall"]][category]))

    def test_missing_status_is_unknown_and_excluded_from_aggregates(self):
        self.assertEqual(canonical_status("", ""), "unknown")
        self.assertEqual(canonical_status(None, None), "unknown")
        self.assertEqual(canonical_status("", "OK"), "active")
        self.assertEqual(
            self.payload["dataQuality"]["excludedFromActiveAggregates"],
            self.payload["dataQuality"]["rows"] - self.payload["dataQuality"]["activeRows"],
        )
        active_pairs = {
            (row["mall"], row["brandNormalized"])
            for row in self.payload["rows"]
            if row["statusNormalized"] == "active"
        }
        aggregate_pairs = {
            (mall, brand)
            for brand, presence in self.payload["brandPresence"].items()
            for mall in presence["malls"]
        }
        self.assertEqual(aggregate_pairs, active_pairs)

    def test_status_coverage_audit(self):
        rows = self.payload["rows"]
        status_counts = Counter(row["statusNormalized"] for row in rows)
        field_coverage = Counter(
            "both" if row["rowStatus"] and row["confirmation"]
            else "rowStatus_only" if row["rowStatus"]
            else "confirmation_only" if row["confirmation"]
            else "neither"
            for row in rows
        )
        excluded_by_mall = Counter(row["mall"] for row in rows if row["statusNormalized"] != "active")
        excluded_by_category = Counter(row["category"] for row in rows if row["statusNormalized"] != "active")
        active_by_mall = Counter(row["mall"] for row in rows if row["statusNormalized"] == "active")
        before_by_mall = Counter(row["mall"] for row in rows)
        impact = {
            mall: {"before": before_by_mall[mall], "after": active_by_mall[mall], "delta": active_by_mall[mall] - before_by_mall[mall]}
            for mall in sorted(before_by_mall)
        }
        report = {
            "rows": len(rows),
            "fieldCoverage": dict(field_coverage),
            "statusCounts": dict(status_counts),
            "excludedByMall": dict(excluded_by_mall),
            "excludedByCategory": dict(excluded_by_category),
            "aggregateImpactByMall": impact,
        }
        print("PRODUCT_01_STATUS_AUDIT=" + json.dumps(report, ensure_ascii=False, sort_keys=True))
        self.assertEqual(status_counts["unknown"], self.payload["dataQuality"]["statusCounts"]["unknown"])
        self.assertEqual(field_coverage["neither"], self.payload["dataQuality"]["missingBothStatusFields"])

    def test_upcoming_status_aliases_are_normalized(self):
        for source in ("ожидается", "ОЖИДАЕТСЯ", "планируется", "Скоро откроется", ""):
            self.assertEqual(normalize_upcoming_status(source), "Скоро открытие")

    def test_brand_matching_ignores_case_spacing_and_punctuation(self):
        self.assertEqual(brand_match_key("U.S. Polo Assn."), brand_match_key("u s polo assn"))
        self.assertEqual(brand_match_key("Мегафон / Yota"), brand_match_key("Мегафон"))

    def test_already_active_upcoming_brand_is_excluded_per_mall(self):
        payload = {
            "rows": [
                {"mall": "Тестовый ТЦ", "brand": "U.S. Polo Assn.", "brandNormalized": "U.S. Polo Assn.", "statusNormalized": "active"},
                {"mall": "Другой ТЦ", "brand": "U.S. Polo Assn.", "brandNormalized": "U.S. Polo Assn.", "statusNormalized": "unknown"},
            ],
            "upcoming": [
                {"mall": "Тестовый ТЦ", "brand": "u s polo assn", "status": "ожидается"},
                {"mall": "Другой ТЦ", "brand": "U.S. Polo Assn.", "status": "ожидается"},
            ],
            "dataQuality": {},
        }
        result = clean_upcoming(payload)
        self.assertEqual(len(result["upcoming"]), 1)
        self.assertEqual(result["upcoming"][0]["mall"], "Другой ТЦ")
        self.assertEqual(result["upcoming"][0]["status"], "Скоро открытие")
        self.assertEqual(result["dataQuality"]["upcoming"]["sourceRows"], 2)
        self.assertEqual(result["dataQuality"]["upcoming"]["excludedAlreadyOpen"], 1)
        self.assertEqual(result["dataQuality"]["upcoming"]["normalizedStatuses"], 2)
        self.assertEqual(result["upcomingAudit"]["excludedAlreadyOpen"][0]["reason"], "already-active-in-mall")

    def test_real_upcoming_output_contains_no_active_mall_brand_pairs(self):
        result = clean_upcoming(build())
        active = {
            (row["mall"], brand_match_key(row["brandNormalized"]))
            for row in result["rows"]
            if row["statusNormalized"] == "active"
        }
        overlap = {
            (item["mall"], brand_match_key(item["brand"]))
            for item in result["upcoming"]
            if brand_match_key(item["brand"])
        } & active
        self.assertEqual(overlap, set())
        self.assertTrue(all(item["status"] == "Скоро открытие" for item in result["upcoming"]))


if __name__ == "__main__":
    unittest.main()
