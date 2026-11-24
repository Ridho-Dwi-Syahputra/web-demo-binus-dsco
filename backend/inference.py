"""Antarmuka inferensi untuk contoh terproses yang disertakan dalam proyek."""

from functools import lru_cache
import json
from pathlib import Path

import joblib
import numpy as np


ARTIFACTS = Path(__file__).resolve().parents[1] / "models"
ENSEMBLE = ARTIFACTS / "ensemble"
MODEL_INPUTS = {
    "lightgbm": "X_cat",
    "xgboost": "X_ord",
    "catboost": "X_ord",
}


@lru_cache(maxsize=1)
def load_bundle():
    manifest = json.loads((ENSEMBLE / "manifest.json").read_text(encoding="utf-8"))
    count = manifest["models_per_family"]
    models = {
        family: joblib.load(ENSEMBLE / f"{family}_{count}_model.joblib")
        for family in MODEL_INPUTS
    }
    if any(len(items) != count for items in models.values()):
        raise ValueError("Jumlah model tidak sesuai dengan manifest.")
    examples = joblib.load(ARTIFACTS / "fixtures" / "contoh_demo.joblib")
    for example in examples.values():
        for key in ("X_cat", "X_ord"):
            frame = example[key]
            if len(frame) != 1 or frame.columns.tolist() != manifest["feature_columns"]:
                raise ValueError("Susunan fitur contoh tidak sesuai dengan manifest.")
    return manifest, models, examples


def describe_example(example):
    row = example["X_cat"].iloc[0]
    return {
        "module": str(row["code_module"]),
        "active_days": int(row["active_days"]),
        "no_vle_activity": bool(row["vle_none"]),
        "missed_assessment": bool(row["no_submission_by_cutoff"]),
    }


def list_examples():
    _, _, examples = load_bundle()
    return {case_id: describe_example(example) for case_id, example in examples.items()}


def predict_example(case_id):
    """Hitung skor dari model tersimpan untuk satu contoh berdasarkan ID demo."""
    manifest, models, examples = load_bundle()
    example = examples[case_id]
    family_scores = []
    for family, key in MODEL_INPUTS.items():
        frame = example[key]
        estimators = models[family]
        family_scores.append(sum(float(model.predict_proba(frame)[0, 1]) for model in estimators) / len(estimators))

    score = float(np.mean(family_scores))
    if not np.isfinite(score) or not 0 <= score <= 1:
        raise ValueError("Skor model di luar rentang yang valid.")
    return {
        "case_id": case_id,
        "score": score,
        "needs_follow_up": score > manifest["threshold"],
        "signals": describe_example(example),
    }


def verify_examples():
    _, _, examples = load_bundle()
    for case_id, example in examples.items():
        result = predict_example(case_id)
        error = abs(result["score"] - example["expected_probability"])
        label_matches = result["needs_follow_up"] == bool(example["expected_label"])
        if error > 1e-6 or not label_matches:
            raise ValueError(f"Hasil inferensi fixture berbeda: {case_id} (selisih skor {error:.2g})")
        print(f"{case_id}: cocok (selisih skor {error:.2g})")


if __name__ == "__main__":
    verify_examples()
