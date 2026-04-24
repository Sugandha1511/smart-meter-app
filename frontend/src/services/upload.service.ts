import { api } from './api';

export interface UploadResult {
  file_id: string;
  file_name: string;
  url: string;
  mime_type: string;
}

/**
 * Compress a large image on the client before upload. Phone photos are often
 * 5–10 MB; downsampling to ~1920 px + JPEG q=0.82 typically cuts them to
 * 300–700 KB with no visible quality loss for OCR / display.
 *
 * Returns the original file unchanged if it isn't an image or if the browser
 * can't decode it (we'd rather upload a big file than fail).
 */
export async function maybeCompressImage(
  file: File,
  { maxDim = 1920, quality = 0.82 }: { maxDim?: number; quality?: number } = {}
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  // createImageBitmap isn't in every older browser; guard it.
  if (typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    // Nothing to do if it's already small-ish.
    if (longest <= maxDim && file.size < 1_500_000) {
      bitmap.close?.();
      return file;
    }
    const scale = Math.min(1, maxDim / longest);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    );
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

/**
 * Uploads a photo/video to the backend. Accepts an optional progress callback
 * (0..1) so the UI can show a live percentage during slow mobile uploads.
 */
export async function uploadMedia(
  file: File,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  // Important: do NOT set Content-Type manually. Axios will add
  // `multipart/form-data; boundary=…` automatically. Setting it by hand strips
  // the boundary and some servers fail to parse the payload.
  const response = await api.post<UploadResult>('/uploads', formData, {
    // Big videos on mobile networks can take a while; allow up to 3 minutes.
    timeout: 180_000,
    onUploadProgress: (e) => {
      if (!onProgress) return;
      const total = e.total ?? file.size;
      if (!total) return;
      const pct = Math.min(1, (e.loaded ?? 0) / total);
      onProgress(pct);
    }
  });

  return response.data;
}
