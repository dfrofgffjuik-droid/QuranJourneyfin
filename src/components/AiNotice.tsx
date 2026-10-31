// Required by the Quran Muaalem License (QML-1.0) additional condition 1:
// shown before first use and permanently accessible.
export const AI_NOTICE_AR =
  'هذا المعلّم القرآني نموذج ذكاء اصطناعي قد يخطئ؛ فهو للإعانة فقط ولا يُعتمد عليه، وليس بديلاً عن معلّمٍ مُتقِنٍ مُجاز؛ لأنّ القرآن لا يُؤخذ إلا بالمشافهة.'
export const AI_NOTICE_EN =
  'This Quranic Teacher is an artificial-intelligence model that may make mistakes. It is intended for assistance only and must not be relied upon. It is not a replacement for a proficient, authorized teacher, because the Quran is only received through oral transmission (mushafahah).'

export function AiNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'space-y-1' : 'space-y-3'}>
      <p dir="rtl" lang="ar" className={`font-naskh ${compact ? 'text-sm' : 'text-lg'} leading-loose text-night`}>
        {AI_NOTICE_AR}
      </p>
      <p className={`${compact ? 'text-xs' : 'text-sm'} leading-relaxed text-night/70`}>{AI_NOTICE_EN}</p>
    </div>
  )
}
