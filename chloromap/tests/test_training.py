"""Tests for training components — focal loss, warmup cosine, mixup, erasing."""


import numpy as np
import pytest
import torch
import torch.nn as nn

from chloromap.training.losses import FocalLoss, build_loss
from chloromap.training.schedulers import build_scheduler
from chloromap.training.trainer import mixup_criterion, mixup_data


# ---------------------------------------------------------------------------
# Focal loss
# ---------------------------------------------------------------------------
def test_focal_loss_hard_samples_weight_higher():
    # sample 0: confident & correct (easy); sample 1: confident & WRONG (hard,
    # both rows predict class 0 but sample 1 targets class 1)
    logits = torch.tensor([[3.0, -3.0], [3.0, -3.0]])
    targets = torch.tensor([0, 1])
    focal = FocalLoss(gamma=2.0, reduction="none")(logits, targets)
    hard, easy = focal[1].item(), focal[0].item()
    assert easy < hard
    # gamma shrinks the easy sample's contribution far below gamma=0
    ce = FocalLoss(gamma=0.0, reduction="none")(logits, targets)
    ratio_g0 = ce[1].item() / ce[0].item()
    ratio_g2 = hard / easy
    assert ratio_g2 > ratio_g0


def test_focal_gamma_zero_matches_ce():
    logits = torch.randn(8, 5, dtype=torch.float64)
    targets = torch.randint(0, 5, (8,))
    focal = FocalLoss(gamma=0.0)(logits, targets)
    ce = nn.CrossEntropyLoss()(logits, targets)
    assert focal.item() == pytest.approx(ce.item(), abs=1e-6)


def test_focal_alpha_weights_classes():
    logits = torch.ones(2, 2)
    targets = torch.tensor([0, 1])
    alpha = torch.tensor([2.0, 1.0])
    loss_a = FocalLoss(gamma=1.0, alpha=alpha)(logits, targets)
    # class 0 gets double weight
    assert loss_a.item() == pytest.approx(
        FocalLoss(gamma=1.0, alpha=torch.ones(2))(logits, targets).item() * 1.5, rel=1e-4
    )


def test_build_loss_weighted_requires_weights():
    with pytest.raises(ValueError):
        build_loss("weighted_cross_entropy")
    loss = build_loss("weighted_cross_entropy", class_weights=[1.0, 2.0])
    assert isinstance(loss, nn.CrossEntropyLoss)
    assert loss.weight is not None


def test_build_focal_from_name():
    loss = build_loss("focal", gamma=1.5, class_weights=[1.0, 1.0])
    assert isinstance(loss, FocalLoss)
    assert loss.gamma == 1.5


def test_build_unknown_loss_raises():
    with pytest.raises(ValueError):
        build_loss("not_a_loss")


# ---------------------------------------------------------------------------
# warmup_cosine scheduler
# ---------------------------------------------------------------------------
def test_warmup_cosine_schedule():
    opt = torch.optim.SGD([torch.nn.Parameter(torch.zeros(2))], lr=0.1)
    n_epochs, warmup = 10, 3
    sched = build_scheduler(opt, "warmup_cosine", epochs=n_epochs, warmup_epochs=warmup, eta_min=1e-4)

    lrs = [opt.param_groups[0]["lr"]]
    for _ in range(n_epochs):
        opt.step()  # mimic trainer: optimizer.step() precedes scheduler.step()
        sched.step()
        lrs.append(opt.param_groups[0]["lr"])

    # LambdaLR applies the warmup factor immediately (last_epoch 0), so the
    # schedule spans the first ``warmup`` optimizer*scheduler steps.
    # Ramp: 1/3 -> 2/3 -> 1.0, then cosine decay toward eta_min.
    assert lrs[0] < lrs[1] < lrs[2]
    assert lrs[0] == pytest.approx(0.1 / 3, rel=1e-3)
    assert lrs[2] == pytest.approx(0.1, rel=1e-3)
    # decays monotonically (weakly) after warmup
    for a, b in zip(lrs[2:], lrs[3:]):
        assert b <= a + 1e-9
    # final LR approaches eta_min, not zero
    assert lrs[-1] >= 1e-4 * 0.9


def test_warmup_cosine_eta_min_ratio():
    opt = torch.optim.SGD([torch.nn.Parameter(torch.zeros(2))], lr=0.01)
    sched = build_scheduler(opt, "warmup_cosine", epochs=5, warmup_epochs=0, eta_min=5e-4)
    for _ in range(5):
        opt.step()
        sched.step()
    lr = opt.param_groups[0]["lr"]
    assert lr == pytest.approx(5e-4, rel=5e-2)


# ---------------------------------------------------------------------------
# mixup
# ---------------------------------------------------------------------------
def test_mixup_batch_shapes_and_lam():
    rng = np.random.default_rng(0)
    x = torch.from_numpy(rng.uniform(size=(6, 3, 8, 8)).astype(np.float32))
    y = torch.tensor([0, 1, 2, 0, 1, 2])
    mixed, y_a, y_b, lam = mixup_data(x, y, alpha=0.2)
    assert mixed.shape == x.shape
    assert torch.equal(y_a, y)
    assert sorted(y_b.tolist()) == sorted(y.tolist())  # y_b is a permutation of y


def test_mixup_criterion_is_convex_combination():
    pred = torch.randn(4, 3)
    y_a = torch.tensor([0, 1, 2, 0])
    y_b = torch.tensor([2, 0, 1, 1])
    criterion = nn.CrossEntropyLoss()
    lam = 0.3
    loss = mixup_criterion(criterion, pred, y_a, y_b, lam)
    ref = lam * criterion(pred, y_a) + (1 - lam) * criterion(pred, y_b)
    assert loss.item() == pytest.approx(ref.item(), rel=1e-5)


# ---------------------------------------------------------------------------
# random erasing in transforms
# ---------------------------------------------------------------------------
def test_train_transforms_erasing_changes_values():
    from PIL import Image

    from chloromap.data.transforms import get_train_transforms

    img = Image.fromarray(np.full((64, 64, 3), 128, dtype=np.uint8))
    tr = get_train_transforms(224, "mild", erasing=1.0)
    out = tr(img)
    assert out.shape == (3, 224, 224)
    assert isinstance(out, torch.Tensor)