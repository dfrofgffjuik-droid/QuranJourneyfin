"""Export the exact benchmark clips (16 kHz float32 raw) + labels so other
engines (e.g. Tilawa) are evaluated on identical audio. Writes to /tmp only."""
import json, os, sys
import benchmark as B

out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/rafiqi-cases"
os.makedirs(out, exist_ok=True)
manifest = []
for c in B.build_cases(quick=False):
    c["wave"].astype("float32").tofile(os.path.join(out, c["id"] + ".f32"))
    manifest.append({k: c[k] for k in ("id", "category", "reciter", "sura", "aya_from", "aya_to", "label")})
json.dump(manifest, open(os.path.join(out, "manifest.json"), "w"), ensure_ascii=False, indent=1)
print(len(manifest), "cases exported to", out)
