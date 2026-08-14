import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';

export const maxDuration = 300;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Store upload sessions in memory (in production, use Redis or database)
const uploadSessions = new Map<string, {
  chunks: Map<number, Buffer>;
  totalChunks: number;
  fileName: string;
  contentType: string;
}>();

export async function POST(request: NextRequest) {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: 'Server configuration error: MongoDB connection not configured' },
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

    const formData = await request.formData();
    const chunk = formData.get('chunk') as File;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const uploadId = formData.get('uploadId') as string;
    const fileName = formData.get('fileName') as string;
    const contentType = formData.get('contentType') as string;

    if (!chunk || isNaN(chunkIndex) || isNaN(totalChunks) || !uploadId || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let uploadSession = uploadSessions.get(uploadId);

    // Initialize upload session
    if (!uploadSession) {
      uploadSession = {
        chunks: new Map(),
        totalChunks,
        fileName,
        contentType: contentType || 'application/octet-stream',
      };
      uploadSessions.set(uploadId, uploadSession);
    }

    const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
    uploadSession.chunks.set(chunkIndex, chunkBuffer);

    // Check if all chunks are received
    if (uploadSession.chunks.size === totalChunks) {
      // All chunks received, assemble and upload to GridFS
      const client = await clientPromise;
      const db = client.db('nexuses-asset');
      const bucket = new GridFSBucket(db, { bucketName: 'files' });

      // Sort chunks by index and concatenate
      const sortedChunks = Array.from(uploadSession.chunks.entries())
        .sort(([a], [b]) => a - b)
        .map(([, buffer]) => buffer);

      const fullBuffer = Buffer.concat(sortedChunks);

      // Upload to GridFS
      const timestamp = Date.now();
      const sanitizedFileName = uploadSession.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const gridFileName = `${timestamp}_${sanitizedFileName}`;

      const uploadStream = bucket.openUploadStream(gridFileName, {
        metadata: {
          originalName: uploadSession.fileName,
          contentType: uploadSession.contentType,
          uploadedAt: new Date(),
          uploadId,
        },
      });

      uploadStream.end(fullBuffer);

      const fileId = await new Promise<string>((resolve, reject) => {
        uploadStream.on('finish', () => {
          resolve(uploadStream.id.toString());
        });
        uploadStream.on('error', (err) => {
          console.error('GridFS upload error:', err);
          reject(err);
        });
      });

      // Clean up session
      uploadSessions.delete(uploadId);

      return NextResponse.json({
        success: true,
        fileId,
        url: `/api/files/${fileId}`,
      });
    }

    return NextResponse.json({
      success: true,
      received: uploadSession.chunks.size,
      total: totalChunks,
    });
  } catch (error) {
    console.error('Error uploading chunk:', error);
    return NextResponse.json(
      { error: `Failed to upload chunk: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

