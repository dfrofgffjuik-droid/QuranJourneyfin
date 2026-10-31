// Mirrors the production appearance rules (every `:root…` rule in the app's
// stylesheets) onto `.pv-root` so preview frames can each carry their own
// data-theme / data-palette / data-kids. Nothing is redefined: the values are
// read from the real stylesheet at runtime, so the preview cannot drift.
import { useEffect } from 'react'

/**
 * Declarations nested inside a rule (CSS nesting), e.g. the dev stylesheet's
 * `:root { --x: <static fallback>; @supports (…) { --x: color-mix(var(…)) } }`.
 * Without these only the fallback, computed from the default palette, is copied.
 */
function nested(rule: CSSGroupingRule | CSSStyleRule): string {
  let css = ''
  for (const c of Array.from(rule.cssRules ?? [])) {
    if (c instanceof CSSSupportsRule) {
      if (CSS.supports(c.conditionText)) css += nested(c)
    } else if (c instanceof CSSStyleRule) {
      if (c.selectorText === '&') css += ` ${c.style.cssText}`
    } else if ('style' in c) {
      css += ` ${(c as unknown as { style: CSSStyleDeclaration }).style.cssText}` // CSSNestedDeclarations
    }
  }
  return css
}

function collect(rules: CSSRuleList, out: string[]) {
  for (const r of Array.from(rules)) {
    if (r instanceof CSSStyleRule) {
      if (!r.selectorText.includes(':root')) continue
      const sel = r.selectorText
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.startsWith(':root'))
        .map((s) => s.replace(/^:root/, '.pv-root'))
      if (sel.length) out.push(`${sel.join(', ')} { ${r.style.cssText}${nested(r)} }`)
    } else if ('cssRules' in r && !(r instanceof CSSMediaRule)) {
      collect((r as CSSGroupingRule).cssRules, out)
    }
  }
}

export function useScopedThemes() {
  useEffect(() => {
    const el = document.createElement('style')
    el.dataset.pvTheme = ''
    const build = () => {
      const out: string[] = []
      for (const sh of Array.from(document.styleSheets)) {
        if (sh.ownerNode === el) continue
        try {
          collect(sh.cssRules, out)
        } catch {
          /* cross-origin sheet (Google Fonts) */
        }
      }
      el.textContent = out.join('\n')
    }
    build()
    document.head.appendChild(el)
    // Dev server may inject styles later (HMR); rebuild once things settle.
    const t = setTimeout(build, 600)
    return () => (clearTimeout(t), el.remove())
  }, [])
}
