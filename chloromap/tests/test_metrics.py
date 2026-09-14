"""Metrics tests — Macro-F1, precision, recall, confusion matrix."""

import numpy as np
import pytest

from chloromap.evaluation.metrics import compute_metrics, macro_f1_from_confusion


def _logits_for(probs: np.ndarray) -> np.ndarray:
    return np.log(probs + 1e-9)


def test_macro_f1_perfect():
    # 3 classes, perfect predictions, equal support
    probs = np.eye(3)
    labels = np.arange(3)
    m = compute_metrics(_logits_for(probs), labels)
    assert m["macro_f1"] == pytest.approx(1.0)
    assert m["accuracy"] == pytest.approx(1.0)


def test_macro_f1_handles_imbalance():
    # class 0 appears in labels but is never predicted -> its F1 = 0
    probs = np.array([
        [0.30, 0.68, 0.02],  # label 0 -> pred 1
        [0.30, 0.68, 0.02],  # label 0 -> pred 1
        [0.30, 0.68, 0.02],  # label 0 -> pred 1
        [0.20, 0.78, 0.02],  # label 1 -> pred 1
        [0.20, 0.78, 0.02],  # label 1 -> pred 1
        [0.02, 0.40, 0.58],  # label 2 -> pred 2
    ])
    labels = np.array([0, 0, 0, 1, 1, 2])
    m = compute_metrics(_logits_for(probs), labels)

    # class 0: precision=0, recall=0, f1=0
    # class 1: tp=2, pred_count=5, support=2 -> P=0.4, R=1.0, F1=0.5714
    # class 2: tp=1, pred_count=1, support=1 -> P=1.0, R=1.0, F1=1.0
    f1_1 = 2 * (0.4 * 1.0) / (0.4 + 1.0)
    assert m["macro_precision"] == pytest.approx((0.0 + 0.4 + 1.0) / 3)
    assert m["macro_recall"] == pytest.approx((0.0 + 1.0 + 1.0) / 3)
    assert m["macro_f1"] == pytest.approx((0.0 + f1_1 + 1.0) / 3, abs=1e-4)


def test_confusion_matrix_values():
    probs = np.zeros((6, 2))
    probs[[0, 1, 3], 0] = 1
    probs[[2, 4, 5], 1] = 1
    labels = np.array([0, 0, 1, 1, 1, 1])
    m = compute_metrics(_logits_for(probs), labels)
    conf = np.array(m["confusion"])
    assert conf.shape == (2, 2)
    assert conf[0, 0] == 2 and conf[0, 1] == 0
    assert conf[1, 0] == 1 and conf[1, 1] == 3
    # Macro-F1 from the confusion matrix must match the metric value
    assert macro_f1_from_confusion(conf) == pytest.approx(m["macro_f1"])


def test_support():
    labels = np.array([0, 0, 0, 1, 2, 2])
    probs = np.eye(3)[labels] + 1e-9
    m = compute_metrics(_logits_for(probs), labels)
    conf = np.array(m["confusion"])
    supports = [int(conf[i, :].sum()) for i in range(3)]
    assert supports == [3, 1, 2]


def test_empty_class_handled_gracefully():
    # 3 output classes but class 2 never appears in labels
    probs = np.array([[0.9, 0.1, 0.0], [0.1, 0.9, 0.0]])
    labels = np.array([0, 1])
    m = compute_metrics(_logits_for(probs), labels)
    assert 0.0 <= m["macro_f1"] <= 1.0