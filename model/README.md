# Model

SIH submission contract (Section 7.1) requires a top-level `/model`
directory. The trained computer-vision model and all training/evaluation
tooling live in the self-contained [`chloromap/`](../chloromap/README.md)
subsystem. This directory is a documented pointer so the mandated layout is
satisfied without duplicating artifacts.

| Artifact | Location |
| :--- | :--- |
| Trained checkpoint (25-class) | `chloromap/weights/best_model.pth` |
| Baseline checkpoint (15-class solanaceae backup) | `chloromap/weights/best_model.pth.solanaceae15.pth` (gitignored) |
| Baseline experiment (frozen v2-S) | `chloromap/weights/best_model.pth.baseline` (gitignored) |
| Model source (EfficientNet factory, heads) | `chloromap/src/chloromap/models/` |
| Training / evaluation code | `chloromap/scripts/{train,evaluate,predict,serve,audit_dataset,prepare_dataset,build_dataset}.py` |
| Class specification (canonical labels) | `chloromap/configs/class_spec.yaml` |
| Report + metrics | [`../report/`](../report/) |

Reproduce training from the repo root:

```bash
cd chloromap
uv sync                          # creates .venv (Python 3.13, torch CUDA)
uv run python scripts/build_dataset.py --class-spec configs/class_spec.yaml \
    --out-dir ../data/raw/plantvillage --pv-color-dir /path/to/PlantVillage-Dataset/raw/color \
    --legacy-dir /path/to/previous-15-class-set
uv run python scripts/prepare_dataset.py --data-dir ../data/raw/plantvillage --out-dir ../data/processed
uv run python scripts/train.py --config configs/final.yaml
uv run python scripts/evaluate.py --checkpoint weights/best_model.pth
```

Every run is recorded in `chloromap/reports/experiments/*.json` (seeds,
configs, metrics), and the final one-page report lives in
[`../report/model_report.md`](../report/model_report.md).