export async function uploadToPinata(
  file: File
): Promise<{ url: string; cid: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload image");
  }

  const data = await response.json();
  return { url: data.url, cid: data.cid };
}

export function validateImageFile(
  file: File
): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxSize) {
    return { valid: false, error: "File size must be less than 5 MB" };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Only JPEG, PNG, GIF, and WebP images are allowed",
    };
  }

  return { valid: true };
}
