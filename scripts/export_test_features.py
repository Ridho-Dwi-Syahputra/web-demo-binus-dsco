"""Export the prepared test features for the local Node inference engine."""

import gzip
import json
import sys
from pathlib import Path

import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if len(sys.argv) != 3:
    raise SystemExit("Usage: export_test_features.py PREPARED_JOBLIB RAW_TEST_CSV")

prepared = joblib.load(sys.argv[1])
raw = pd.read_csv(sys.argv[2], dtype={"id": str})
features = prepared["X_ord_test"]
ids = [str(value) for value in prepared["test_ids"]]
manifest = json.loads((ROOT / "models" / "ensemble" / "manifest.json").read_text(encoding="utf-8"))
if ids != raw["id"].tolist() or len(ids) != len(set(ids)):
    raise ValueError("IDs in the source data and prepared features differ.")
if features.columns.tolist() != manifest["feature_columns"]:
    raise ValueError("Prepared feature columns do not match the model.")

rows = [
    [None if pd.isna(value) else float(value) for value in row]
    for row in features.itertuples(index=False, name=None)
]
with gzip.open(ROOT / "models" / "next" / "test_features.json.gz", "wt", encoding="utf-8") as output:
    json.dump({"ids": ids, "rows": rows}, output, separators=(",", ":"), allow_nan=False)
print(f"Exported {len(ids)} test rows with {len(features.columns)} features.")
