export function Findings({ go }: { go: (t: string) => void }) {
  return (
    <div className="space-y-14">
      <header className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">Deliverable 1 · Feasibility verdict</p>
          <h2 className="font-display text-[2.75rem] leading-[1.1]">
            A genuine test runs here, on CPU. It shows that word-level checking is promising. It does not yet show that Tajweed grading works.
          </h2>
          <p className="max-w-2xl leading-relaxed text-ink/75">
            The real <span className="font-mono text-sm">obadx/muaalem-model-v3_2</span> weights were downloaded and run on this sandbox's CPU, with no GPU and no external AI API. The
            correction pipeline is Muaalem's own (<span className="font-mono text-sm">quran_phonetizer → model → explain_error</span>). Tilawa was also run on the same clips. Everything on the
            Benchmark tab comes from those runs.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button type="button" onClick={() => go('harness')} className="rounded-full bg-ink px-5 py-2.5 text-sm text-paper hover:bg-moss">
              Open the test harness
            </button>
            <button type="button" onClick={() => go('benchmark')} className="rounded-full border border-ink px-5 py-2.5 text-sm hover:bg-ink hover:text-paper">
              See benchmark results
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-rule bg-sheet p-6">
          <h3 className="text-sm font-semibold">Environment inspected</h3>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {[
              ['Project', 'Vite 8 + React 19 + Tailwind 4. Frontend only, no backend'],
              ['Sandbox', 'Linux x86-64 · 6 vCPU · 4.1 GB RAM · no swap'],
              ['GPU', 'None'],
              ['Python', '3.13. torch 2.15 CPU, transformers 4.55.2 (5.x breaks Muaalem)'],
              ['Network', 'Hugging Face, PyPI, npm reachable; GitHub API rate-limited'],
              ['Disk', '≈4.9 GB free at start; weights + torch use ≈4 GB'],
              ['Deployed site', 'Static hosting only, so a Python model cannot run there'],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink/55">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <section className="space-y-5">
        <h3 className="font-display text-2xl">Where each piece can run</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Sandbox (this preview)" status="works">
            Muaalem runs as a local Python service (<code className="font-mono text-xs">poc/muaalem/server.py</code>). The preview reaches it through a dev-only Vite proxy at{' '}
            <code className="font-mono text-xs">/muaalem</code>. Audio stays on this machine. Memory is tight: about 3.3 GB peak. Runs were OOM-killed first because memory grew across runs (fixed with gc and MALLOC_ARENA_MAX=2), and again on a 46 s clip. The practical limit is about 40 s per clip on 4 GB.
          </Card>
          <Card title="Published Figma Make site" status="blocked">
            Static hosting has no Python, no 2.4 GB model, and no proxy target. Muaalem cannot run there, and the harness shows "service offline" without inventing results.
          </Card>
          <Card title="Learner's phone / browser" status="partly">
            Tilawa can (66 MB ONNX, WASM). Muaalem cannot today: it would need ONNX export plus int8 quantisation (a 600M-parameter Wav2Vec2-BERT is likely about 600 MB). This is still
            unproven.
          </Card>
        </div>
      </section>

      <section className="space-y-5">
        <h3 className="font-display text-2xl">The two engines, read from their own docs and licences</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <Engine
            name="Quran Muaalem"
            role="Primary candidate: phonetic and Tajweed-related differences"
            facts={[
              ['What it outputs', 'Quranic phonetic script (phonemes incl. madd lengths, ghunnah, qalqalah markers) plus 10 sifat per phoneme. explain_error aligns this to the reference and tags differences as normal / tashkeel / tajweed.'],
              ['Tajweed coverage', 'Rule-backed checks listed in docs: qalqalah and madd counts (natural, munfasil, muttasil, lazim, ʿarid, leen). Ghunnah, tafkhim etc. appear only as sifat probabilities, with no rule verdict.'],
              ['Model', '660M-param Wav2Vec2-BERT multi-level CTC. Trained on professional reciters, not learners (paper: arXiv 2509.00094).'],
              ['Code licence', 'QML-1.0 = Apache-2.0 + conditions: show the AI notice before first use, comply with Sharia, never run ads, and keep a free path if charging. Rafiqi (free, no ads) fits.'],
              ['Weights / data', 'obadx/muaalem-model-v3_2 and muaalem-annotated-v3 are tagged MIT on Hugging Face.'],
              ['Reference text', 'Tanzil Uthmani 1.1, CC BY 3.0, verbatim only, with attribution and a link required.'],
            ]}
          />
          <Engine
            name="Tilawa"
            role="Complement: which verse, where am I, did I skip?"
            facts={[
              ['What it outputs', 'Streaming verse_match, word_progress, and correction issues: possible omission, substitution, vowel, repetition, skipped ayah. Its docs say plainly: “No pronunciation/tajweed grade is produced.”'],
              ['Runtime', 'Pure-TS @tilawa/core + onnxruntime (web / node / React Native). Fully offline. 66 MB int8 Zipformer.'],
              ['Code licence', 'MIT.'],
              ['Model / corpus licence', 'NPL-1.2 (Quran-Lab): non-commercial, share-alike, must stay free. Derivatives include models fine-tuned or evaluated with it. Needs legal review before shipping.'],
              ['Training data', 'EveryAyah (MIT), QUA (CC-BY-4.0), and Iqra, RetaSy, TLOG (licences unstated). Unclear provenance must be resolved.'],
            ]}
          />
        </div>
      </section>

      <section className="space-y-5">
        <h3 className="font-display text-2xl">Four different questions, kept apart</h3>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ['Which verse is this?', 'Verse identification', 'Muaalem phonetic search and Tilawa. Tested on correct clips.'],
            ['Did I say every word, once, in order?', 'Memorisation mistakes', 'Tested with spliced omissions, repetitions, substitutions, and skipped ayat.'],
            ['Did a sound come out differently?', 'Phonetic differences', 'Muaalem reports them. Not tested against real learner mispronunciations.'],
            ['Was the rule applied?', 'Tajweed assessment', 'Only rule-backed madd and qalqalah checks exist. UNTESTED on real Tajweed mistakes; false alerts seen on correct reciters.'],
          ].map(([q, t, s]) => (
            <div key={t} className="rounded-2xl border border-rule bg-sheet p-5">
              <p className="font-display text-lg leading-snug">{q}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-moss">{t}</p>
              <p className="mt-2 text-xs leading-relaxed text-ink/70">{s}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-display text-2xl">What is missing for a real verdict</h3>
          <ol className="list-decimal space-y-2 ps-5 text-sm leading-relaxed text-ink/80">
            <li>Consented learner recordings (adults first; children only with documented parental consent), about 30–60 min across levels, phones, and voices.</li>
            <li>Word- and phoneme-level annotations by at least two qualified teachers (ijazah holders), with disagreements resolved.</li>
            <li>Deliberate Tajweed-error recordings for each rule Muaalem claims (madd counts, qalqalah), plus negatives.</li>
            <li>A Moshaf profile per learner/teacher (madd lengths), because a mismatch alone produced false Tajweed flags.</li>
            <li>A hosting decision: a GPU/CPU server with explicit consent, or an ONNX on-device port of Muaalem (needs export + accuracy re-check).</li>
            <li>Licence review of NPL-1.2 obligations and of Tilawa's unstated-licence training sets; Tanzil attribution in the app.</li>
          </ol>
        </div>
        <div className="space-y-3">
          <h3 className="font-display text-2xl">Recommended next steps</h3>
          <ol className="list-decimal space-y-2 ps-5 text-sm leading-relaxed text-ink/80">
            <li>Run the protocol in <code className="font-mono text-xs">poc/BENCHMARK.md</code> with a teacher partner, using this harness unchanged.</li>
            <li>Ship word-level feedback first (memorisation), Tilawa-style on-device, worded as "possible".</li>
            <li>Keep Tajweed feedback behind a teacher-confirmation step (the Circle concept) until the benchmark supports it.</li>
            <li>Prototype a Muaalem ONNX export and measure size, speed, and agreement with the PyTorch output on the same clips.</li>
            <li>Calibrate abstention: the fixed 35% phoneme-error gate stopped one valid short-ayah substitution.</li>
          </ol>
        </div>
      </section>
    </div>
  )
}

function Card({ title, status, children }: { title: string; status: 'works' | 'blocked' | 'partly'; children: React.ReactNode }) {
  const s = { works: ['Works', 'bg-moss'], blocked: ['Blocked', 'bg-alert'], partly: ['Partly', 'bg-amber'] }[status]
  return (
    <div className="rounded-2xl border border-rule bg-sheet p-5">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{title}</h4>
        <span className="flex items-center gap-2 text-xs">
          <span className={`h-2 w-2 rounded-full ${s[1]}`} />
          {s[0]}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink/75">{children}</p>
    </div>
  )
}

function Engine({ name, role, facts }: { name: string; role: string; facts: string[][] }) {
  return (
    <div className="rounded-2xl border border-rule bg-sheet p-6">
      <h4 className="font-display text-2xl">{name}</h4>
      <p className="text-sm text-moss">{role}</p>
      <dl className="mt-4 space-y-3">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-medium uppercase tracking-wider text-ink/50">{k}</dt>
            <dd className="mt-0.5 text-sm leading-relaxed text-ink/85">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
