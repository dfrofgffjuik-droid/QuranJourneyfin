"""Feasibility benchmark for Quran Muaalem (real model, real outputs).

Audio: professional murattal recitations streamed from QuranicAudio / Quran.com
(download.quranicaudio.com), with word timestamps from the Quran.com QDC API.
The timestamps are produced independently of Muaalem, so cutting/splicing at
them gives error labels "by construction" without using the model under test.

IMPORTANT LIMITS (also written into the report):
  * Labels are constructed, NOT reviewed by a qualified Quran teacher.
  * Spliced audio contains edit artefacts and is not real learner speech.
  * No pronunciation or Tajweed errors are synthesised: those need real
    human-recorded mistakes annotated by a teacher. They are reported UNTESTED.
  * Audio is cached in /tmp only and never committed or redistributed.

Usage:  MUAALEM_MODEL=/path/or/hf-id python benchmark.py [--quick]
"""

from __future__ import annotations

import datetime as dt
import json
import os
import platform
import sys
import time
import urllib.request

import numpy as np

import pipeline as P

CACHE = os.environ.get("BENCH_CACHE", "/tmp/rafiqi-bench")
OUT = os.path.join(os.path.dirname(__file__), "results")
API = "https://api.qurancdn.com/api/qdc/audio/reciters/{rid}/audio_files?chapter={ch}&segments=true"
RECITERS = {6: "husary_murattal", 7: "alafasy_murattal", 9: "minshawi_murattal"}
CHAPTERS = [1, 112, 113, 114]


def _get(url: str, path: str) -> str:
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        req = urllib.request.Request(url, headers={"User-Agent": "rafiqi-feasibility/0.1"})
        with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
            f.write(r.read())
    return path


def load_chapter(rid: int, ch: int):
    meta_p = _get(API.format(rid=rid, ch=ch), f"{CACHE}/{rid}/{ch}.json")
    meta = json.load(open(meta_p))["audio_files"][0]
    audio_p = _get(meta["audio_url"], f"{CACHE}/{rid}/{ch}.mp3")
    wave = P.load_audio(audio_p)
    timings = {}
    for v in meta["verse_timings"]:
        s, a = map(int, v["verse_key"].split(":"))
        segs = [(int(x[0]) - 1, float(x[1]), float(x[2])) for x in v["segments"] if len(x) >= 3]
        timings[a] = dict(start=v["timestamp_from"], end=v["timestamp_to"], words=segs)
    return wave, timings, meta["audio_url"]


def cut(wave, ms0, ms1):
    a, b = int(ms0 * 16), int(ms1 * 16)
    return wave[max(0, a): min(len(wave), b)]


def join(parts, fade_ms=15):
    n = int(fade_ms * 16)
    out = []
    for p in parts:
        p = p.copy()
        if len(p) > 2 * n:
            ramp = np.linspace(0, 1, n, dtype=np.float32)
            p[:n] *= ramp
            p[-n:] *= ramp[::-1]
        out.append(p)
    return np.concatenate(out) if out else np.zeros(0, np.float32)


def word_spans(t):
    """Word boundaries for one ayah; first word starts at the ayah start,
    last word extends to the ayah end (to keep the final stop intact)."""
    w = t["words"]
    spans = []
    for i, (k, s, e) in enumerate(w):
        s = t["start"] if i == 0 else s
        e = t["end"] if i == len(w) - 1 else w[i + 1][1]
        spans.append((k, s, e))
    return spans


