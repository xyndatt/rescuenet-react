// Shrinks a camera photo before upload: max 1280 px, JPEG 72%. Also applies EXIF rotation and
// strips metadata (including the phone's embedded GPS tags). Typical 4–8 MB photo -> 100–250 KB.
export async function compressImage(file, maxDim = 1280, quality = 0.72) {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) throw new Error('Please choose a JPEG, PNG or WebP photo.');
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { throw new Error('This photo format is not supported by your browser. Try a JPEG or PNG.'); }
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close && bmp.close();
  const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', quality));
  if (!blob) throw new Error('Could not process the photo.');
  return new File([blob], (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}
