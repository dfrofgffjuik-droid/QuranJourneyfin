// Browser-side audio capture → 16 kHz mono 16-bit PCM WAV.
// Decoding and resampling happen on-device; only the final WAV is sent to the
// local inference service, and only after the user presses "Analyse".

export const TARGET_RATE = 16000

export async function blobToMono16k(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer()
  const ctx = new AudioContext()
  try {
    const decoded = await ctx.decodeAudioData(buf)
    const frames = Math.ceil(decoded.duration * TARGET_RATE)
    const off = new OfflineAudioContext(1, Math.max(1, frames), TARGET_RATE)
    const src = off.createBufferSource()
    src.buffer = decoded
    src.connect(off.destination)
    src.start()
    const rendered = await off.startRendering()
    return rendered.getChannelData(0).slice()
  } finally {
    ctx.close().catch(() => {})
  }
}

export function encodeWav(samples: Float32Array, rate = TARGET_RATE): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buffer)
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF')
  v.setUint32(4, 36 + samples.length * 2, true)
  w(8, 'WAVE')
  w(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  w(36, 'data')
  v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

export type Recorder = { stop: () => Promise<Blob>; cancel: () => void; level: () => number }

export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: true },
  })
  let rec: MediaRecorder
  let ctx: AudioContext
  let analyser: AnalyserNode
  try {
    rec = new MediaRecorder(stream)
    ctx = new AudioContext()
    analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    ctx.createMediaStreamSource(stream).connect(analyser)
  } catch (e) {
    // Never leave the microphone open when setup fails after permission was granted.
    stream.getTracks().forEach((t) => t.stop())
    throw e
  }
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const data = new Uint8Array(analyser.fftSize)
  let released = false
  const release = () => {
    if (released) return
    released = true
    stream.getTracks().forEach((t) => t.stop())
    ctx.close().catch(() => {})
  }
  try {
    rec.start()
  } catch (e) {
    release()
    throw e
  }
  return {
    level: () => {
      analyser.getByteTimeDomainData(data)
      let peak = 0
      for (const x of data) peak = Math.max(peak, Math.abs(x - 128) / 128)
      return peak
    },
    cancel: () => {
      rec.onstop = null
      if (rec.state !== 'inactive') rec.stop()
      release()
    },
    // Always releases the microphone, and rejects (instead of hanging) if the recorder fails.
    stop: () =>
      new Promise((resolve, reject) => {
        const done = () => resolve(new Blob(chunks, { type: rec.mimeType }))
        if (rec.state === 'inactive') {
          release()
          return done()
        }
        rec.onstop = () => {
          release()
          done()
        }
        rec.onerror = () => {
          rec.onstop = null
          release()
          reject(new Error('recorder error'))
        }
        try {
          rec.stop()
        } catch (e) {
          release()
          reject(e)
        }
      }),
  }
}
