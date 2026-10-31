# Regenerates hisn.json (dev tool, not bundled). Inputs, fetched beforehand into /tmp/az:
#   risala.html  <- https://risala.prh.gov.sa/ar/content/51  (official Arabic Hisn al-Muslim)
#   api_<ch>.json <- https://www.hisnmuslim.com/api/ar/<ch>.json (item numbers + counts cross-check)
# Run: python3 build.py   (fails loudly if footnote alignment guardrails break)
# Builds src/studio/next/azkar/hisn.json from the extracted book + hisnmuslim.com cross-check.
import json, re, sys, difflib, datetime
sys.argv = [sys.argv[0], '/tmp/az/risala.html']
exec(open('/tmp/az/extract.py').read().split("if __name__ == '__main__':")[0])
FOOT = dict(notes)
ROOT = '/workspaces/default/code'
SURAHS = json.load(open(f'{ROOT}/src/data/surahs.json'))['surahs']
name2n = {}
for x in SURAHS:
    name2n[strip_marks(x['ar'])] = x['n']; name2n[strip_marks(x['ar']).replace('ال', '', 1)] = x['n']
hafs = {}
def ayat(n):
    if n not in hafs: hafs[n] = json.load(open(f'{ROOT}/public/quran-hafs/{n}.json'))['ayat']
    return hafs[n]
CHAPTERS = [1,2,3,4,5,6,7,8,9,10,11,13,14,15,23,24,25,27,28,34,35,37,39,45,48,49,69,70,71,95,96,102,104,105,124,125,126,128,129,130,131]
WORDS = [('مائة', 100), ('مئة', 100), ('اربعا وثلاثين', 34), ('ثلاثا وثلاثين', 33), ('عشر', 10), ('سبع', 7), ('اربع', 4), ('ثلاث', 3), ('مرتين', 2)]
def norm(x): return re.sub(r'[إأآٱ]', 'ا', strip_marks(x)).replace('ى', 'ي')
def outside_quotes(segs):
    t = ''.join(x.get('t', '') for x in segs if x['k'] != 'fn')
    t = re.sub(r'«[^»]*»', ' ', t); t = re.sub(r'﴿[^﴾]*﴾', ' ', t); t = re.sub(r'\[[^\]]*\]', ' ', t)
    return t
def book_count(segs):
    t = norm(outside_quotes(segs))
    if 'مر' not in t: return 1
    for w, n in WORDS:
        if re.search(w + r'\S*\s*(مر|$)', t): return n
    return 1
def skel(x): return re.sub(r'[^\u0621-\u064A]', '', norm(x))
GRADE = re.compile(r'[^،.؛]*(?:صحح|صحّح|حسّن|حسن|بسند صحيح|إسناده|صحيح الإسناد|حسن الإسناد)[^،.؛]*')
TAKHRIJ = re.compile(r'رواه|أخرجه|البخاري|مسلم|أبو داود|الترمذي|النسائي|ابن ماجه|أحمد|الحاكم|انظر|الموطأ|ابن السني|الطبراني')
def api_items(c):
    d = json.loads(open(f'/tmp/az/api_{c}.json', encoding='utf-8-sig').read()); return d[list(d)[0]]
# Guardrails: footnote bodies must line up with their references (spot checks against known takhrij).
for ref, must in [(89, '597'), (90, 'المعوذات'), (97, '5082'), (132, '4008'), (14, '4569'), (15, '4023')]:
    assert must in FOOT[ref], f'footnote alignment broken at {ref}: {FOOT[ref][:80]}'
def inner_counts(t):
    t = norm(t); found = []
    for w, n in WORDS:
        if re.search(w + r'\S*\s*(مر|\))', t): found.append(n)
    return found
def api_text_count(t):
    o = re.sub(r'\(\([^)]*\)\)', ' ', t); o = re.sub(r'«[^»]*»', ' ', o); o = re.sub(r'﴿[^﴾]*﴾', ' ', o)
    o = norm(o)
    if 'مر' not in o: return 1
    for w, n in WORDS:
        if re.search(w + r'\S*\s*(مر|$)', o): return n
    return 1
