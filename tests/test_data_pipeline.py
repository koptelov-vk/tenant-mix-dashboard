import unittest
from collections import defaultdict
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.build_aggregates import BRAND_ALIASES, build, canonical_brand, extract_date
from scripts.build_dashboard_data import brand_match_key, clean_upcoming, normalize_upcoming_status


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
        self.assertIn("Мегафон", self.payload["brandPresence"])
        self.assertNotIn("мегафон yota", self.payload["brandPresence"])
        self.assertNotIn("Мегафон-Yota", self.payload["brandPresence"])
        pairs = [(row["mall"], row["brandNormalized"]) for row in self.payload["rows"]]
        self.assertEqual(len(pairs), len(set(pairs)))

    def test_missing_source_date_remains_missing(self):
        self.assertIsNone(extract_date("OK", "нет даты"))

    def test_category_counts_use_distinct_normalized_brands(self):
        expected = defaultdict(lambda: defaultdict(set))
        for row in self.payload["rows"]:
            expected[row["mall"]][row["category"]].add(row["brandNormalized"])
        for mall in self.payload["mallSummary"]:
            for category, count in mall["categoryCounts"].items():
                self.assertEqual(count, len(expected[mall["mall"]][category]))

    def test_upcoming_status_aliases_are_normalized(self):
        for source in ("ожидается", "ОЖИДАЕТСЯ", "планируется", "Скоро откроется", ""):
            self.assertEqual(normalize_upcoming_status(source), "Скоро открытие")

    def test_brand_matching_ignores_case_spacing_and_punctuation(self):
        self.assertEqual(brand_match_key("U.S. Polo Assn."), brand_match_key("u s polo assn"))
        self.assertEqual(brand_match_key("Мегафон / Yota"), brand_match_key("Мегафон"))

    def test_already_active_upcoming_brand_is_excluded_per_mall(self):
        payload = {
            "rows": [
                {"mall": "Тестовый ТЦ", "brand": "U.S. Polo Assn.", "brandNormalized": "U.S. Polo Assn."},
                {"mall": "Другой ТЦ", "brand": "U.S. Polo Assn.", "brandNormalized": "U.S. Polo Assn."},
            ],
            "upcoming": [
                {"mall": "Тестовый ТЦ", "brand": "u s polo assn", "status": "ожидается"},
                {"mall": "Третий ТЦ", "brand": "U.S. Polo Assn.", "status": "ожидается"},
            ],
            "dataQuality": {},
        }
        result = clean_upcoming(payload)
        self.assertEqual(len(result["upcoming"]), 1)
        self.assertEqual(result["upcoming"][0]["mall"], "Третий ТЦ")
        self.assertEqual(result["upcoming"][0]["status"], "Скоро открытие")
        self.assertEqual(result["dataQuality"]["upcoming"]["sourceRows"], 2)
        self.assertEqual(result["dataQuality"]["upcoming"]["excludedAlreadyOpen"], 1)
        self.assertEqual(result["dataQuality"]["upcoming"]["normalizedStatuses"], 2)
        self.assertEqual(result["upcomingAudit"]["excludedAlreadyOpen"][0]["reason"], "already-active-in-mall")

    def test_real_upcoming_output_contains_no_active_mall_brand_pairs(self):
        result = clean_upcoming(build())
        active = {(row["mall"], brand_match_key(row["brandNormalized"])) for row in result["rows"]}
        overlap = {
            (item["mall"], brand_match_key(item["brand"]))
            for item in result["upcoming"]
            if brand_match_key(item["brand"])
        } & active
        self.assertEqual(overlap, set())
        self.assertTrue(all(item["status"] == "Скоро открытие" for item in result["upcoming"]))


if __name__ == "__main__":
    unittest.main()
