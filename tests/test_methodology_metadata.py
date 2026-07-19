import json
import unittest
from pathlib import Path

from scripts.build_dashboard_data import build_dashboard_data, methodology_version


class MethodologyMetadataTests(unittest.TestCase):
    def test_snapshot_change_does_not_change_methodology_version(self):
        first = build_dashboard_data("2026-07-16")
        second = build_dashboard_data("2026-07-17")
        expected = methodology_version()
        self.assertEqual(first["meta"]["methodologyVersion"], expected)
        self.assertEqual(second["meta"]["methodologyVersion"], expected)
        self.assertEqual(first["dataQuality"]["methodologyVersion"], expected)
        self.assertEqual(second["dataQuality"]["methodologyVersion"], expected)

    def test_audit_output_uses_aggregate_methodology_version(self):
        payload = build_dashboard_data("2026-07-16")
        report = {
            "methodologyVersion": payload["meta"]["methodologyVersion"],
            "aggregateVersion": payload["meta"]["version"],
            "snapshotDate": payload["meta"]["snapshotDate"],
        }
        Path("test-results").mkdir(exist_ok=True)
        Path("test-results/data-meta-01-methodology-audit.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )
        self.assertEqual(report["methodologyVersion"], methodology_version())


if __name__ == "__main__":
    unittest.main()
