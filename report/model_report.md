# Model Evaluation Report

**Task:** Image classification into 15 crop-disease/healthy classes (solanaceae focus: Pepper, Potato, Tomato)

- **Model:** `tf_efficientnet_b0` (backbone from `timm`, ImageNet-pretrained, fully fine-tuned)
- **Input:** RGB 224×224, ImageNet normalization
- **Dataset/split:** PlantVillage (lab-condition) — 20,638 images, 15 classes, seed 42, deterministic stratified split (train 17,542 / val 3,096); held-out PlantDoc-style field set is never used for training.
- **Approach:** Full fine-tune with AdamW (lr=1e-4, wd=1e-4), warmup-cosine LR (2-epoch warmup, 12 total), class-balanced sampling, mixup (α=0.2) + random erasing (0.2). Baseline: frozen-backbone `tf_efficientnetv2_s` linear probe (Macro-F1 0.7432, Acc 0.7776).

## Metric & result

- **Macro-F1 (primary):** `0.9422`
- **Accuracy (secondary):** `0.9501`
- **Macro-Precision:** `0.9387`
- **Macro-Recall:** `0.9491`
- **Best epoch:** 12 / 12

## Baseline comparison

| Model | Macro-F1 | Accuracy |
|---|---:|---:|
| Frozen-backbone baseline (`tf_efficientnetv2_s`, baseline_001) | 0.7432 | 0.7776 |
| Final model (`tf_efficientnet_b0`, final_004) | **0.9422** | **0.9501** |

## Per-class metrics

| Class | Precision | Recall | F1 | Support |
|---|---:|---:|---:|---:|
| Pepper__bell___Bacterial_spot | 0.9667 | 0.9732 | 0.9699 | 149 |
| Pepper__bell___healthy | 0.9776 | 0.9864 | 0.9820 | 221 |
| Potato___Early_blight | 0.9801 | 0.9867 | 0.9834 | 150 |
| Potato___Late_blight | 0.8974 | 0.9333 | 0.9150 | 150 |
| Potato___healthy | 0.8077 | 0.9545 | 0.8750 | 22 |
| Tomato_Bacterial_spot | 0.9303 | 0.9624 | 0.9461 | 319 |
| Tomato_Early_blight | 0.9333 | 0.8400 | 0.8842 | 150 |
| Tomato_Late_blight | 0.9368 | 0.9368 | 0.9368 | 285 |
| Tomato_Leaf_Mold | 0.9085 | 0.9789 | 0.9424 | 142 |
| Tomato_Septoria_leaf_spot | 0.9544 | 0.9472 | 0.9508 | 265 |
| Tomato_Spider_mites_Two_spotted_spider_mite | 0.9121 | 0.9920 | 0.9504 | 251 |
| Tomato__Target_Spot | 0.9760 | 0.7762 | 0.8647 | 210 |
| Tomato__Tomato_YellowLeaf__Curl_Virus | 0.9957 | 0.9730 | 0.9842 | 481 |
| Tomato__Tomato_mosaic_virus | 0.9483 | 1.0000 | 0.9735 | 55 |
| Tomato_healthy | 0.9555 | 0.9958 | 0.9752 | 237 |

## Confusion matrix

![Confusion matrix](../chloromap/reports/figures/confusion_matrix.png)

## Limitations

- **Lab→field domain shift:** trained on PlantVillage-style clean imagery; the held-out PlantDoc-style field images are the competition protocol and are never trained on.
- **Confidence ≠ severity:** softmax confidence is calibrated for classification, not for treatment/severity decisions.
- **Confusable classes:** visually similar diseases may be confused (notably `Tomato__Target_Spot` and `Tomato_Early_blight`); see the confusion matrix.
- **Class imbalance:** rare classes (e.g. `Potato___healthy`, 152 images) are harder; balanced sampling mitigates but does not eliminate this.
- **Not bit-for-bit reproducible across machines** due to GPU nondeterminism; inference from a fixed checkpoint is reproducible.
- **15-class scope:** current checkpoint covers Pepper/Potato/Tomato only. The 25-class canonical spec (adding Apple, Corn, Grape) is defined in `chloromap/configs/class_spec.yaml` and is the retraining target.

## Checkpoint metadata

```json
{
  "model_name": "tf_efficientnet_b0",
  "image_size": 224,
  "num_classes": 15,
  "class_names": ["Pepper__bell___Bacterial_spot", "Pepper__bell___healthy", "Potato___Early_blight", "Potato___Late_blight", "Potato___healthy", "Tomato_Bacterial_spot", "Tomato_Early_blight", "Tomato_Late_blight", "Tomato_Leaf_Mold", "Tomato_Septoria_leaf_spot", "Tomato_Spider_mites_Two_spotted_spider_mite", "Tomato__Target_Spot", "Tomato__Tomato_YellowLeaf__Curl_Virus", "Tomato__Tomato_mosaic_virus", "Tomato_healthy"],
  "train_seed": 42,
  "val_seed": 42,
  "experiment_id": "final_004",
  "validation_macro_f1": 0.9422363487799942,
  "validation_accuracy": 0.9501133786848073
}
```