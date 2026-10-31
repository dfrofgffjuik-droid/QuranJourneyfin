# Extracts Hisn al-Muslim (official Arabic edition published by Risalat al-Haramain,
# https://risala.prh.gov.sa/ar/content/51) into structured items, verbatim.
import re, html, json, sys
from html.parser import HTMLParser

SRC = sys.argv[1] if len(sys.argv) > 1 else 'risala.html'
s = open(SRC, encoding='utf-8', errors='ignore').read()

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.paras = []; self.cur = None; self.stack = []; self.in_sup = False
    def kind(self):
        for st in reversed(self.stack):
            if st is None: continue
            if '187600' in st or 'KFGQPC' in st: return 'q'
            if '000D80' in st.upper(): return 'h'
        return 'p'
    def handle_starttag(self, tag, a):
        a = dict(a)
        if tag == 'p': self.cur = []; self.stack = []
        elif tag == 'span': self.stack.append(a.get('style', ''))
        elif tag == 'a' and self.cur is not None and (a.get('href') or '').startswith('#note-'):
            self.cur.append(('fn', int(a['href'][6:])))
        elif tag == 'sup': self.in_sup = True
    def handle_endtag(self, tag):
        if tag == 'p' and self.cur is not None: self.paras.append(self.cur); self.cur = None
        elif tag == 'span' and self.stack: self.stack.pop()
        elif tag == 'sup': self.in_sup = False
    def handle_data(self, d):
        if self.cur is None or self.in_sup: return
        k = self.kind()
        if self.cur and self.cur[-1][0] == k: self.cur[-1] = (k, self.cur[-1][1] + d)
        else: self.cur.append((k, d))
p = P(); p.feed(s)
paras = p.paras
text = lambda toks: ''.join(t for k, t in toks if k != 'fn').strip()

# Chapter headings: first run of "N. title" paragraphs 1..132 in order.
heads = []; want = 1
for i, toks in enumerate(paras):
    t = text(toks)
    m = re.match(r'^(\d{1,3})\s*\.\s*(.{3,90})$', t)
    if m and int(m.group(1)) == want and not any(k == 'fn' for k, _ in toks):
        heads.append((i, want, m.group(2).strip())); want += 1
        if want > 132: break
# Footnote bodies: paragraphs beginning with "( )" after the last chapter.
fn_paras = []
for i in range(heads[-1][0], len(paras)):
    t = text(paras[i])
    if re.match(r'^\(\s*\)', t): fn_paras.append([re.sub(r'^\(\s*\)\s*', '', t)])
    elif fn_paras and t and not re.match(r'^\d{1,3}\s*\.', t) and len(fn_paras) < 400: fn_paras[-1].append(t)
refs = [v for toks in paras for k, v in toks if k == 'fn']
_bodies = [' '.join(x).strip() for x in fn_paras]
# The page lists the body of footnote 1 (about the book's original) last; every other body is in order.
notes = {1: re.sub(r'\s*استخدم رمز الاستجابة.*$', '', _bodies[-1])}
notes.update({n: _bodies[n - 2] for n in range(2, len(_bodies) + 1)})

def chapter_paras(n):
    a = heads[n - 1][0] + 1
    b = heads[n][0] if n < len(heads) else None
    if b is None:  # last chapter ends where footnotes start
        b = next(i for i in range(a, len(paras)) if re.match(r'^\(\s*\)', text(paras[i])))
    return paras[a:b]

NUM = [(r'مِائَةَ|مِائَة|مائة', 100), (r'أَرْبَعًا وَثَلَاثِينَ|أربعا وثلاثين', 34), (r'ثَلَاثًا وَثَلَاثِينَ|ثلاثا وثلاثين', 33), (r'عَشْرَ|عشر', 10), (r'سَبْعَ|سبع', 7), (r'أَرْبَعَ|أربع', 4), (r'ثَلَاثَ|ثلاث|ثَلاثَ|ثَلَاثًا', 3), (r'مَرَّتَيْنِ|مرتين', 2)]
def strip_marks(x): return re.sub(r'[\u064B-\u0652\u0670\u0640]', '', x)
def count_of(plain):
    p0 = strip_marks(plain)
    hits = []
    for pat, n in NUM:
        if re.search(strip_marks(pat) + r'\s*(مرات|مرة|مرات)?', p0) and re.search(r'مر', p0): hits.append(n)
    return hits

def items_of(n):
    out = []; cur = []
    for toks in chapter_paras(n):
        if not text(toks): continue
        cur.extend(toks + [('br', '\n')])
        # Close an item when the paragraph ends with a footnote (only punctuation after it).
        last_fn = max((i for i, (k, _) in enumerate(toks) if k == 'fn'), default=-1)
        tail = ''.join(t for k, t in toks[last_fn + 1:] if k != 'fn') if last_fn >= 0 else None
        if last_fn >= 0 and re.fullmatch(r'[\s().،.]*', tail or ''):
            out.append(cur); cur = []
    if cur: out.append(cur)
    res = []
    for toks in out:
        while toks and toks[-1][0] == 'br': toks.pop()
        segs = []
        for k, t in toks:
            if k == 'br':
                if segs and segs[-1]['k'] != 'br': segs.append({'k': 'br'})
            elif k == 'fn': segs.append({'k': 'fn', 'n': t})
            else:
                if segs and segs[-1]['k'] == k: segs[-1]['t'] += t
                else: segs.append({'k': k, 't': t})
        # Drop the literal "(" ")" wrappers around footnote numbers (presentation only).
        for i, sg in enumerate(segs):
            if sg['k'] == 'p':
                if i + 1 < len(segs) and segs[i + 1]['k'] == 'fn': sg['t'] = re.sub(r'\($', '', sg['t'])
                if i > 0 and segs[i - 1]['k'] == 'fn': sg['t'] = re.sub(r'^\)', '', sg['t'])
        segs = [x for x in segs if x['k'] in ('fn', 'br') or x['t'] != '']
        fns = [x['n'] for x in segs if x['k'] == 'fn']
        plain = ''.join(x.get('t', '') for x in segs if x['k'] == 'p')
        has = any(x['k'] in ('h', 'q') for x in segs)
        res.append({'segs': segs, 'fns': fns, 'plain': plain, 'dhikr': has, 'counts': count_of(plain)})
    return res

if __name__ == '__main__':
    print('chapters', len(heads), 'footnote refs', len(refs), 'sequential', refs == list(range(1, len(refs) + 1)), 'bodies', len(notes))
    for n in [1, 25, 27, 28]:
        its = items_of(n)
        print('\n#', n, heads[n - 1][2], len(its))
        for it in its: print(' -', it['dhikr'], it['counts'], it['fns'], ''.join(x.get('t', '') for x in it['segs'])[:90].replace('\n', ' '))
