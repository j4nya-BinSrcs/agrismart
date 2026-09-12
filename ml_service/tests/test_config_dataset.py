"""
Unit tests for ML service configuration and dataset inspection logic.
Does not require PyTorch or GPU.
"""

import unittest
import tempfile
import shutil
from pathlib import Path

from ml_service.config import config, get_project_root, get_ml_service_dir
from ml_service.training.dataset import discover_classes, validate_dataset_structure


class TestConfigAndDataset(unittest.TestCase):

    def test_config_paths(self):
        project_root = get_project_root()
        ml_dir = get_ml_service_dir()

        self.assertTrue(project_root.exists())
        self.assertTrue(ml_dir.exists())
        self.assertEqual(config.architecture, "efficientnet_b0")
        self.assertEqual(config.image_size, 224)
        self.assertEqual(config.batch_size, 32)
        self.assertEqual(config.seed, 42)

    def test_empty_dataset_discovery(self):
        temp_dir = tempfile.mkdtemp()
        try:
            report = validate_dataset_structure(Path(temp_dir))
            self.assertFalse(report.is_ready_for_training)
            self.assertEqual(report.total_images, 0)
            self.assertEqual(report.num_classes, 0)
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_mock_plantvillage_discovery(self):
        temp_dir = tempfile.mkdtemp()
        try:
            cls1 = Path(temp_dir) / "Tomato___Early_blight"
            cls2 = Path(temp_dir) / "Tomato___healthy"
            cls1.mkdir()
            cls2.mkdir()

            (cls1 / "img1.jpg").write_bytes(b"dummy")
            (cls1 / "img2.png").write_bytes(b"dummy")
            (cls2 / "img3.jpeg").write_bytes(b"dummy")

            classes = discover_classes(Path(temp_dir))
            self.assertEqual(classes, ["Tomato___Early_blight", "Tomato___healthy"])

            report = validate_dataset_structure(Path(temp_dir))
            self.assertTrue(report.is_ready_for_training)
            self.assertEqual(report.total_images, 3)
            self.assertEqual(report.num_classes, 2)
            self.assertEqual(report.class_distribution["Tomato___Early_blight"], 2)
            self.assertEqual(report.class_distribution["Tomato___healthy"], 1)
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()