def build_cases(quick: bool):
    cases = []
    data = {}
    for rid in RECITERS:
        for ch in CHAPTERS:
            try:
                data[(rid, ch)] = load_chapter(rid, ch)
            except Exception as e:
                print(f"skip reciter {rid} ch {ch}: {e}", file=sys.stderr)

    # 1) Correct recitations, ayah by ayah, three reciters.
    for (rid, ch), (wave, tim, url) in data.items():
        for a, t in sorted(tim.items()):
            if ch == 1 and a == 1:
                continue  # skip basmala; handled as ordinary ayah elsewhere
            if quick and a > 2:
                continue
            cases.append(dict(
                id=f"correct_{RECITERS[rid]}_{ch}_{a}", category="correct", reciter=RECITERS[rid],
                sura=ch, aya_from=a, aya_to=a, wave=cut(wave, t["start"], t["end"]),
                label=dict(errors=[]), source=url,
            ))

    # 2) Constructed memorisation errors (Husary only, cleanest timings).
    hus = {ch: data[(6, ch)] for ch in CHAPTERS if (6, ch) in data}
    targets = [(1, 2, 1), (1, 4, 1), (1, 5, 2), (1, 7, 3), (112, 3, 1), (112, 4, 2), (113, 2, 1), (114, 4, 2)]
    if quick:
        targets = targets[:2]
    for ch, a, k in targets:
        if ch not in hus:
            continue
        wave, tim, url = hus[ch]
        sp = word_spans(tim[a])
        if k >= len(sp) - 0:
            continue
        segs = [cut(wave, s, e) for _, s, e in sp]
        # omission of interior word k
        cases.append(dict(id=f"omit_{ch}_{a}_w{k}", category="word_omission", reciter="husary_murattal",
                          sura=ch, aya_from=a, aya_to=a, wave=join(segs[:k] + segs[k + 1:]),
                          label=dict(errors=[dict(kind="omission", word=k)]), source=url))
        # repetition of word k
        cases.append(dict(id=f"repeat_{ch}_{a}_w{k}", category="word_repetition", reciter="husary_murattal",
                          sura=ch, aya_from=a, aya_to=a, wave=join(segs[:k + 1] + [segs[k]] + segs[k + 1:]),
                          label=dict(errors=[dict(kind="repetition", word=k)]), source=url))
        # substitution: word k replaced by a different word from the same ayah
        j = (k + 1) if k + 1 < len(segs) else k - 1
        if j >= 0 and j != k:
            cases.append(dict(id=f"subst_{ch}_{a}_w{k}", category="word_substitution", reciter="husary_murattal",
                              sura=ch, aya_from=a, aya_to=a,
                              wave=join(segs[:k] + [segs[j]] + segs[k + 1:]),
                              label=dict(errors=[dict(kind="substitution", word=k, replaced_by_word=j)]), source=url))

    # 3) Ayah omission inside a multi-ayah passage.
    for ch, (a0, a1, skip) in [(112, (1, 4, 3)), (113, (1, 5, 4)), (114, (1, 6, 2))][: 1 if quick else 3]:
        if ch not in hus:
            continue
        wave, tim, url = hus[ch]
        parts = [cut(wave, tim[a]["start"], tim[a]["end"]) for a in range(a0, a1 + 1) if a != skip]
        cases.append(dict(id=f"ayah_omit_{ch}_{a0}-{a1}_skip{skip}", category="ayah_omission", reciter="husary_murattal",
                          sura=ch, aya_from=a0, aya_to=a1, wave=join(parts),
                          label=dict(errors=[dict(kind="ayah_omission", aya=skip)]), source=url))
        full = [cut(wave, tim[a]["start"], tim[a]["end"]) for a in range(a0, a1 + 1)]
        cases.append(dict(id=f"correct_multi_{ch}_{a0}-{a1}", category="correct_multi", reciter="husary_murattal",
                          sura=ch, aya_from=a0, aya_to=a1, wave=join(full), label=dict(errors=[]), source=url))

    # 4) Wrong passage: user picks one ayah, recites another (expect abstention).
    for (ch, a_said), (ch2, a_ref) in [((112, 1), (113, 1)), ((1, 2), (1, 4))]:
        if ch not in hus:
            continue
        wave, tim, url = hus[ch]
        cases.append(dict(id=f"wrong_passage_said{ch}_{a_said}_ref{ch2}_{a_ref}", category="wrong_passage",
                          reciter="husary_murattal", sura=ch2, aya_from=a_ref, aya_to=a_ref,
                          wave=cut(wave, tim[a_said]["start"], tim[a_said]["end"]),
                          label=dict(errors=[dict(kind="wrong_passage", actual=f"{ch}:{a_said}")]), source=url))
    return cases


