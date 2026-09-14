"""Learning-rate schedulers."""

from __future__ import annotations

import math

import torch.optim as optim


def _warmup_cosine_fn(epoch: int, warmup: int, t_max: int, eta_min_ratio: float) -> float:
    """Learning-rate multiplier: linear warmup then cosine decay to eta_min.

    ``epoch`` is the scheduler's ``last_epoch`` (starts at 1 after the first
    ``step()``), so the warmup ramps 1/warmup -> 1 over the first ``warmup``
    scheduler steps.
    """
    epoch = epoch + 1
    if warmup > 0 and epoch <= warmup:
        return epoch / warmup
    progress = (epoch - warmup) / max(1, t_max - warmup)
    cosine = 0.5 * (1.0 + math.cos(math.pi * min(1.0, progress)))
    return max(eta_min_ratio, cosine)


def build_scheduler(optimizer, name: str, epochs: int, **kwargs):
    """Create a scheduler.

    Supported names:
      - "cosine" / "cosine_annealing" : plain cosine decay over the run.
      - "warmup_cosine"                : linear warmup then cosine decay.
      - "step", "plateau", "none"/"constant".
    """
    name = name.lower()
    if name in {"cosine", "cosine_annealing"}:
        t_max = kwargs.pop("T_max", epochs)
        eta_min = kwargs.pop("eta_min", 1e-6)
        return optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=t_max, eta_min=eta_min)
    if name == "warmup_cosine":
        t_max = kwargs.pop("T_max", epochs)
        eta_min = kwargs.pop("eta_min", 1e-6)
        warmup = max(0, int(kwargs.pop("warmup_epochs", 0)))
        warmup = min(warmup, t_max)
        base_lr = optimizer.param_groups[0]["lr"]
        eta_min_ratio = max(1e-8, eta_min / base_lr) if base_lr else 1e-4
        return optim.lr_scheduler.LambdaLR(
            optimizer,
            lr_lambda=lambda e: _warmup_cosine_fn(e, warmup, t_max, eta_min_ratio),
        )
    if name == "step":
        step_size = kwargs.pop("step_size", max(5, epochs // 3))
        gamma = kwargs.pop("gamma", 0.5)
        return optim.lr_scheduler.StepLR(optimizer, step_size=step_size, gamma=gamma)
    if name == "plateau":
        patience = kwargs.pop("patience", 5)
        return optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=patience)
    if name in {"none", "constant"}:
        return optim.lr_scheduler.LambdaLR(optimizer, lr_lambda=lambda e: 1.0)
    raise ValueError(f"Unknown scheduler: {name}")