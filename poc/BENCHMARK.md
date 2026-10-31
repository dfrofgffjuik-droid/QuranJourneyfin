# Rafiqi recitation-AI benchmark

Status: **v0 engineering smoke test completed. Teacher-verified benchmark NOT COMPLETED.**

Raw outputs: `poc/muaalem/results/benchmark-results.json`,
`poc/muaalem/results/moshaf-sensitivity.json`, and `poc/tilawa/results/tilawa-results.json`
(mirrored into `src/data/` for the Benchmark tab). Every number below comes from those files.

## Part 1: what was actually run (v0, 29 Oct 2026)

**Hardware:** sandbox CPU, x86-64, 6 threads, 4.1 GB RAM, no GPU.
**Engines:** Muaalem `obadx/muaalem-model-v3_2` (bf16, torch 2.15 CPU, transformers 4.55.2).
Tilawa `@tilawa/core 0.4.0` + `zipformer_a0w_ep1_a05.int8.onnx` (onnxruntime-node 1.31.1).
**Audio:** professional murattal recitations by Husary, Alafasy, and Minshawi (QuranicAudio /
Quran.com chapter files). Al-Fatiha 2–7, Al-Ikhlas, Al-Falaq, An-Nas.
**Labels:** *constructed*. Clips were cut and spliced at Quran.com word timestamps, which are
independent of both engines. **No teacher review. No learner speech.**
**Reference:** Hafs, murattal, munfasil 4, muttasil 4, ʿarid 4 (one fixed setting for everyone).

### Correct recitations (63 single-ayah clips, 249 words; 2 multi-ayah passages)

| Reciter | Muaalem clips with 0 flags | False word flags (non-Tajweed) | False Tajweed flags | Muaalem verse ID | Tilawa false flags | Tilawa verse ID |
|---|---|---|---|---|---|---|
| Husary | 21/21 | 0 / 83 words | 0 | 19/21 | 0 | 21/21 |
| Alafasy | 18/21 | 3 / 83 | 1 | 18/21 | 0 | 21/21 |
| Minshawi | 9/21 | 1 / 83 | 12 | 19/21 | 0 | 21/21 |

- All 12 Minshawi Tajweed flags were *madd ʿarid: expected 4, heard 2*. Re-running the
  same 21 clips with ʿarid = 2 gave **0 Tajweed flags** and 1 other flag. These were
  reference-configuration mismatches, not recitation errors. A per-learner Moshaf profile is
  required.
- Alafasy non-Tajweed false alerts were deleted onset hamzas (`ءَ`) and a dropped `مَ`.
  They are most likely cut-boundary artefacts, but that has not been verified.
- Muaalem verse-ID misses are inherently ambiguous single ayat: 1:3 is also in the basmala
  (→ 1:1), and 114:6 matches part of 11:119. Verse ID needs context such as the previous ayah,
  which is what Tilawa tracks.
- The two correct multi-ayah passages (112:1–4, 113:1–5) had 0 flags.

### Known memorisation errors (Husary, spliced)

| Error | Cases | Muaalem detected | Muaalem located | Muaalem abstained | Tilawa detected | Tilawa located |
|---|---|---|---|---|---|---|
| Word omission | 8 | 8 | 8 | 0 | 4 | 4 |
| Word repetition | 8 | 8 | 8 | 0 | 0 | 0 |
| Word substitution (word from the same ayah) | 8 | 7 | 7 | 1 | 4 | 4 |
| Ayah omission in a passage | 3 | 3 | 3 | 0 | 2 | 2 |

- The one Muaalem miss was the abstention gate (PER 0.38 > 0.35) on a 3-word ayah, 1:4.
- One ayah omission (113:1–5, skipping 4) also flagged 2 words outside the skipped ayah.
- Tilawa's correction mode raises the first issue and then waits for a retry. It is designed to be
  conservative and documents that it skips boundary omissions and consecutive missing words.
- Caveat: splices create acoustic discontinuities that real slips do not. Recall on real
  learner mistakes is likely to be lower.

### Wrong passage (2 cases)

Muaalem abstained on both (PER 0.68 and 1.10) and gave no word corrections. Tilawa tracked
the verse that was actually recited.

### Cost and privacy

