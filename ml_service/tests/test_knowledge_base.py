"""
Unit tests for the AgriSmart ML Knowledge Base schema and integrity.
Validates structure, types, required fields, and non-corruption.
"""

import json
import unittest
from pathlib import Path

KNOWLEDGE_BASE_PATH = Path(__file__).resolve().parent.parent / "knowledge_base.json"

REQUIRED_FIELDS = {
    "disease_name",
    "pathogen_name",
    "is_healthy",
    "symptoms",
    "treatment",
    "precautions",
    "sources",
}

REQUIRED_TREATMENT_FIELDS = {"organic", "conventional", "dosage", "timing"}


class TestKnowledgeBase(unittest.TestCase):

    def setUp(self):
        self.assertTrue(
            KNOWLEDGE_BASE_PATH.exists(),
            f"knowledge_base.json not found at {KNOWLEDGE_BASE_PATH}",
        )
        with open(KNOWLEDGE_BASE_PATH, "r", encoding="utf-8") as f:
            self.data = json.load(f)

    def test_json_is_valid_dict(self):
        self.assertIsInstance(self.data, dict)
        self.assertGreater(len(self.data), 1)

    def test_metadata_fields(self):
        self.assertIn("_schema_version", self.data)
        self.assertIn("_description", self.data)

    def test_entries_conform_to_schema(self):
        for class_name, entry in self.data.items():
            if class_name.startswith("_"):
                continue

            self.assertIsInstance(
                entry, dict, f"Entry for {class_name} must be a dictionary"
            )

            # Check required top-level fields
            for field in REQUIRED_FIELDS:
                self.assertIn(
                    field,
                    entry,
                    f"Entry '{class_name}' is missing required field: '{field}'",
                )

            # Check specific field types
            self.assertIsInstance(entry["disease_name"], str, f"disease_name in {class_name} must be str")
            self.assertTrue(len(entry["disease_name"].strip()) > 0, f"disease_name in {class_name} cannot be empty")

            self.assertIsInstance(entry["pathogen_name"], str, f"pathogen_name in {class_name} must be str")
            self.assertIsInstance(entry["is_healthy"], bool, f"is_healthy in {class_name} must be bool")
            self.assertIsInstance(entry["symptoms"], list, f"symptoms in {class_name} must be a list")
            self.assertGreater(len(entry["symptoms"]), 0, f"symptoms in {class_name} must have >= 1 item")

            self.assertIsInstance(entry["precautions"], list, f"precautions in {class_name} must be a list")
            self.assertGreater(len(entry["precautions"]), 0, f"precautions in {class_name} must have >= 1 item")

            self.assertIsInstance(entry["sources"], list, f"sources in {class_name} must be a list")
            self.assertGreater(len(entry["sources"]), 0, f"sources in {class_name} must have >= 1 source")

            # Check treatment sub-object
            treatment = entry["treatment"]
            self.assertIsInstance(treatment, dict, f"treatment in {class_name} must be dict")
            for t_field in REQUIRED_TREATMENT_FIELDS:
                self.assertIn(
                    t_field,
                    treatment,
                    f"treatment in '{class_name}' missing field: '{t_field}'",
                )
                self.assertIsInstance(
                    treatment[t_field],
                    str,
                    f"treatment.{t_field} in {class_name} must be str",
                )


if __name__ == "__main__":
    unittest.main()
