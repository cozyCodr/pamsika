"use client";

function looksHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

// Most browsers outside Safari can't decode iPhone HEIC photos, so those are decoded with libheif (loaded only when needed).
async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch (err) {
    const { heicTo, isHeic } = await import("heic-to/next");
    if (!looksHeic(file) && !(await isHeic(file))) throw err;
    try {
      return await heicTo({ blob: file, type: "bitmap" });
    } catch {
      throw new Error("Couldn't open that iPhone photo. Try taking it again, or choose a JPEG.");
    }
  }
}

export async function compressImage(file: File, maxSide = 1280, quality = 0.82): Promise<{ base64: string; mimeType: "image/jpeg"; previewUrl: string }> {
  const bitmap = await decode(file).catch((err) => {
    throw err instanceof Error && err.message.startsWith("Couldn't") ? err : new Error("Couldn't open that photo. Please choose a JPEG, PNG or HEIC image.");
  });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { base64: dataUrl.split(",")[1], mimeType: "image/jpeg", previewUrl: dataUrl };
}
