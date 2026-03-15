import { url } from "inspector";

export interface GenerationResult {
  success: boolean;
  image?: {
    data: string; // Base64 encoded
    mimeType: string;
  };
  remainingGenerations?: number;
  message?: string;
  error?: string;
  limitReached?: boolean;
}

export interface GenerationLimitInfo {
  success: boolean;
  remainingGenerations: number;
  maxDaily: number;
  usedToday: number;
}

export async function generateImage(
  prompt: string,
  userId: string,
  role: 'user' | 'brand' = 'user'
): Promise<GenerationResult> {
  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, userId, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to generate image',
        limitReached: data.limitReached,
        remainingGenerations: data.remainingGenerations,
      };
    }

    return {
      success: true,
      image: data.image,
      remainingGenerations: data.remainingGenerations,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to generate image' };
  }
}

export async function checkGenerationLimit(
  userId: string,
  role: 'user' | 'brand' = 'user'
): Promise<GenerationLimitInfo> {
  const fallbackMax = role === 'brand' ? 5 : 3;
  try {
    const response = await fetch(
      `/api/generate-image?userId=${encodeURIComponent(userId)}&role=${role}`
    );
    const data = await response.json();

    if (!response.ok) {
      return { success: false, remainingGenerations: fallbackMax, maxDaily: fallbackMax, usedToday: 0 };
    }

    return {
      success: true,
      remainingGenerations: data.remainingGenerations,
      maxDaily: data.maxDaily,
      usedToday: data.usedToday,
    };
  } catch {
    return { success: false, remainingGenerations: fallbackMax, maxDaily: fallbackMax, usedToday: 0 };
  }
}

export function base64ToFile(
  base64Data: string,
  mimeType: string,
  filename = 'ai-generated.png'
): File {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

export function base64ToObjectUrl(base64Data: string, mimeType: string): string {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return URL.createObjectURL(blob);
}
