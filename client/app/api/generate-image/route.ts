import { NextRequest, NextResponse } from 'next/server';

const PROJECT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT;
const REGION = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
const IMAGEN_MODEL = process.env.IMAGE_MODEL_VERSION || 'imagen-4.0-generate-001';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// In-memory daily generation limits (resets on server restart)
const dailyGenerationLimits: Map<string, { count: number; date: string }> = new Map();
const MAX_DAILY_GENERATIONS_USER = 3;
const MAX_DAILY_GENERATIONS_BRAND = 5;

function getMaxDaily(role: string | null): number {
  return role === 'brand' ? MAX_DAILY_GENERATIONS_BRAND : MAX_DAILY_GENERATIONS_USER;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const maxDaily = getMaxDaily(role);
    const today = new Date().toISOString().split('T')[0];
    const userLimit = dailyGenerationLimits.get(userId);

    let usedToday = 0;
    if (userLimit && userLimit.date === today) {
      usedToday = userLimit.count;
    }

    return NextResponse.json({
      success: true,
      remainingGenerations: maxDaily - usedToday,
      maxDaily,
      usedToday,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, userId, role } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Check daily limit
    const maxDaily = getMaxDaily(role);
    const today = new Date().toISOString().split('T')[0];
    const userLimit = dailyGenerationLimits.get(userId);

    if (userLimit && userLimit.date === today && userLimit.count >= maxDaily) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const resetDate = tomorrow.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      return NextResponse.json(
        {
          error: `You've used all ${maxDaily} AI generations for today. Limit resets on ${resetDate}.`,
          remainingGenerations: 0,
          limitReached: true,
          resetDate,
        },
        { status: 429 }
      );
    }

    // Use Gemini API key directly (simpler than Vertex AI service account)
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    // Use Imagen via the Gemini Developer API endpoint
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict?key=${GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1 },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || 'Image generation failed';
      return NextResponse.json({ error: errMsg }, { status: response.status });
    }

    const prediction = data.predictions?.[0];
    if (!prediction?.bytesBase64Encoded) {
      return NextResponse.json({ error: 'No image returned from API' }, { status: 500 });
    }

    // Update daily generation count
    if (userLimit && userLimit.date === today) {
      userLimit.count += 1;
    } else {
      dailyGenerationLimits.set(userId, { count: 1, date: today });
    }

    const currentLimit = dailyGenerationLimits.get(userId)!;
    const remainingGenerations = maxDaily - currentLimit.count;

    return NextResponse.json({
      success: true,
      image: {
        data: prediction.bytesBase64Encoded,
        mimeType: prediction.mimeType || 'image/png',
      },
      remainingGenerations,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
