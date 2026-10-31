"""Real Quran Muaalem inference + correction pipeline (feasibility harness).

Nothing here fabricates output: every field returned by `analyze()` comes from
the obadx/muaalem-model-v3_2 forward pass, `quran_transcript.quran_phonetizer`
(reference phonemes built from the bundled Tanzil Uthmani text) and
`quran_transcript.explain_error` (alignment of predicted vs reference phonemes).
The only logic added here is bookkeeping: grouping errors per Uthmani word,
separating the four task families, and abstaining when evidence is weak.
"""

from __future__ import annotations

import os
import time
from dataclasses import asdict, is_dataclass
from typing import Any

import numpy as np

SAMPLE_RATE = 16000
MODEL_ID = os.environ.get("MUAALEM_MODEL", "obadx/muaalem-model-v3_2")

# Abstention thresholds. These are conservative engineering heuristics, NOT
# calibrated values (Muaalem docs state Unit.probs are uncalibrated).
MAX_PER_FOR_FEEDBACK = 0.35  # above this, we refuse to give word-level feedback
LOW_CONF_PHONEME = 0.60  # predicted phoneme prob below this is "uncertain"

_model = None
_search = None


def _jsonable(x: Any) -> Any:
    if hasattr(x, "model_dump"):  # pydantic (MoshafAttributes)
        return _jsonable(x.model_dump())
    if is_dataclass(x):
        return {k: _jsonable(v) for k, v in asdict(x).items()}
    if isinstance(x, dict):
        return {k: _jsonable(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [_jsonable(v) for v in x]
    if hasattr(x, "tolist"):
        return x.tolist()
    return x


def load_model():
    """Load Muaalem in bfloat16 on CPU (the dtype it was trained in)."""
    global _model
    if _model is not None:
        return _model
    import torch
    from transformers import AutoFeatureExtractor
    from quran_muaalem import Muaalem
    from quran_muaalem.modeling.modeling_multi_level_ctc import (
        Wav2Vec2BertForMultilevelCTC,
    )
    from quran_muaalem.modeling.multi_level_tokenizer import MultiLevelTokenizer

    torch.set_num_threads(max(1, (os.cpu_count() or 2)))
    t0 = time.perf_counter()
    # Same as Muaalem.__init__, but loads weights directly in bf16 to halve
    # peak RAM (the 2.4 GB fp32 checkpoint does not fit twice in 4 GB).
    m = Muaalem.__new__(Muaalem)
    m.device, m.dtype = "cpu", torch.bfloat16
    m.model = Wav2Vec2BertForMultilevelCTC.from_pretrained(
        MODEL_ID, torch_dtype=torch.bfloat16, low_cpu_mem_usage=True
    ).eval()
    m.multi_level_tokenizer = MultiLevelTokenizer(MODEL_ID)
    m.processor = AutoFeatureExtractor.from_pretrained(MODEL_ID)
    m.load_seconds = time.perf_counter() - t0
    _model = m
    return m


def load_audio(path_or_bytes) -> np.ndarray:
    import io

    import soundfile as sf
    import soxr

    src = io.BytesIO(path_or_bytes) if isinstance(path_or_bytes, bytes) else path_or_bytes
    wave, sr = sf.read(src, dtype="float32", always_2d=True)
    wave = wave.mean(axis=1)
    if sr != SAMPLE_RATE:
        wave = soxr.resample(wave, sr, SAMPLE_RATE)
    return wave.astype(np.float32)


def moshaf_attributes(overrides: dict | None = None):
    from quran_transcript import MoshafAttributes

    base = dict(
        rewaya="hafs",
        recitation_speed="murattal",
        madd_monfasel_len=4,
        madd_mottasel_len=4,
        madd_mottasel_waqf=4,
        madd_aared_len=4,
    )
    base.update(overrides or {})
    return MoshafAttributes(**base)


def get_passage(sura: int, aya_from: int, aya_to: int) -> list[dict]:
    """Verbatim Uthmani ayat from the Tanzil text bundled in quran_transcript."""
    from quran_transcript import Aya

    out = []
    for aya in range(aya_from, aya_to + 1):
        f = Aya(sura, aya).get()
        out.append(
            dict(
                sura=sura,
                aya=aya,
                sura_name=f.sura_name,
                uthmani=f.uthmani,
                words=list(f.uthmani_words),
            )
        )
    return out


def build_reference(ayat: list[dict], moshaf):
    """Phonetize each ayah separately (reciter stops at each ayah end, i.e. waqf)
    and concatenate, offsetting the char->phoneme mappings."""
    from quran_transcript import quran_phonetizer
    from quran_transcript.phonetics.conv_base_operation import MappingPos

    uth_parts, ph_parts, mappings, sifat = [], [], [], []
    words, char_to_word = [], []
    ph_off = 0
    for i, a in enumerate(ayat):
        if i > 0:  # separating space between ayat
            uth_parts.append(" ")
            mappings.append(MappingPos(pos=(ph_off, ph_off), deleted=True))
            char_to_word.append(-1)
        o = quran_phonetizer(a["uthmani"], moshaf, remove_spaces=True)
        for mp in o.mappings:
            mappings.append(
                MappingPos(
                    pos=(mp.pos[0] + ph_off, mp.pos[1] + ph_off),
                    tajweed_rules=mp.tajweed_rules,
                    deleted=mp.deleted,
                )
            )
        w0 = len(words)
        wi = 0
        for ch in a["uthmani"]:
            if ch == " ":
                char_to_word.append(-1)
                wi += 1
            else:
                char_to_word.append(w0 + wi)
        for k, w in enumerate(a["words"]):
            words.append(dict(idx=w0 + k, aya=a["aya"], sura=a["sura"], text=w))
        uth_parts.append(a["uthmani"])
        ph_parts.append(o.phonemes)
        sifat.extend(o.sifat)
        ph_off += len(o.phonemes)

    class Ref:  # duck-typed QuranPhoneticScriptOutput for Muaalem.__call__
        pass

    ref = Ref()
    ref.phonemes = "".join(ph_parts)
    ref.sifat = sifat
    ref.mappings = mappings
    ref.uthmani = "".join(uth_parts)
    ref.words = words
    ref.char_to_word = char_to_word
    return ref


def _levenshtein(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def identify_verse(predicted_ph: str, error_ratio: float = 0.1) -> list[dict]:
    """Task 1 (verse detection), using Muaalem's own phonetic search index."""
    global _search
    from quran_transcript.phonetics.search import (
        NoPhonemesSearchResult,
        PhoneticSearch,
    )

    if _search is None:
        _search = PhoneticSearch()
    try:
        res = _search.search(predicted_ph, error_ratio=error_ratio)
    except NoPhonemesSearchResult:
        return []
    except Exception as e:  # search is best-effort; never fake a match
        return [dict(error=f"search failed: {e}")]
    out = []
    for r in res[:5]:
        out.append(
            dict(
                start=dict(sura=r.start.sura_idx, aya=r.start.aya_idx, word=r.start.uthmani_word_idx),
                end=dict(sura=r.end.sura_idx, aya=r.end.aya_idx, word=r.end.uthmani_word_idx),
                uthmani_text=_search.get_uthmani_from_result(r),
            )
        )
    return out


def analyze(
    wave: np.ndarray,
    sura: int,
    aya_from: int,
    aya_to: int,
    moshaf_overrides: dict | None = None,
    run_search: bool = True,
) -> dict:
    from quran_transcript import explain_error

    m = load_model()
    moshaf = moshaf_attributes(moshaf_overrides)
    ayat = get_passage(sura, aya_from, aya_to)
    ref = build_reference(ayat, moshaf)

    t0 = time.perf_counter()
    out = m([wave], [ref], sampling_rate=SAMPLE_RATE)[0]
    infer_s = time.perf_counter() - t0

    pred = out.phonemes.text
    probs = [float(p) for p in (out.phonemes.probs.tolist() if hasattr(out.phonemes.probs, "tolist") else out.phonemes.probs)]

    t1 = time.perf_counter()
    errors = explain_error(
        uthmani_text=ref.uthmani,
        ref_ph_text=ref.phonemes,
        predicted_ph_text=pred,
        mappings=ref.mappings,
    )
    explain_s = time.perf_counter() - t1

    per = _levenshtein(ref.phonemes, pred) / max(1, len(ref.phonemes))
    audio_s = len(wave) / SAMPLE_RATE

    # Group errors by Uthmani word.
    word_errors: dict[int, list[int]] = {}
    err_json = []
    for i, e in enumerate(errors):
        ej = _jsonable(e)
        s, t = e.uthmani_pos
        idxs = sorted({ref.char_to_word[c] for c in range(s, max(t, s + 1)) if 0 <= c < len(ref.char_to_word) and ref.char_to_word[c] >= 0})
        if not idxs and 0 <= s < len(ref.char_to_word):  # insertion at a space
            near = [w for w in ref.char_to_word[max(0, s - 1): s + 2] if w >= 0]
            idxs = near[:1]
        ej["word_indices"] = idxs
        # A Tajweed claim is only surfaced when the explainer attached a rule.
        ej["has_tajweed_evidence"] = bool(
            e.error_type == "tajweed" and (e.ref_tajweed_rules or e.replaced_tajweed_rules or e.missing_tajweed_rules or e.inserted_tajweed_rules)
        )
        err_json.append(ej)
        for w in idxs:
            word_errors.setdefault(w, []).append(i)

    reliable = per <= MAX_PER_FOR_FEEDBACK
    low_conf = [i for i, p in enumerate(probs) if p < LOW_CONF_PHONEME]

    words = []
    for w in ref.words:
        eids = word_errors.get(w["idx"], [])
        kinds = sorted({err_json[i]["error_type"] for i in eids})
        status = "ok" if not eids else ("tajweed" if kinds == ["tajweed"] else "suspected")
        words.append({**w, "status": status if reliable else "unassessed", "error_ids": eids})

    return dict(
        model=MODEL_ID,
        passage=dict(sura=sura, aya_from=aya_from, aya_to=aya_to, ayat=ayat),
        moshaf=_jsonable(moshaf),
        reference_phonemes=ref.phonemes,
        predicted_phonemes=pred,
        phoneme_probs=probs,
        phoneme_error_rate=round(per, 4),
        reliable=reliable,
        abstain_reason=None
        if reliable
        else f"Phoneme error rate {per:.2f} exceeds {MAX_PER_FOR_FEEDBACK}: audio may be a different passage, unclear, or outside model coverage. No word-level correction is given.",
        low_confidence_phoneme_count=len(low_conf),
        min_phoneme_prob=round(min(probs), 4) if probs else None,
        mean_phoneme_prob=round(float(np.mean(probs)), 4) if probs else None,
        errors=err_json,
        words=words,
        verse_search=identify_verse(pred) if run_search else None,
        timing=dict(
            audio_seconds=round(audio_s, 3),
            inference_seconds=round(infer_s, 3),
            explain_seconds=round(explain_s, 3),
            real_time_factor=round(infer_s / max(audio_s, 1e-6), 3),
            model_load_seconds=round(getattr(m, "load_seconds", 0.0), 2),
        ),
        hardware=dict(device="cpu", dtype="bfloat16", threads=os.cpu_count()),
    )
