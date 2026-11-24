"""Ekspor satu kali dari joblib DSCO ke paket bobot untuk server Next.js."""

import argparse
import gzip
import json
from pathlib import Path
import tempfile

import joblib
import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "models" / "ensemble"
OUTPUT = ROOT / "models" / "next"


def lightgbm_tree(tree):
    nodes = []

    def export_node(node):
        index = len(nodes)
        nodes.append(None)
        if "leaf_value" in node:
            nodes[index] = node["leaf_value"]
            return index
        decision = node["decision_type"]
        threshold = node["threshold"]
        if decision == "==":
            threshold = [int(value) for value in threshold.split("||")]
        elif decision != "<=":
            raise ValueError(f"Split LightGBM tidak didukung: {decision}")
        nodes[index] = [
            node["split_feature"], threshold,
            export_node(node["left_child"]), export_node(node["right_child"]),
            node["default_left"], {"None": 0, "NaN": 1, "Zero": 2}[node["missing_type"]],
        ]
        return index

    export_node(tree)
    return nodes


def export_lightgbm(model):
    doc = model.booster_.dump_model()
    if doc["objective"] != "binary sigmoid:1" or doc["average_output"]:
        raise ValueError("Objective LightGBM tidak didukung.")
    return [lightgbm_tree(tree["tree_structure"]) for tree in doc["tree_info"]]


def export_xgboost(model):
    learner = json.loads(model.get_booster().save_raw(raw_format="json"))["learner"]
    if learner["objective"]["name"] != "binary:logistic":
        raise ValueError("Objective XGBoost tidak didukung.")
    forest = learner["gradient_booster"]["model"]
    if forest["gbtree_model_param"]["num_parallel_tree"] != "1":
        raise ValueError("Paket ini mengasumsikan satu pohon XGBoost per iterasi.")
    base_score = float(learner["learner_model_param"]["base_score"].strip("[]"))
    trees = []
    for tree in forest["trees"][:model.best_iteration + 1]:
        if any(tree["split_type"]):
            raise ValueError("Split kategorikal XGBoost tidak didukung.")
        nodes = []
        for feature, value, left, right, default_left in zip(
            tree["split_indices"], tree["split_conditions"], tree["left_children"],
            tree["right_children"], tree["default_left"], strict=True,
        ):
            nodes.append(value if left == -1 else [feature, value, left, right, bool(default_left)])
        trees.append(nodes)
    return [base_score, trees]


def export_catboost(model):
    if model.get_all_params()["loss_function"] != "Logloss":
        raise ValueError("Objective CatBoost tidak didukung.")
    with tempfile.TemporaryDirectory() as folder:
        filepath = Path(folder) / "catboost.json"
        model.save_model(str(filepath), format="json")
        doc = json.loads(filepath.read_text(encoding="utf-8"))
    features = {
        feature["feature_index"]: feature for feature in doc["features_info"]["float_features"]
    }
    trees = []
    scale, biases = doc["scale_and_bias"]
    bias, = biases
    for tree in doc["oblivious_trees"]:
        splits = []
        for split in tree["splits"] or []:
            if split["split_type"] != "FloatFeature":
                raise ValueError("Split nonnumerik CatBoost tidak didukung.")
            feature = features[split["float_feature_index"]]
            splits.append([
                feature["flat_feature_index"], split["border"],
                feature["nan_value_treatment"] == "AsTrue",
            ])
        leaves = tree["leaf_values"]
        if len(leaves) != 2 ** len(splits):
            raise ValueError("Pohon CatBoost harus simetris dengan satu skor per daun.")
        trees.append([splits, leaves])
    return [scale, bias, trees]


def encode_rows(frame):
    return [
        [None if pd.isna(value) else float(value) for value in row]
        for row in frame.itertuples(index=False, name=None)
    ]


def assert_encoding(X_cat, X_ord):
    for name in X_cat.select_dtypes(include="category"):
        if X_cat[name].isna().any() or not np.array_equal(X_cat[name].cat.codes, X_ord[name]):
            raise ValueError(f"Kode kategori berbeda pada {name}.")


def write_json(filepath, data):
    temporary = filepath.with_suffix(filepath.suffix + ".tmp")
    opener = gzip.open if filepath.suffix == ".gz" else Path.open
    with opener(temporary, "wt", encoding="utf-8") as stream:
        json.dump(data, stream, separators=(",", ":"), allow_nan=False)
    temporary.replace(filepath)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--validation", type=Path, help="Matriks uji lokal DSCO untuk uji kesetaraan opsional")
    parser.add_argument("--validation-output", type=Path, help="Berkas sementara hasil referensi Python")
    args = parser.parse_args()
    if bool(args.validation) != bool(args.validation_output):
        parser.error("Berikan kedua argumen validasi atau abaikan keduanya.")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))
    count = manifest["models_per_family"]
    columns = manifest["feature_columns"]
    threshold = manifest["threshold"]
    model_groups = {}
    bundle = {"version": 1, "threshold": threshold, "features": len(columns)}
    for name, converter in (("lightgbm", export_lightgbm), ("xgboost", export_xgboost), ("catboost", export_catboost)):
        group = joblib.load(SOURCE / f"{name}_{count}_model.joblib")
        if len(group) != count:
            raise ValueError(f"Jumlah model berbeda pada {name}.")
        model_groups[name] = group
        bundle[name] = [converter(model) for model in group]
        print(f"{name}: {len(group)} model diekspor", flush=True)

    fixtures = joblib.load(ROOT / "models" / "fixtures" / "contoh_demo.joblib")
    examples = {}
    for case_id, example in fixtures.items():
        X_cat, X_ord = example["X_cat"], example["X_ord"]
        if X_cat.columns.tolist() != columns or X_ord.columns.tolist() != columns:
            raise ValueError("Susunan fitur contoh tidak sesuai manifest.")
        assert_encoding(X_cat, X_ord)
        row = X_cat.iloc[0]
        examples[case_id] = {
            "features": encode_rows(X_ord)[0],
            "signals": {
                "module": str(row["code_module"]),
                "active_days": int(row["active_days"]),
                "no_vle_activity": bool(row["vle_none"]),
                "missed_assessment": bool(row["no_submission_by_cutoff"]),
            },
            "expected": [example["expected_probability"], bool(example["expected_label"])],
        }
    write_json(OUTPUT / "ensemble.json.gz", bundle)
    write_json(OUTPUT / "contoh.json", examples)

    if args.validation:
        test = joblib.load(args.validation)
        X_cat = test["X_cat_test"]
        X_ord = test["X_ord_test"]
        if X_cat.columns.tolist() != columns or X_ord.columns.tolist() != columns:
            raise ValueError("Susunan fitur uji tidak sesuai manifest.")
        assert_encoding(X_cat, X_ord)
        probabilities = {}
        for name, models in model_groups.items():
            frame = X_cat if name == "lightgbm" else X_ord
            probabilities[name] = np.mean(
                [model.predict_proba(frame)[:, 1].astype(float) for model in models], axis=0
            ).tolist()
        write_json(args.validation_output, {"rows": encode_rows(X_ord), "probabilities": probabilities})
        print(f"Referensi Python: {len(X_ord)} baris", flush=True)


if __name__ == "__main__":
    main()
