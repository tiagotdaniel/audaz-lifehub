// Files are stored as base64 data URLs directly in Postgres (same pattern as
// Mural dos Sonhos), so there's no object-storage dependency. Images are
// downscaled client-side to keep payloads well under the server's JSON body
// limit; other file types are size-capped instead since they can't be resized.
const MAX_NON_IMAGE_BYTES = 6 * 1024 * 1024;

export interface Attachment {
  name: string;
  url: string;
}

function resizeImageToDataUrl(file: File, maxDim = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Arquivo de imagem inválido."));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Não foi possível processar a imagem.")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.onload = (ev) => resolve(ev.target?.result as string);
    reader.readAsDataURL(file);
  });
}

export async function fileToAttachment(file: File): Promise<Attachment> {
  if (file.type.startsWith("image/")) {
    const url = await resizeImageToDataUrl(file);
    return { name: file.name, url };
  }
  if (file.size > MAX_NON_IMAGE_BYTES) {
    throw new Error(`Arquivo muito grande (máx. ${MAX_NON_IMAGE_BYTES / 1024 / 1024}MB).`);
  }
  const url = await readFileAsDataUrl(file);
  return { name: file.name, url };
}
