import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { generatePresignedUploadUrl, isS3Configured } from '@/lib/s3';
import { isAllowedUploadType } from '@/lib/upload-types';

export const maxDuration = 60;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (!isS3Configured()) {
      return NextResponse.json(
        { error: 'S3 is not configured. Please set AWS environment variables.' },
        { status: 500 }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fileName, contentType, fileSize } = body;

    if (!fileName || !contentType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, contentType, fileSize' },
        { status: 400 }
      );
    }

    if (!isAllowedUploadType(contentType, fileName)) {
      return NextResponse.json(
        { error: 'File type is not allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 200MB)
    if (fileSize > 200 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 200MB' },
        { status: 400 }
      );
    }

    const { uploadUrl, fileKey } = await generatePresignedUploadUrl({
      fileName,
      contentType,
      fileSize,
    });

    // Always return direct S3 URL if bucket is public (fastest)
    // This avoids any API calls when loading PDFs
    let fileUrl: string;
    if (process.env.AWS_S3_PUBLIC === 'true') {
      // Direct S3 URL - fastest option
      const region = process.env.AWS_REGION || 'us-east-1';
      const bucketName = process.env.AWS_S3_BUCKET_NAME || '';
      fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;
    } else if (process.env.AWS_CLOUDFRONT_URL) {
      // CloudFront URL - also fast
      let cloudfrontUrl = process.env.AWS_CLOUDFRONT_URL.trim();
      if (!cloudfrontUrl.startsWith('http://') && !cloudfrontUrl.startsWith('https://')) {
        cloudfrontUrl = `https://${cloudfrontUrl}`;
      }
      cloudfrontUrl = cloudfrontUrl.replace(/\/$/, '');
      fileUrl = `${cloudfrontUrl}/${fileKey}`;
    } else {
      // Private bucket - use API route (slower, but secure)
      fileUrl = `/api/files/s3/${encodeURIComponent(fileKey)}`;
    }

    return NextResponse.json({
      uploadUrl,
      fileKey,
      fileUrl,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: `Failed to generate upload URL: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

