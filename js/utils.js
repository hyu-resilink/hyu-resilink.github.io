// js/utils.js
// Shared utility functions used across multiple modules.

// ── IMAGE COMPRESSION ──────────────────────────────────────────
// Compresses an image File to a Base64 JPEG string.
// Only scales DOWN — images already smaller than maxWidth are kept at their
// original size to avoid quality loss from upscaling.
export async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Failed to read image file."));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image."));

      img.onload = () => {
        const canvas = document.createElement("canvas");

        // BUG FIX: only scale down, never up
        if (img.width > maxWidth) {
          const scale   = maxWidth / img.width;
          canvas.width  = maxWidth;
          canvas.height = Math.round(img.height * scale);
        } else {
          canvas.width  = img.width;
          canvas.height = img.height;
        }

        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

// ── HTML ESCAPE ────────────────────────────────────────────────
// Prevents XSS when inserting user content into innerHTML.
export function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}