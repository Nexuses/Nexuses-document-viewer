import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';
import { isAllowedUploadType } from '@/lib/upload-types';

// Configure route to accept larger file uploads
export const maxDuration = 300; // 5 minutes for large file uploads
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check MongoDB URI is available
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error: MongoDB connection not configured' },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    let formData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error('Error parsing form data:', error);
      return NextResponse.json(
        { error: 'Failed to parse form data. The file may be too large or the request is malformed.' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!isAllowedUploadType(file.type, file.name)) {
      return NextResponse.json(
        { error: 'File type is not allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 200MB)
    if (file.size > 200 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 200MB' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Connect to MongoDB
    let client;
    try {
      client = await clientPromise;
      // Verify connection
      await client.db('admin').command({ ping: 1 });
    } catch (error) {
      console.error('MongoDB connection error:', error);
      return NextResponse.json(
        { error: 'Database connection failed. Please check your MongoDB connection.' },
        { status: 500 }
      );
    }

    const db = client.db('nexuses-asset');
    const bucket = new GridFSBucket(db, { bucketName: 'files' });

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedFileName}`;

    // Upload to GridFS
    const uploadStream = bucket.openUploadStream(fileName, {
      metadata: {
        originalName: file.name,
        contentType: file.type,
        uploadedAt: new Date(),
      },
    });

    // Write buffer to GridFS with timeout
    uploadStream.end(buffer);

    // Wait for upload to complete with timeout (4 minutes for large files)
    const fileId = await Promise.race<string>([
      new Promise<string>((resolve, reject) => {
        uploadStream.on('finish', () => {
          resolve(uploadStream.id.toString());
        });
        uploadStream.on('error', (err) => {
          console.error('GridFS upload error:', err);
          reject(err);
        });
      }),
      new Promise<string>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Upload timeout: File upload took too long'));
        }, 240000); // 4 minutes timeout
      }),
    ]);

    // Return the file ID (we'll use this to retrieve the file)
    const fileUrl = `/api/files/${fileId}`;
    return NextResponse.json(
      { url: fileUrl, fileName: file.name, fileId },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to upload file: ${errorMessage}` },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

