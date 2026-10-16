import { bucket, ref, pushId } from '../firebase.js';
import { badRequest } from '../errors.js';
import { config } from '../config.js';

const useRtdb = config.photoDriver === 'rtdb';

// Identify the real file type from its first bytes (never trust the client's MIME type / extension).
export function sniff(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
}

export function checkFiles(files = []) {
  return files.map(f => {
    const t = sniff(f.buffer);
    if (!t) throw badRequest('Only JPEG, PNG or WebP photos are allowed.');
    if (f.size > config.photoMaxBytes) throw badRequest(`Each photo must be under ${Math.round(config.photoMaxBytes / 1024)} KB.`);
    return { buffer: f.buffer, size: f.size, ...t };
  });
}

// Saves each photo and returns the metadata stored on the report.
//  rtdb    (default, free plan): bytes go to /rescuenet/photoData/<reportId>/<photoId> as base64; path = "rtdb:<reportId>/<photoId>"
//  storage (Blaze plan):         bytes go to Firebase Storage  reports/<reportId>/<photoId>.<ext>
// If any save fails, the ones that succeeded are removed again.
export async function savePhotos(reportId, files, by) {
  const checked = checkFiles(files);
  const metas = checked.map(f => {
    const id = pushId();
    return { id, path: useRtdb ? `rtdb:${reportId}/${id}` : `reports/${reportId}/${id}.${f.ext}`, by, at: Date.now(), size: f.size };
  });
  const results = await Promise.allSettled(checked.map((f, i) => useRtdb
    ? ref(`photoData/${reportId}/${metas[i].id}`).set({ mime: f.mime, data: f.buffer.toString('base64') })
    : bucket().file(metas[i].path).save(f.buffer, { resumable: false, contentType: f.mime, metadata: { cacheControl: 'private, max-age=3600' } })));
  if (results.some(r => r.status === 'rejected')) {
    await deletePhotos(metas.map(m => m.path));
    console.error('Photo save failed:', results.find(r => r.status === 'rejected').reason);
    throw new Error('Photo upload failed.');
  }
  return metas;
}

export async function deletePhotos(paths) {
  await Promise.allSettled(paths.map(p => p.startsWith('rtdb:')
    ? ref(`photoData/${p.slice(5)}`).remove()
    : bucket().file(p).delete({ ignoreNotFound: true })));
}