- Muaalem: median inference 1.17 s per clip (RTF ≈ 0.20), p90 3.0 s, max 17.5 s on a 41.6 s
  clip. About 3.3 GB peak RSS. A 46.4 s clip was OOM-killed and **not run**. Cold load ≈20 s.
  **Audio must leave the device** (Python server).
- Tilawa: median RTF ≈ 0.12 on CPU with a 66 MB model. Runs in-browser and offline, so **audio can
  stay on the device**.

### Not tested (no conclusions may be drawn)

- Real learner recitations: children, adult beginners, phones, noise, women's voices.
- Pronunciation errors (makharij, ح/ه, ض/د, ث/س …).
- **Tajweed errors of any kind.** Muaalem's rule-backed checks (madd counts, qalqalah)
  were only shown to stay quiet or flag configuration mismatches on correct audio.
- Teacher agreement, live streaming feedback, passages over 45 s, on-device Muaalem.

### Integration limits (Design Studio recitation preview)

- Recording limit: `server.py` rejects audio over `MUAALEM_MAX_SECONDS` (default 30 s) and
  reports it as `max_audio_seconds` on `/health`. The preview reads that value when the engine
  is reachable, falls back to 30 s otherwise, and stops recording just under the limit, so a
  learner is never allowed to record a clip the server will reject.
- The preview labels every automated result as an unverified experimental observation and shows
  no correctness scores for makharij or tajweed, because none of those categories were tested above.
- The Vite dev bridge only autostarts the service when the Python install exists and at least
  `MUAALEM_MIN_FREE_MB` (default 3600 MB) is free, given the ~3.3 GB peak RSS above. It is a
  local development service, not a production inference backend; the published app shows "offline".

## Part 2: protocol for the real benchmark (to run with a teacher partner)

**Consent & data**
1. Adults: written informed consent covering purpose, storage location, retention (default:
   delete after annotation), and right to withdraw. Children: parent/guardian consent plus the
   child's assent. No child recordings without both. Store recordings encrypted and access-controlled,
   keyed by pseudonymous IDs; collect no names in the audio metadata.
2. Recording: phones and laptops in quiet and normal-noise rooms, 16 kHz+ mono, 3–30 s per clip.

**Set (target ≈ 600 clips, ≈ 60–90 min)**

| Stratum | Clips | Notes |
|---|---|---|
| Correct, by level (child reader / adult beginner / hafiz) | 150 | Same passages as below; false-alert baseline |
| Word omission / repetition / substitution, natural (from memory) | 150 | Elicited by reciting from memory without the mushaf |
| Scripted word errors (read a teacher-prepared variant aloud) | 60 | Exact location known |
| Pronunciation: ح/ه, ع/ء, ض/د, ق/ك, ص/س, ط/ت, ذ/ز, ث/س | 80 | 10 each, minimal pairs in real words |
| Tajweed claimed by Muaalem: madd ṭabīʿī, munfaṣil, muttaṣil, lāzim, ʿāriḍ, līn (short / long) and qalqalah (missing) | 120 | 15 each, each with a matched correct take |
| Wrong passage / mutashābihāt | 40 | Look-alike verses |

**Annotation:** two qualified teachers (ijāzah) label each clip independently at the word level
and, for pronunciation/Tajweed, the letter level, using the Tanzil word index. Record each
teacher's Moshaf choices. Resolve disagreements with a third teacher and report Cohen's κ.

**Scoring (separately for each task):**
1. Verse ID: top-1 accuracy, with and without context.
2. Memorisation: per-word precision, recall, and F1. Location correct = same word (or ±1 for
   repetitions). Also the false alerts per 100 correct words.
3. Phonetic: per-letter detection rate for each minimal pair, plus false alerts.
4. Tajweed: per-rule sensitivity and specificity, with the Moshaf profile matched to the teacher.
5. Abstention: how often each engine abstains, and its accuracy when it does not abstain
   (selective accuracy).
6. Cost: RTF median/p90, peak memory, and the device each engine ran on.

**Decision gates (proposal):** show a feedback type to learners without teacher
confirmation only if precision ≥ 0.90 at the word level and false alerts ≤ 1 per 100 correct
words, both on the learner strata. Otherwise keep it teacher-confirmed (Circle) or hide it.
