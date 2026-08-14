import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

export interface UploadFileParams {
  fileName: string;
  contentType: string;
  fileSize: number;
}

/**
 * Generate a presigned URL for uploading a file directly to S3
 */
export async function generatePresignedUploadUrl(
  params: UploadFileParams
): Promise<{ uploadUrl: string; fileKey: string }> {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  // Generate unique file key
  const timestamp = Date.now();
  const sanitizedFileName = params.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileKey = `uploads/${timestamp}_${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: params.contentType,
    // Allow files up to 200MB
    ContentLength: params.fileSize,
  });

  // Generate presigned URL valid for 1 hour
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return { uploadUrl, fileKey };
}

/**
 * Generate a presigned URL for downloading/viewing a file from S3
 */
export async function generatePresignedDownloadUrl(fileKey: string): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    // Add response headers for better caching and CORS
    ResponseCacheControl: 'public, max-age=31536000, immutable',
  });

  // Generate presigned URL valid for 24 hours (longer for better caching)
  const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 86400 });

  return downloadUrl;
}

/**
 * Get public URL for a file (if bucket is public)
 */
export function getPublicUrl(fileKey: string): string {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }
  
  // If using CloudFront
  if (process.env.AWS_CLOUDFRONT_URL) {
    let cloudfrontUrl = process.env.AWS_CLOUDFRONT_URL.trim();
    // Ensure it starts with https://
    if (!cloudfrontUrl.startsWith('http://') && !cloudfrontUrl.startsWith('https://')) {
      cloudfrontUrl = `https://${cloudfrontUrl}`;
    }
    // Remove trailing slash
    cloudfrontUrl = cloudfrontUrl.replace(/\/$/, '');
    return `${cloudfrontUrl}/${fileKey}`;
  }
  
  // Standard S3 public URL
  const region = process.env.AWS_REGION || 'us-east-1';
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${fileKey}`;
}

/**
 * Delete a file from S3
 */
export async function deleteFileFromS3(fileKey: string): Promise<void> {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  await s3Client.send(command);
}

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET_NAME &&
    process.env.AWS_REGION
  );
}

