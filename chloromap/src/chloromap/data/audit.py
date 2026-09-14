"""Dataset audit — integrity, statistics, and duplicate detection."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

from PIL import Image


@dataclass
class ImageAudit:
    path: str
    filename: str
    class_name: str
    status: str  # ok | corrupt | unreadable | tiny | zero_bytes | duplicate_hash
    size_bytes: int = 0
    dimensions: str = ""
    duplicate_of: Optional[str] = None


@dataclass
class AuditReport:
    root: str
    total_images: int = 0
    num_classes: int = 0
    per_class_counts: dict = field(default_factory=dict)
    min_class_size: int = 0
    max_class_size: int = 0
    class_imbalance_ratio: float = 0.0
    corrupt_images: int = 0
    zero_byte_images: int = 0
    tiny_images: int = 0  # < 32x32
    unreadable_images: int = 0
    duplicate_hashes: int = 0
    image_issues: list = field(default_factory=list)
    class_dirs_found: list = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def file_hash(path: Path, chunk_size: int = 1 << 16) -> str:
    """Deterministic content hash (blake2b/128) of an image file.

    Exact-duplicate detection: two files with the same bytes produce the
    same hash regardless of filename.
    """
    h = hashlib.blake2b(digest_size=16)
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(chunk_size), b""):
            h.update(chunk)
    return h.hexdigest()


def audit_dataset(root: str | Path, min_dimension: int = 32) -> AuditReport:
    """Audit a dataset directory for integrity and statistics.

    This function never modifies or deletes anything.
    """
    root = Path(root)
    extensions = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}

    report = AuditReport(root=str(root))

    class_dirs = sorted([d for d in root.iterdir() if d.is_dir()])
    report.class_dirs_found = [d.name for d in class_dirs]
    report.num_classes = len(class_dirs)

    hash_seen: dict[str, str] = {}

    for cd in class_dirs:
        images = [f for f in cd.iterdir() if f.is_file() and f.suffix.lower() in extensions]
        report.per_class_counts[cd.name] = len(images)

        for img_path in sorted(images):
            img = img_path.open("rb").read()
            size_bytes = len(img)
            fname = img_path.name
            rel = str(img_path.relative_to(root))

            if size_bytes == 0:
                report.zero_byte_images += 1
                report.image_issues.append(ImageAudit(
                    path=rel, filename=fname, class_name=cd.name,
                    status="zero_bytes", size_bytes=0,
                ).__dict__)
                continue

            try:
                pil = Image.open(img_path)
                w, h = pil.size
                dims = f"{w}x{h}"
            except Exception:
                report.unreadable_images += 1
                report.image_issues.append(ImageAudit(
                    path=rel, filename=fname, class_name=cd.name,
                    status="unreadable", size_bytes=size_bytes,
                ).__dict__)
                continue

            if w < min_dimension or h < min_dimension:
                report.tiny_images += 1
                report.image_issues.append(ImageAudit(
                    path=rel, filename=fname, class_name=cd.name,
                    status="tiny", size_bytes=size_bytes, dimensions=dims,
                ).__dict__)
                continue

            try:
                pil.verify()
            except Exception:
                report.corrupt_images += 1
                report.image_issues.append(ImageAudit(
                    path=rel, filename=fname, class_name=cd.name,
                    status="corrupt", size_bytes=size_bytes, dimensions=dims,
                ).__dict__)
                continue

            fh = file_hash(img_path)
            if fh in hash_seen:
                report.duplicate_hashes += 1
                report.image_issues.append(ImageAudit(
                    path=rel, filename=fname, class_name=cd.name,
                    status="duplicate_hash", size_bytes=size_bytes,
                    dimensions=dims, duplicate_of=hash_seen[fh],
                ).__dict__)
            else:
                hash_seen[fh] = rel

            report.total_images += 1

    counts = list(report.per_class_counts.values())
    if counts:
        report.min_class_size = min(counts)
        report.max_class_size = max(counts)
        report.class_imbalance_ratio = report.max_class_size / max(report.min_class_size, 1)

    return report


def print_audit(report: AuditReport) -> None:
    """Human-readable audit summary to stdout."""
    print("=" * 60)
    print("DATASET AUDIT REPORT")
    print("=" * 60)
    print(f"Root:                {report.root}")
    print(f"Total images:        {report.total_images}")
    print(f"Classes:             {report.num_classes}")
    print(f"Class range:         {report.min_class_size} — {report.max_class_size} images")
    print(f"Imbalance ratio:     {report.class_imbalance_ratio:.2f}x")
    print()
    print("--- Per-class counts ---")
    for cls, count in report.per_class_counts.items():
        print(f"  {cls:50s} {count:>5d}")
    print()
    issues = report.zero_byte_images + report.corrupt_images + report.unreadable_images + report.tiny_images + report.duplicate_hashes
    print(f"Image issues found:  {issues}")
    if report.zero_byte_images:
        print(f"  zero-byte:         {report.zero_byte_images}")
    if report.corrupt_images:
        print(f"  corrupt:           {report.corrupt_images}")
    if report.unreadable_images:
        print(f"  unreadable:        {report.unreadable_images}")
    if report.tiny_images:
        print(f"  tiny (<32px):      {report.tiny_images}")
    if report.duplicate_hashes:
        print(f"  duplicate hashes:  {report.duplicate_hashes}")
    print("=" * 60)
