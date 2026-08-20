/**
 * Prepare a camera/gallery photo for AI vision:
 * - fixes huge payloads (phones shoot 8–12 MP) by capping the long edge
 * - keeps enough resolution for OCR of dense price tables
 * - returns a JPEG data URL
 */
export async function prepareImageForAI(
  file: File,
  maxEdge = 2000,
  quality = 0.85
): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  // Non-raster or tiny files: send as-is
  if (!file.type.startsWith("image/")) return dataUrl;

  try {
    const img = await loadImage(dataUrl);
    const longEdge = Math.max(img.width, img.height);
    const scale = longEdge > maxEdge ? maxEdge / longEdge : 1;
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return dataUrl;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}

function readAsDataUrl(f: File) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("read failed"));
    r.readAsDataURL(f);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("decode failed"));
    img.src = src;
  });
}
