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

        // Only scale down, never up
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
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── PRODUCTION LOGGER ──────────────────────────────────────────
// Centralized logging so we can track errors in production.
const LOG_LEVELS = { info: "ℹ️", warn: "⚠️", error: "❌" };

export function logError(context, error) {
  const msg = error?.message || String(error);
  console.error(`${LOG_LEVELS.error} [${context}]`, msg, error);
}

export function logWarn(context, message) {
  console.warn(`${LOG_LEVELS.warn} [${context}]`, message);
}

export function logInfo(context, message) {
  console.log(`${LOG_LEVELS.info} [${context}]`, message);
}

// ── INPUT SANITIZER ────────────────────────────────────────────
// Strips dangerous content from user text input before saving to Firestore.
export function sanitizeInput(str, maxLength = 500) {
  if (!str) return "";
  return String(str)
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ""); // strip < > to prevent HTML injection
}