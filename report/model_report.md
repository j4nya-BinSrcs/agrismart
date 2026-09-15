# Model Evaluation Report

**Task:** Image classification into 25 crop-disease/healthy classes (shared class list from SIH problem statement: 10 new Corn/Apple/Grape classes + 15 legacy solanaceae classes)

- **Model:** `tf_efficientnetv2_s` (backbone from `timm`, ImageNet-pretrained, transfer-learned)
- **Input:** RGB 224×224, ImageNet normalization
- **Dataset/split:** PlantVillage (lab-condition) — seed 42, deterministic stratified split (train XXXX / val XXXX); held-out PlantDoc-style field set is never used for training.
- **Approach:** Fine-tuned EfficientNetV2-S with AdamW, warmup-cosine LR, class-balanced sampling, mixup (0.2) + random erasing (0.1). Baseline: frozen-backbone linear probe (Macro-F1 0.7431, Acc 0.7776).

## Metric & result

- **Macro-F1 (primary):** `TBD`
- **Accuracy (secondary):** `TBD`

## Baseline comparison

| Model | Macro-F1 | Accuracy |
|---|---|---|
| Frozen-backbone baseline (baseline_001) | 0.7431 | 0.7776 |
| Final model (this report) | `TBD` | `TBD` |

## Per-class metrics

| Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| Apple___Apple_scab | `TBD` | `TBD` | `TBD` | `TBD` |
| Apple___Black_rot | `TBD` | `TBD` | `TBD` | `TBD` |
| Apple___healthy | `TBD` | `TBD` | `TBD` | `TBD` |
| Corn___Common_rust | `TBD` | `TBD` | `TBD` | `TBD` |
| Corn___Gray_leaf_spot | `TBD` | `TBD` | `TBD` | `TBD` |
| Corn___healthy | `TBD` | `TBD` | `TBD` | `TBD` |
| Grape___Black_rot | `TBD` | `TBD` | `TBD` | `TBD` |
| Grape___Esca_(Black_Measles) | `TBD` | `TBD` | `TBD` | `TBD` |
| Grape___Leaf_blight_(Isariopsis_Leaf_Spot) | `TBD` | `TBD` | `TBD` | `TBD` |
| Grape___healthy | `TBD` | `TBD` | `TBD` | `TBD` |
| Pepper__bell___Bacterial_spot | `TBD` | `TBD` | `TBD` | `TBD` |
| Pepper__bell___healthy | `TBD` | `TBD` | `TBD` | `TBD` |
| Potato___Early_blight | `TBD` | `TBD` | `TBD` | `TBD` |
| Potato___Late_blight | `TBD` | `TBD` | `TBD` | `TBD` |
| Potato___healthy | `TBD` | `TBD` | `TBD` | `TBD` |
| Tomato___Bacterial_spot | `TBD` | `TBD` | `TBD` | `TBD` |
| Tomato___Early_blight | `TBD` | `TBD` | `TBD` | `TBD` |
| Tomato___Late_blight | `TBD` | `TBD` | `TBD` | `TBD` |
| Tomato___Leaf_Mold | `TBD` | `TBD` | `TBD` | `TBD` |
| Tomato___Septoria_leaf_spot | `TBD` | `TBD` | `TBD` | `TBD` |
| Tomato___Spider_mites_Two-spotted_spider_mite | `TBD` | `TBD` | `TBD` | `TBD` |
| Tomato___Target_Spot | `TBD` | `TBD` | `TBD` | `TBD` |
| Tomato___Tomato_Yellow_Leaf_Curl_Virus | `TBD` | `TBD` | `TBD` | `TBD` |
| Tomato___Tomato_mosaic_virus | `TBD` | `TBD` | `TBD` | `TBD` |
| Tomato___healthy | `TBD` | `TBD` | `TBD` | `TBD` |

## Confusion matrix

![Confusion matrix](../chloromap/reports/figures/confusion_matrix.png)

## Limitations

- Lab→field domain shift: trained on PlantVillage-style clean imagery; the held-out PlantDoc-style field images are the competition protocol.
- Softmax confidence is calibrated for classification, not for severity or treatment decisions.
- Similar-looking diseases may be confused; see the confusion matrix.
- Class imbalance and image quality affect performance — see `chloromap/reports/final/dataset_audit.json`.
- Apple Black Rot has no PlantDoc evaluation images; Corn Gray Leaf Spot has limited PlantDoc samples.
- New crop classes (Corn/Apple/Grape) lack expert playbooks in the server CropKnowledge — diagnosis falls back to generic scouting rules + Gemini.

## Checkpoint metadata

```json
{
  "model_name": "tf_efficientnetv2_s",
  "image_size": 224,
  "num_classes": 25,
  "class_names": ["Apple___Apple_scab", "Apple___Black_rot", "Apple___healthy", "Corn___Common_rust", "Corn___Gray_leaf_spot", "Corn___healthy", "Grape___Black_rot", "Grape___Esca_(Black_Measles)", "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)", "Grape___healthy", "Pepper__bell___Bacterial_spot", "Pepper__bell___healthy", "Potato___Early_blight", "Potato___Late_blight", "Potato___healthy", "Tomato___Bacterial_spot", "Tomato___Early_blight", "Tomato___Late_blight", "Tomato___Leaf_Mold", "Tomato___Septoria_leaf_spot", "Tomato___Spider_mites_Two-spotted_spider_mite", "Tomato___Target_Spot", "Tomato___Tomato_Yellow_Leaf_Curl_Virus", "Tomato___Tomato_mosaic_virus", "Tomato___healthy"],
  "train_seed": 42,
  "val_seed": 42
}
```