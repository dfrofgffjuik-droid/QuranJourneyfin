# Al-Quran Rafiqi: recitation AI feasibility proof of concept

This folder contains the **real** inference and correction pipeline behind the
app's Recitation screen (`src/screens/Recite.tsx`) and the developer-only lab at
`#/dev` (`src/dev/`). It does not include a mock: if the service is not running,
the UI says so and refuses to show results.

```
browser (src/screens/Recite.tsx, src/dev/Harness.tsx)
  │  MediaRecorder / file → decoded + resampled to 16 kHz mono WAV *on device*
  │  POST /muaalem/analyze?sura=&from=&to=&madd_*=   (only when the user presses Analyse)
  ▼
Vite dev bridge (poc/muaalem/vite-plugin.ts → 127.0.0.1:8765, dev only)
  ▼
poc/muaalem/server.py  (stdlib HTTP, audio kept in memory, never written)
  └─ pipeline.py
       Tanzil Uthmani text (quran-transcript) → quran_phonetizer(moshaf)
       obadx/muaalem-model-v3_2 (Wav2Vec2-BERT multi-level CTC, bf16, CPU)
       quran_transcript.explain_error  → errors with Uthmani spans + Tajweed rules
       PhoneticSearch                  → verse identification
       abstain if phoneme error rate > 0.35 (heuristic, uncalibrated)
```

## Run it (Linux, CPU, ≥4 GB RAM, ≈4 GB disk)

```sh
# 1. Python env (CPU torch first so the CUDA build is not pulled in)
uv venv /tmp/mvenv -p 3.13
uv pip install -p /tmp/mvenv/bin/python --index-url https://download.pytorch.org/whl/cpu torch
uv pip install -p /tmp/mvenv/bin/python --no-deps quran-muaalem==0.2.2
uv pip install -p /tmp/mvenv/bin/python -r poc/muaalem/requirements.txt

# 2. Service (downloads 2.4 GB of weights from Hugging Face on first run)
MALLOC_ARENA_MAX=2 /tmp/mvenv/bin/python poc/muaalem/server.py
#    optional: MUAALEM_MODEL=/local/copy  MUAALEM_PORT=8765  MUAALEM_MAX_SECONDS=30

# 3. The Figma Make preview proxies /muaalem → 127.0.0.1:8765 automatically.
```

Benchmarks:

```sh
cd poc/muaalem
MALLOC_ARENA_MAX=2 /tmp/mvenv/bin/python benchmark.py       # resumable; writes results/
/tmp/mvenv/bin/python export_cases.py /tmp/rafiqi-cases     # identical clips for other engines
AARED=2 /tmp/mvenv/bin/python moshaf_sensitivity.py         # Moshaf configuration test

# Tilawa (needs @tilawa/core@0.4.0 + onnxruntime-node + NPL-1.2 assets in TILAWA_DIR)
TILAWA_DIR=/tmp/tilawa-test CASES=/tmp/rafiqi-cases node poc/tilawa/benchmark.mjs
```

After a run, copy `poc/*/results/*.json` into `src/data/` (see `BENCHMARK.md`).

## Known blockers and limits

| Blocker | Detail |
|---|---|
| Published site cannot run Muaalem | Figma Make deploys static assets; there is no Python, GPU, or 2.4 GB model host. The dev proxy exists only in the sandbox preview. |
| Memory | About 3.3 GB peak RSS on CPU. A 46 s clip was OOM-killed on 4 GB. Memory growth across runs needed `gc` and `MALLOC_ARENA_MAX=2`. |
| Dependency drift | `transformers>=5` breaks `quran_muaalem.modeling` (`_HIDDEN_STATES_START_POSITION` removed). Pin 4.55.2. |
| No on-device Muaalem | No ONNX or mobile export exists. Porting it is a separate engineering task that would need its accuracy re-validated. |
| Calibration | `Unit.probs` are uncalibrated (Muaalem docs). The 0.35 PER abstention gate is a guess and wrongly abstained on 1 of 8 substitutions. |

## Licences (read from the repositories, not assumed)

| Asset | Licence | Obligations for Rafiqi |
|---|---|---|
| quran-muaalem code | QML-1.0 (Apache-2.0 + conditions) | Show the AI advisory notice before first use and keep it accessible (done in the harness). Comply with Sharia, never show ads or sell data for ads, and keep a no-cost path if any fee is charged. |
| obadx/muaalem-model-v3_2 weights | MIT (HF model card) | Attribution. |
| obadx/muaalem-annotated-v3 dataset | MIT (HF) | Attribution. |
| quran-transcript / Tanzil text | Tanzil Uthmani 1.1, CC BY 3.0 | Verbatim only, credit Tanzil, link tanzil.net (footer). |
| @tilawa/core | MIT | Attribution. |
| Tilawa Zipformer model + phoneme corpus | NPL-1.2 (Quran-Lab) | Non-commercial; may not charge for features it powers; share-alike for derivatives (incl. models *evaluated* with it). Not committed here. Needs legal review. |
| Tilawa training sets Iqra, RetaSy, TLOG | Unstated | Provenance must be clarified before relying on the fine-tuned model. |
| Test audio (QuranicAudio / Quran.com, Husary, Alafasy, Minshawi) | Not cleared for redistribution | Streamed to `/tmp` for internal testing only. Never committed or bundled. |

Nothing in this repo generates or modifies Quranic text. All text comes from the
Tanzil file bundled in `quran-transcript` (`src/data/quran-sample.json` was
extracted from it programmatically).
