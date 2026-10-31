import { useState } from 'react'
import { Findings } from './Findings'
import { Harness } from './Harness'
import { Benchmark } from './Benchmark'
import { Concepts } from './Concepts'

const TABS = [
  { id: 'findings', label: 'Findings' },
  { id: 'harness', label: 'Test harness' },
  { id: 'benchmark', label: 'Benchmark' },
  { id: 'concepts', label: 'UX concepts' },
] as const
type Tab = (typeof TABS)[number]['id']

// Developer-only area (route #/dev). Tabs use local state so they don't
// interfere with the product's hash router.
export default function DevLab() {
  const [tab, setTab] = useState<Tab>('findings')
  const go = (t: string) => {
    setTab(t as Tab)
    scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-6 pb-0 pt-8">
          <div className="pb-5">
            <p dir="rtl" lang="ar" className="font-naskh text-3xl font-semibold leading-none">
              القرآن رفيقي
            </p>
            <p className="mt-2 text-sm text-ink/60">Developer area · recitation AI feasibility lab</p>
            <a href="#/" className="mt-2 inline-block text-xs text-moss underline">← Back to the app</a>
          </div>
          <nav className="flex gap-1" aria-label="Sections">
            {TABS.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => go(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`border-b-2 px-4 pb-4 text-sm transition ${tab === t.id ? 'border-ink font-medium text-ink' : 'border-transparent text-ink/55 hover:text-ink'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-12">
        {tab === 'findings' && <Findings go={go} />}
        {tab === 'harness' && <Harness />}
        {tab === 'benchmark' && <Benchmark />}
        {tab === 'concepts' && <Concepts />}
      </main>
      <footer className="border-t border-rule">
        <div className="mx-auto max-w-7xl space-y-1 px-6 py-6 text-xs text-ink/55">
          <p>
            Quran text: Tanzil Quran Text (Uthmani 1.1), © 2007–2024 Tanzil Project, CC BY 3.0, reproduced verbatim.{' '}
            <a className="underline" href="https://tanzil.net" target="_blank" rel="noreferrer">
              tanzil.net
            </a>
          </p>
          <p>Engines: Quran Muaalem (QML-1.0; weights MIT) · Tilawa (code MIT; model NPL-1.2). Free, no ads. AI feedback can be wrong and does not replace a qualified teacher.</p>
        </div>
      </footer>
    </div>
  )
}
