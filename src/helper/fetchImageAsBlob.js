export async function fetchImageAsBlob(url, timeout = 10000) {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(id);

    if (!resp || (resp.status && resp.status >= 400)) {
      console.warn('[fetchImageAsBlob] non-OK response', resp && resp.status);
      return null;
    }
    const blob = await resp.blob();
    // kecilkan risiko: to be sure it's an image
    if (!blob || !blob.type || !blob.type.startsWith('image/')) return null;
    return blob;
  } catch (err) {
    console.warn('[fetchImageAsBlob] failed', err);
    return null;
  }
}
