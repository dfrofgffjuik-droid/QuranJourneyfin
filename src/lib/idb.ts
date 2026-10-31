// Recordings are stored only on this device (IndexedDB) so a parent/teacher on
// the same device can listen later. Nothing is uploaded.
const DB = 'rafiqi-recordings'
const STORE = 'audio'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

export async function putAudio(id: string, blob: Blob) {
  const db = await open()
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, id)
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
}

export async function getAudio(id: string): Promise<Blob | null> {
  const db = await open()
  return new Promise((res, rej) => {
    const r = db.transaction(STORE).objectStore(STORE).get(id)
    r.onsuccess = () => res((r.result as Blob) ?? null)
    r.onerror = () => rej(r.error)
  })
}

export async function deleteAudio(id: string) {
  const db = await open()
  db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id)
}
