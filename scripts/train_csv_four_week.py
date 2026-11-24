"""Train and export a row-wise model using four-week DSCO training data only."""

import argparse
import hashlib
import json
from pathlib import Path
import sys

import lightgbm as lgb
import numpy as np
import pandas as pd
import sklearn
from sklearn.metrics import confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import StratifiedGroupKFold

# The bundled Windows Python does not add the script directory to the import path.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from export_models import export_lightgbm, write_json


ROOT = Path(__file__).resolve().parents[1]
SEED = 42
RAW_COLUMNS = [
    "num_of_prev_attempts", "studied_credits", "has_score", "avg_score",
    "no_submission_by_cutoff", "interaction_volume", "active_days", "unique_sites",
    "first_activity_day", "last_activity_day",
    "week1_interactions", "week2_interactions", "week3_interactions", "week4_interactions",
]
VLE_COUNTS = ["interaction_volume", "active_days", "unique_sites", *RAW_COLUMNS[-4:]]
VLE_DAYS = ["first_activity_day", "last_activity_day"]
VLE_SENTINEL = {"interaction_volume": 182, "active_days": 10, "unique_sites": 20,
                "first_activity_day": 1, "last_activity_day": 26}
FEATURES = [*RAW_COLUMNS, "vle_none"]


def prepare_features(raw):
    X = raw[RAW_COLUMNS].apply(pd.to_numeric, errors="raise").copy()
    if X[RAW_COLUMNS].isna().any().any() or not np.isfinite(X.to_numpy()).all():
        raise ValueError("The original training data must contain finite raw values.")
    if (X < 0).any().any():
        raise ValueError("Unexpected negative raw feature.")
    for flag in ("has_score", "no_submission_by_cutoff"):
        if not X[flag].isin([0, 1]).all():
            raise ValueError(f"{flag} must be binary.")
    if (X["avg_score"] > 100).any() or (X["active_days"] > 29).any():
        raise ValueError("Scores or active days outside the source contract.")
    if ((X["first_activity_day"] > X["last_activity_day"]) | (X["last_activity_day"] > 28)).any():
        raise ValueError("Activity days are outside days 0 through 28.")
    no_vle = X[list(VLE_SENTINEL)].eq(pd.Series(VLE_SENTINEL)).all(axis=1)
    no_vle |= X["interaction_volume"].eq(0) & X["active_days"].eq(0)
    X.loc[no_vle, VLE_COUNTS] = 0
    X[VLE_DAYS] = X[VLE_DAYS].astype(float)
    X.loc[no_vle, VLE_DAYS] = np.nan
    X.loc[X["has_score"].eq(0), "avg_score"] = np.nan
    X["vle_none"] = no_vle.astype(int)
    return X


def describe_split(y, part):
    return {"rows": len(part), "positive_rows": int(y.iloc[part].sum())}


def split_data(X, y):
    # Keep identical model inputs in a single partition, even if their labels differ.
    groups = pd.util.hash_pandas_object(X, index=False).to_numpy()
    outer = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=SEED)
    work, held_out = next(outer.split(X, y, groups))
    inner = StratifiedGroupKFold(n_splits=4, shuffle=True, random_state=SEED + 1)
    fit_inner, calibration_inner = next(inner.split(X.iloc[work], y.iloc[work], groups[work]))
    fit, calibration = work[fit_inner], work[calibration_inner]
    group_sets = [set(groups[part]) for part in (fit, calibration, held_out)]
    if any(group_sets[i] & group_sets[j] for i, j in ((0, 1), (0, 2), (1, 2))):
        raise RuntimeError("Repeated feature vectors overlap across splits.")
    if any(y.iloc[part].nunique() != 2 for part in (fit, calibration, held_out)):
        raise RuntimeError("Each split needs both classes.")
    return fit, calibration, held_out, len(set(groups))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train", type=Path, default=ROOT / "data" / "train.csv")
    parser.add_argument("--output", type=Path, default=ROOT / "models" / "next" / "csv-four-week.json")
    parser.add_argument("--verification-output", type=Path, help="Optional local held-out predictions for JS parity.")
    args = parser.parse_args()

    raw = pd.read_csv(args.train)
    required = {*RAW_COLUMNS, "at_risk"}
    if missing := required - set(raw.columns):
        raise ValueError("Missing training columns: " + ", ".join(sorted(missing)))
    if not raw["at_risk"].isin([0, 1]).all():
        raise ValueError("Expected binary observed training labels.")
    X = prepare_features(raw)
    y = raw["at_risk"].astype(int)
    fit, calibration, held_out, group_count = split_data(X, y)

    model = lgb.LGBMClassifier(
        objective="binary", n_estimators=240, learning_rate=0.035,
        num_leaves=15, max_depth=5, min_child_samples=75, reg_lambda=1.0,
        n_jobs=4, random_state=SEED, deterministic=True, force_col_wise=True, verbosity=-1,
    )
    model.fit(X.iloc[fit], y.iloc[fit])
    cal_score = model.predict_proba(X.iloc[calibration])[:, 1]
    thresholds = np.arange(25, 176) / 200
    threshold = float(max(thresholds, key=lambda t: (
        f1_score(y.iloc[calibration], cal_score >= t, zero_division=0), -abs(t - 0.5)
    )))
    held_score = model.predict_proba(X.iloc[held_out])[:, 1]
    held_y = y.iloc[held_out]
    fit_y = y.iloc[fit]
    fit_predicted = model.predict_proba(X.iloc[fit])[:, 1] >= threshold
    predicted = held_score >= threshold
    tn, fp, fn, tp = map(int, confusion_matrix(held_y, predicted, labels=[0, 1]).ravel())
    metrics = {
        **describe_split(y, held_out),
        "f1": f1_score(held_y, predicted, zero_division=0),
        "precision": precision_score(held_y, predicted, zero_division=0),
        "recall": recall_score(held_y, predicted, zero_division=0),
        "confusion": {"tn": tn, "fp": fp, "fn": fn, "tp": tp},
    }
    artifact = {
        "version": 1,
        "type": "lightgbm-four-week",
        "threshold": threshold,
        "raw_columns": RAW_COLUMNS,
        "feature_columns": FEATURES,
        "metrics": metrics,
        "evaluation": {
            "method": "StratifiedGroupKFold 5-fold held-out, 4-fold calibration on the remainder",
            "group": "Identical prepared feature vectors kept together; student identities unavailable",
            "seed": SEED,
            "groups": group_count,
            "fit": {
                **describe_split(y, fit),
                "f1": f1_score(fit_y, fit_predicted, zero_division=0),
                "precision": precision_score(fit_y, fit_predicted, zero_division=0),
                "recall": recall_score(fit_y, fit_predicted, zero_division=0),
            },
            "calibration": describe_split(y, calibration),
            "held_out": describe_split(y, held_out),
            "threshold_selection": "Max F1 on calibration only; ties prefer values nearest 0.50",
            "source_sha256": hashlib.sha256(args.train.read_bytes()).hexdigest(),
            "packages": {"lightgbm": lgb.__version__, "numpy": np.__version__,
                         "pandas": pd.__version__, "scikit-learn": sklearn.__version__},
        },
        "trees": export_lightgbm(model),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    write_json(args.output, artifact)
    if args.verification_output:
        write_json(args.verification_output, {
            "rows": raw.iloc[held_out][RAW_COLUMNS].to_dict(orient="records"),
            "scores": held_score.tolist(),
            "flags": predicted.tolist(),
        })
    print(json.dumps({"threshold": threshold, "metrics": metrics, "evaluation": artifact["evaluation"]}, indent=2))


if __name__ == "__main__":
    main()
