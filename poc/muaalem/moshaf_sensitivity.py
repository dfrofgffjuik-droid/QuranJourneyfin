"""Re-run correct-recitation clips with a different Moshaf setting to test
whether false Tajweed flags come from reference configuration, not the model.
Uses the exact clips from export_cases.py. Writes results/moshaf-sensitivity.json."""
import json, os, sys
import numpy as np
import pipeline as P

cases_dir = sys.argv[1] if len(sys.argv) > 1 else "/tmp/rafiqi-cases"
reciter = os.environ.get("RECITER", "minshawi_murattal")
override = {"madd_aared_len": int(os.environ.get("AARED", "2"))}
man = [c for c in json.load(open(os.path.join(cases_dir, "manifest.json"))) if c["category"] == "correct" and c["reciter"] == reciter]
rows = []
for c in man:
    w = np.fromfile(os.path.join(cases_dir, c["id"] + ".f32"), dtype=np.float32)
    r = P.analyze(w, c["sura"], c["aya_from"], c["aya_to"], moshaf_overrides=override, run_search=False)
    taj = [e for e in r["errors"] if e["error_type"] == "tajweed"]
    other = [e for e in r["errors"] if e["error_type"] != "tajweed"]
    rows.append(dict(id=c["id"], tajweed_flags=len(taj), other_flags=len(other),
                     tajweed=[dict(rules=[x["name"]["en"] for x in (e["ref_tajweed_rules"] or [])], expected_len=e["expected_len"], predicted_len=e["predicted_len"]) for e in taj]))
    print(rows[-1]["id"], rows[-1]["tajweed_flags"], rows[-1]["other_flags"], flush=True)
os.makedirs("results", exist_ok=True)
json.dump(dict(reciter=reciter, override=override, rows=rows), open("results/moshaf-sensitivity.json", "w"), ensure_ascii=False, indent=1)
