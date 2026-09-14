"""Dataset loading and transformation tests."""


import numpy as np
import torch
from PIL import Image

from chloromap.data.split import stratified_split
from chloromap.data.dataset import CropDiseaseDataset
from chloromap.data.transforms import get_train_transforms, get_val_transforms


def test_class_mapping(synth_dataset):
    ds = CropDiseaseDataset(synth_dataset)
    assert ds.num_classes == 4
    assert ds.classes == ["Corn___Leaf_spot", "Potato___Healthy",
                          "Tomato___Early_blight", "Tomato___Late_blight"]
    assert ds.class_to_idx["Tomato___Early_blight"] == 2


def test_dataset_loading(synth_dataset):
    ds = CropDiseaseDataset(synth_dataset)
    assert len(ds) == 24
    image, label = ds[0]
    assert isinstance(image, Image.Image)
    assert isinstance(label, int)


def test_invalid_images_are_skipped(tmp_path):
    d = tmp_path / "cls"
    d.mkdir()
    Image.new("RGB", (32, 32)).save(d / "b.png")
    (d / "c.jpg").write_bytes(b"")  # zero-byte -> skipped at scan time
    ds = CropDiseaseDataset(tmp_path)
    assert len(ds) == 1  # only the non-zero image is loaded


def test_zero_byte_directory_yields_empty_dataset(tmp_path):
    d = tmp_path / "cls"
    d.mkdir()
    (d / "c.jpg").write_bytes(b"")
    ds = CropDiseaseDataset(tmp_path)
    assert len(ds) == 0


def test_class_mapping_detached(tmp_path):
    d = tmp_path / "cls"
    d.mkdir()
    Image.new("RGB", (32, 32)).save(d / "a.png")
    ds = CropDiseaseDataset(tmp_path)
    assert ds.classes == ["cls"]


def test_transform_output_dimensions(synth_dataset):
    ds = CropDiseaseDataset(synth_dataset, transform=get_val_transforms(224))
    image, _ = ds[0]
    assert image.shape == (3, 224, 224)
    assert isinstance(image, torch.Tensor)
    mean = image.mean().item()
    assert -10 < mean < 10  # roughly normalized


def test_train_transform_is_variable(synth_dataset):
    ds = CropDiseaseDataset(synth_dataset, transform=get_train_transforms(224, "mild"))
    tensors = {hash(tuple(ds[0][0].numpy().round(3).flatten().tolist())) for _ in range(5)}
    assert len(tensors) > 1  # stochastic augmentation actually varies


def test_split_dedupe_removes_byte_duplicates(tmp_path):
    # class dir with 3 unique images + 2 byte-identical copies
    cls = tmp_path / "raw" / "Corn___Leaf_spot"
    cls.mkdir(parents=True)
    rng = np.random.default_rng(0)
    for i in range(3):
        Image.fromarray(rng.integers(0, 255, (48, 48, 3), dtype=np.uint8)).save(cls / f"u{i}.png")
    dup = (cls / "u0.png").read_bytes()
    (cls / "dup_a.png").write_bytes(dup)
    (cls / "dup_b.png").write_bytes(dup)

    out = tmp_path / "split"
    stats = stratified_split(tmp_path / "raw", out, val_ratio=0.5, seed=1, dedupe=True)
    assert stats["duplicates_dropped_total"] == 2
    n_train = len(list((out / "train" / "Corn___Leaf_spot").iterdir()))
    n_val = len(list((out / "val" / "Corn___Leaf_spot").iterdir()))
    total = n_train + n_val
    assert total == 3  # only unique images copied

    # a duplicate must appear in at most one split (content-hash level)
    hashes = []
    for split in ("train", "val"):
        for p in (out / split / "Corn___Leaf_spot").iterdir():
            hashes.append(tuple(Image.open(p).tobytes()))
    assert len(set(hashes)) == 3


def test_split_dedupe_disabled_counts_all(tmp_path):
    cls = tmp_path / "raw" / "Tomato_healthy"
    cls.mkdir(parents=True)
    img = Image.fromarray(np.zeros((48, 48, 3), dtype=np.uint8))
    for name in ("a.png", "b.png", "c.png"):  # all identical bytes
        img.save(cls / name)
    out = tmp_path / "split"
    stats = stratified_split(tmp_path / "raw", out, val_ratio=0.5, seed=1, dedupe=False)
    assert stats["duplicates_dropped_total"] == 0
    assert sum(v["total"] for v in stats["classes"].values()) == 3