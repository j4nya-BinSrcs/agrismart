"""
CLI script to validate PlantVillage training dataset readiness for AgriSmart AI.
Usage:
    python -m ml_service.validate_data --data-dir ml_service/data/plantvillage
"""

import argparse
import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml_service.config import config
from ml_service.training.dataset import validate_dataset_structure


def main():
    parser = argparse.ArgumentParser(description="Validate dataset readiness for AgriSmart AI")
    parser.add_argument(
        "--data-dir",
        type=str,
        default=str(config.plantvillage_dir),
        help="Path to PlantVillage dataset directory",
    )
    parser.add_argument(
        "--verify-images",
        action="store_true",
        help="Perform deep PIL integrity check on all image files",
    )
    args = parser.parse_args()

    data_path = Path(args.data_dir)

    print(f"\n========================================================")
    print(f"  AgriSmart AI — Dataset Readiness Validator")
    print(f"========================================================\n")
    print(f"Target Directory: {data_path.resolve()}\n")

    report = validate_dataset_structure(data_path, verify_images=args.verify_images)

    if not report.is_present:
        print("[-] STATUS: DATASET DIRECTORY MISSING")
        for issue in report.issues:
            print(f"    ! {issue}")
        print("\n[ACTION REQUIRED]:")
        for sug in report.suggestions:
            print(f"    * {sug}")
        print("\nNote: Refer to ml_service/README.md for dataset placement instructions.\n")
        sys.exit(0)

    print(f"[+] STATUS: DATASET DIRECTORY FOUND\n")
    print(f"  - Total Classes Discovered: {report.num_classes}")
    print(f"  - Total Valid Images      : {report.total_images}")
    if report.corrupt_images > 0:
        print(f"  - Corrupt Images Detected : {report.corrupt_images}")

    if report.has_explicit_splits:
        print(f"  - Structure               : Explicit subdirectories")
        print(f"    * Train Split           : {report.train_count} images")
        print(f"    * Validation Split      : {report.val_count} images")
        if report.internal_test_count > 0:
            print(f"    * Internal Test Split   : {report.internal_test_count} images (PlantVillage internal debug)")
    else:
        val_pct = int(config.val_split_ratio * 100)
        train_pct = 100 - val_pct
        print(f"  - Structure               : Flat class directories")
        print(f"    * Partition Strategy    : Deterministic {train_pct}% Train / {val_pct}% Validation (Seed: {config.seed})")

    print("\n[PER-CLASS DISTRIBUTION]:")
    for cls_name, count in report.class_distribution.items():
        print(f"  - {cls_name:<35}: {count:>5} images")

    if report.is_ready_for_training:
        print("\n[✓] SUCCESS: Dataset is valid and ready for training!")
    else:
        print("\n[!] WARNING: Dataset structure has issues:")
        for issue in report.issues:
            print(f"    - {issue}")


if __name__ == "__main__":
    main()