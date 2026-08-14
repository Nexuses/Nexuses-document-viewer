import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedDownloadUrl, getPublicUrl, isS3Configured } from '@/lib/s3';

export const maxDuration = 60;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cache presigned URLs for 1 hour to avoid regenerating on every request
const presignedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    if (!isS3Configured()) {
      return NextResponse.json(
        { error: 'S3 is not configured' },
        { status: 500 }
      );
    }

    const { key } = await params;
    const decodedKey = decodeURIComponent(key);

    // Always use direct S3 URLs for faster loading
    // If bucket is public or CloudFront is configured, use public URL (fastest)
    if (process.env.AWS_S3_PUBLIC === 'true' || process.env.AWS_CLOUDFRONT_URL) {
      const publicUrl = getPublicUrl(decodedKey);
      // Return JSON with URL for client-side redirect to avoid server redirect delay
      return NextResponse.json({ url: publicUrl, type: 'public' }, {
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Check cache first
    const cached = presignedUrlCache.get(decodedKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ url: cached.url, type: 'presigned' }, {
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Generate presigned URL (valid for 24 hours)
    const presignedUrl = await generatePresignedDownloadUrl(decodedKey);
    
    // Cache it
    presignedUrlCache.set(decodedKey, {
      url: presignedUrl,
      expiresAt: Date.now() + CACHE_DURATION,
    });

    // Clean old cache entries periodically
    if (presignedUrlCache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of presignedUrlCache.entries()) {
        if (v.expiresAt < now) {
          presignedUrlCache.delete(k);
        }
      }
    }

    return NextResponse.json({ url: presignedUrl, type: 'presigned' }, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving S3 file:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve file' },
      { status: 500 }
    );
  }
}