def score(case, r):
    flagged = {w["idx"] for w in r["words"] if w["status"] in ("suspected", "tajweed")}
    normal_flag = {w for e in r["errors"] if e["error_type"] != "tajweed" for w in e["word_indices"]}
    tajweed_flag = {w for e in r["errors"] if e["error_type"] == "tajweed" for w in e["word_indices"]}
    words = r["words"]
    s = dict(
        reliable=r["reliable"], per=r["phoneme_error_rate"],
        flagged_words=sorted(flagged), non_tajweed_flagged_words=sorted(normal_flag),
        tajweed_flagged_words=sorted(tajweed_flag), n_words=len(words),
    )
    top = (r.get("verse_search") or [{}])[0]
    if "start" in top:
        s["verse_search_top"] = f'{top["start"]["sura"]}:{top["start"]["aya"]}'
    cat = case["category"]
    if cat.startswith("correct"):
        s["false_alert_words_non_tajweed"] = len(normal_flag) if r["reliable"] else 0
        s["false_alert_words_tajweed"] = len(tajweed_flag) if r["reliable"] else 0
        s["verse_id_correct"] = s.get("verse_search_top") == f'{case["sura"]}:{case["aya_from"]}'
    elif cat == "wrong_passage":
        s["abstained"] = not r["reliable"]
    else:
        lab = case["label"]["errors"][0]
        if lab["kind"] == "ayah_omission":
            aya_words = {w["idx"] for w in words if w["aya"] == lab["aya"]}
            hit = aya_words & normal_flag
            s["detected"] = r["reliable"] and len(hit) > 0
            s["location_correct"] = s["detected"] and len(hit) >= max(1, len(aya_words) // 2)
            s["ayah_words_flagged"] = f"{len(hit)}/{len(aya_words)}"
            s["outside_target_flags"] = sorted(normal_flag - aya_words)
        else:
            k = lab["word"]
            # repetition is an insertion: accept the repeated word or its neighbour
            ok_loc = {k, k + 1} if lab["kind"] == "repetition" else {k}
            s["detected"] = r["reliable"] and len(normal_flag) > 0
            s["location_correct"] = r["reliable"] and bool(normal_flag & ok_loc)
            s["outside_target_flags"] = sorted(normal_flag - ok_loc - {k - 1, k + 1})
    return s


def main():
    quick = "--quick" in sys.argv
    os.makedirs(OUT, exist_ok=True)
    P.load_model()
    cases = build_cases(quick)
    print(f"{len(cases)} cases")
    import gc

    rows_path = os.path.join(OUT, "rows.jsonl")
    done = {}
    if os.path.exists(rows_path) and "--fresh" not in sys.argv:
        for line in open(rows_path):
            row = json.loads(line)
            done[row["id"]] = row
    rows, not_run = [], []
    max_s = float(os.environ.get("BENCH_MAX_SECONDS", "45"))
    for c in cases:
        dur = len(c["wave"]) / P.SAMPLE_RATE
        if dur > max_s:
            # Recorded, not hidden: on the 4 GB sandbox a 46 s clip was OOM-killed.
            not_run.append(dict(id=c["id"], audio_seconds=round(dur, 1),
                                reason=f"exceeds {max_s:.0f} s memory budget on 4 GB RAM (process was OOM-killed)"))
            continue
        if c["id"] in done:
            rows.append(done[c["id"]])
            continue
        r = P.analyze(c["wave"], c["sura"], c["aya_from"], c["aya_to"], run_search=c["category"].startswith("correct"))
        s = score(c, r)
        row = dict(
            id=c["id"], category=c["category"], reciter=c["reciter"],
            passage=f'{c["sura"]}:{c["aya_from"]}-{c["aya_to"]}', label=c["label"], source=c["source"],
            score=s, timing=r["timing"],
            output=dict(
                reference_phonemes=r["reference_phonemes"], predicted_phonemes=r["predicted_phonemes"],
                errors=[{k: e[k] for k in ("error_type", "speech_error_type", "expected_ph", "preditected_ph",
                                            "expected_len", "predicted_len", "word_indices", "has_tajweed_evidence")}
                        | {"rules": [x["name"]["en"] for x in (e.get("ref_tajweed_rules") or [])]}
                        for e in r["errors"]],
                words=[{k: w[k] for k in ("idx", "aya", "text", "status")} for w in r["words"]],
                abstain_reason=r["abstain_reason"], mean_phoneme_prob=r["mean_phoneme_prob"],
                min_phoneme_prob=r["min_phoneme_prob"],
            ),
        )
        rows.append(row)
        with open(rows_path, "a") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
        print(c["id"], json.dumps(s, ensure_ascii=False), flush=True)
        del r
        gc.collect()
    meta = dict(
        generated_at=dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        model=P.MODEL_ID if not os.path.isdir(P.MODEL_ID) else "obadx/muaalem-model-v3_2 (local copy)",
        hardware=dict(cpu_threads=os.cpu_count(), gpu=None, machine=platform.machine(), python=platform.python_version()),
        model_load_seconds=round(P.load_model().load_seconds, 1),
        teacher_reviewed=False,
        not_run=not_run,
        notes="Constructed labels on spliced professional recitations. Not learner speech. Not teacher reviewed.",
    )
    json.dump(dict(meta=meta, rows=rows), open(os.path.join(OUT, "benchmark-results.json"), "w"), ensure_ascii=False, indent=1)
    print("wrote", os.path.join(OUT, "benchmark-results.json"))


if __name__ == "__main__":
    main()