out = {'items': [], 'chapters': {}, 'problems': []}
for c in CHAPTERS:
    out['chapters'][c] = re.sub(r'\s+', ' ', heads[c - 1][2].replace('ـ', ''))
    book = items_of(c)
    api = api_items(c)
    # Align book items to API items in order by text similarity (book may have an extra opening line).
    j = 0; pairs = []
    for it in book:
        bt = skel(''.join(x.get('t', '') for x in it['segs'] if x['k'] in ('h', 'q')))[:60]
        ft = skel(''.join(x.get('t', '') for x in it['segs'] if x['k'] != 'fn'))[:80]
        best = None
        for k in range(j, min(j + 3, len(api))):
            at = skel(api[k]['ARABIC_TEXT'])
            r = max(difflib.SequenceMatcher(None, bt, at[:60]).ratio(), difflib.SequenceMatcher(None, ft, at[:80]).ratio())
            if r > 0.55 and (best is None or r > best[1]): best = (k, r)
        if best: pairs.append((it, api[best[0]], best[1])); j = best[0] + 1
        else: pairs.append((it, None, 0))
    for it, a, r in pairs:
        segs = it['segs']
        # fix "(" ")" wrappers on any segment kind
        for i, sg in enumerate(segs):
            if 't' in sg:
                if i + 1 < len(segs) and segs[i + 1]['k'] == 'fn': sg['t'] = re.sub(r'\(\s*$', '', sg['t'])
                if i > 0 and segs[i - 1]['k'] == 'fn': sg['t'] = re.sub(r'^\s*\)', '', sg['t'])
        segs = [x for x in segs if x['k'] in ('fn', 'br') or x['t'].strip() != '' or x['t'] == ' ']
        merged = []
        for x in segs:  # adjacent same-kind runs (split only by markup) become one segment
            if merged and 't' in x and merged[-1]['k'] == x['k']: merged[-1]['t'] += x['t']
            else: merged.append(dict(x))
        segs = merged
        if a is None and not it['dhikr']: continue
        if a is None:
            out['problems'].append(f'ch{c}: book item not in hisnmuslim.com (kept as opening/context): ' + ''.join(x.get('t', '') for x in segs)[:60])
            continue
        inotes = [{'n': n, 'text': FOOT[n]} for n in it['fns']]
        tk = [x for x in inotes if TAKHRIJ.search(x['text'])]
        takhrij = tk[-1] if tk else None
        for x in inotes: x['kind'] = 'takhrij' if takhrij and x['n'] == takhrij['n'] else 'note'
        grading = [g.strip() for g in GRADE.findall(takhrij['text'])] if takhrij else []
        # Quran segments: compare with the project's verified KFGQPC Hafs text
        quran = []
        for i, sg in enumerate(segs):
            if sg['k'] != 'q': continue
            nxt = ''.join(x.get('t', '') for x in segs[i + 1:i + 4] if x['k'] == 'p')
            m = re.search(r'\[?\s*([^\]:\[]+?)\s*:\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*\]', nxt)
            if not re.search(r'[\u0621-\u064A]', sg['t']): continue  # punctuation styled as Quran
            body = re.sub(r'\s+', ' ', re.sub(r'[\d﴿﴾.،\[]+', ' ', sg['t'])).strip()
            if not body or body.startswith('...') or body.endswith('...'):
                quran.append({'ref': None, 'match': 'partial-quote'}); continue
            if not m: quran.append({'ref': None, 'match': 'no-ref'}); continue
            n = name2n.get(strip_marks(m.group(1)).strip()) or name2n.get(strip_marks(m.group(1)).strip().replace('ال', '', 1))
            a0 = int(m.group(2)); a1 = int(m.group(3) or a0)
            if not n: quran.append({'ref': m.group(0), 'match': 'unknown-surah'}); continue
            ref_text = re.sub(r'\s+', ' ', ' '.join(ayat(n)[a0 - 1:a1])).strip()
            quran.append({'s': n, 'from': a0, 'to': a1, 'match': 'exact' if skel(ref_text) == skel(body) and ref_text.replace(' ', '') == body.replace(' ', '') else 'letters' if skel(ref_text) == skel(body) else 'differs'})
        bc = book_count(segs); atc = api_text_count(a['ARABIC_TEXT']); rep = a['REPEAT']
        full = ''.join(x.get('t', '') for x in segs if x['k'] != 'fn')
        count_note = None
        if rep != bc and rep in inner_counts(full) and rep in inner_counts(a['ARABIC_TEXT']):
            ac = bc = rep; count_note = 'العدد مذكور داخل نص الذكر نفسه'
        elif bc == atc: ac = bc
        else: ac = atc
        plain = norm(outside_quotes(segs))
        timing = 'evening' if re.search(r'اذا امسي|إذا أمسى', plain) and not re.search(r'اذا اصبح', plain) else 'morning' if re.search(r'اذا اصبح', plain) and not re.search(r'امسي', plain) else 'both'
        checks = {
            'wording': 'verbatim from the official edition (risala.prh.gov.sa), extracted programmatically',
            'diacritics': 'as published',
            'count': (f'agrees: book text and hisnmuslim.com text ({bc})' + (f'; note: hisnmuslim.com REPEAT field says {rep}' if rep != bc else '')) if bc == ac else f'MISMATCH: book text {bc}, hisnmuslim.com text {ac}, REPEAT field {rep}',
            'occasion': f'chapter {c} heading',
            'source': 'takhrij footnote present' if takhrij else 'no takhrij footnote found',
            'grading': 'stated in takhrij' if grading else 'not stated in the book',
            'narrations': f'{len(inotes) - (1 if takhrij else 0)} inline note(s) kept verbatim' if len(inotes) > 1 else 'none noted',
            'quran': ','.join(q['match'] for q in quran) or 'n/a',
            'textMatch': round(r, 2),
        }
        instruction = not it['dhikr']
        if instruction: checks['count'] = 'n/a: an instruction (action), not a formula to repeat'
        ok = (instruction or bc == ac) and takhrij is not None and all(q['match'] in ('exact', 'letters', 'partial-quote') for q in quran)
        out['items'].append({'id': f'hisn-{a["ID"]}', 'hisnNo': a['ID'], 'chapter': c, 'segs': segs, 'notes': inotes, 'kind': 'instruction' if instruction else 'dhikr', 'count': None if instruction else ac if bc == ac else None, 'countBook': bc, 'countCrossCheck': ac, 'countNote': count_note,
                             'grading': grading, 'timing': timing if c == 27 else 'both', 'quran': quran, 'checks': checks, 'status': 'source-verified' if ok else 'needs-review'})
        if not ok: out['problems'].append(f"hisn-{a['ID']} ch{c}: " + '; '.join(f'{k}={v}' for k, v in checks.items() if k in ('count', 'source', 'quran')))
out['source'] = {'title': 'حصن المسلم من أذكار الكتاب والسنة', 'author': 'سعيد بن علي بن وهف القحطاني', 'publisher': 'رسالة الحرمين — الرئاسة العامة للشؤون الدينية بالمسجد الحرام والمسجد النبوي', 'url': 'https://risala.prh.gov.sa/ar/content/51', 'crossCheck': 'https://www.hisnmuslim.com/api/ar/ (item numbers and repeat counts)', 'retrieved': datetime.date.today().isoformat(), 'license': 'No explicit licence statement on the source page; the author\'s introduction invites reading, printing and spreading the book. Attribution is shown with every item. Confirm permission before production use.'}
json.dump(out, open(f'{ROOT}/src/studio/next/azkar/hisn.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('items', len(out['items']), 'verified', sum(1 for i in out['items'] if i['status'] == 'source-verified'))
print('\n'.join(out['problems']))
