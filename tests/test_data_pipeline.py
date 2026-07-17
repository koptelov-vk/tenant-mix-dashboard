import unittest
from collections import defaultdict
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.build_aggregates import BRAND_ALIASES, build, canonical_brand, extract_date


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


if __name__ == "__main__":
    unittest.main()
