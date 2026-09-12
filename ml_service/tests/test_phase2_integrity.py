"""
Unit tests for ML service dataset separation, evaluation metadata, and training guards.
Does not require downloading datasets or GPU execution.
"""

import os
import shutil
import tempfile
import unittest
from pathlib import Path

from ml_service.config import config, get_project_root, get_ml_service_dir
from ml_service.detector import AgriSmartDetector
from ml_service.training.dataset import (
    discover_classes,
    validate_dataset_structure,
)
from ml_service.training.train import prepare_data_splits
from ml_service.training.evaluate import DATASET_TYPE_CHOICES


class TestMLServiceIntegrity(unittest.TestCase):

    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_dynamic_class_discovery(self):
        """Verifies classes are dynamically discovered alphabetically without hardcoding."""
        c1 = self.temp_dir / "Tomato___Early_blight"
        c2 = self.temp_dir / "Tomato___Late_blight"
        c3 = self.temp_dir / "Tomato___healthy"
        c1.mkdir()
        c2.mkdir()
        c3.mkdir()

        (c1 / "leaf1.jpg").write_bytes(b"dummy")
        (c2 / "leaf2.png").write_bytes(b"dummy")
        (c3 / "leaf3.jpeg").write_bytes(b"dummy")

        classes = discover_classes(self.temp_dir)
        self.assertEqual(
            classes,
            ["Tomato___Early_blight", "Tomato___Late_blight", "Tomato___healthy"],
        )

        report = validate_dataset_structure(self.temp_dir)
        self.assertTrue(report.is_ready_for_training)
        self.assertEqual(report.total_images, 3)
        self.assertEqual(report.num_classes, 3)

    def test_strict_field_test_separation(self):
        """Confirms that prepare_data_splits strictly rejects field_test directories."""
        field_test_path = self.temp_dir / "field_test"
        field_test_path.mkdir()
        (field_test_path / "Tomato___Early_blight").mkdir()
        (field_test_path / "Tomato___Early_blight" / "img.jpg").write_bytes(b"dummy")

        with self.assertRaises(ValueError) as ctx:
            prepare_data_splits(field_test_path)
        self.assertIn("held-out field test set", str(ctx.exception).lower())

        report = validate_dataset_structure(field_test_path)
        self.assertFalse(report.is_ready_for_training)
        self.assertTrue(any("field test" in issue.lower() for issue in report.issues))

    def test_internal_test_cannot_be_trained_on(self):
        """Confirms that internal_test directory is rejected as a training root."""
        internal_test_path = self.temp_dir / "internal_test"
        internal_test_path.mkdir()
        (internal_test_path / "Tomato___Early_blight").mkdir()
        (internal_test_path / "Tomato___Early_blight" / "img.jpg").write_bytes(b"dummy")

        with self.assertRaises(ValueError) as ctx:
            prepare_data_splits(internal_test_path)
        self.assertIn("internal test", str(ctx.exception).lower())

    def test_evaluation_dataset_type_mappings(self):
        """Verifies evaluation type labels map to distinct explicit categories."""
        self.assertEqual(DATASET_TYPE_CHOICES["validation"], "plantvillage_validation")
        self.assertEqual(DATASET_TYPE_CHOICES["internal_test"], "plantvillage_internal_test")
        self.assertEqual(DATASET_TYPE_CHOICES["field_test"], "sih_held_out_field_test")

    def test_detector_refuses_prediction_without_checkpoint(self):
        """Verifies detector raises RuntimeError if weights are not loaded (no fake predictions)."""
        non_existent_ckpt = self.temp_dir / "non_existent_weights.pth"
        detector = AgriSmartDetector(checkpoint_path=non_existent_ckpt)
        self.assertIsNone(detector.model)

        with self.assertRaises(RuntimeError) as ctx:
            from PIL import Image
            dummy_img = Image.new("RGB", (224, 224), color="green")
            detector.predict_image(dummy_img)
        self.assertIn("ML Model weights not loaded", str(ctx.exception))

    def test_deterministic_split_distribution(self):
        """Verifies dataset splitting is deterministic with a fixed seed."""
        c1 = self.temp_dir / "ClassA"
        c2 = self.temp_dir / "ClassB"
        c1.mkdir()
        c2.mkdir()

        for i in range(10):
            (c1 / f"img_{i}.jpg").write_bytes(b"dummy")
            (c2 / f"img_{i}.jpg").write_bytes(b"dummy")

        train_1, val_1, classes_1, _ = prepare_data_splits(self.temp_dir, val_ratio=0.15, seed=42)
        train_2, val_2, classes_2, _ = prepare_data_splits(self.temp_dir, val_ratio=0.15, seed=42)

        self.assertEqual([s[0].name for s in train_1], [s[0].name for s in train_2])
        self.assertEqual([s[0].name for s in val_1], [s[0].name for s in val_2])
        self.assertEqual(classes_1, classes_2)


if __name__ == "__main__":
    unittest.main()