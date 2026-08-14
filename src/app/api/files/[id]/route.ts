import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { GridFSBucket, ObjectId, GridFSFile } from 'mongodb';

interface FileWithContentType extends GridFSFile {
  contentType?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid file ID' },
        { status: 400 }
      );
    }

    let client;
    try {
      client = await clientPromise;
      // Verify connection
      await client.db('admin').command({ ping: 1 });
    } catch (error) {
      console.error('MongoDB connection error in file retrieval:', error);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const db = client.db('nexuses-asset');
    const bucket = new GridFSBucket(db, { bucketName: 'files' });

    // Check if file exists
    let files;
    try {
      files = await bucket.find({ _id: new ObjectId(id) }).toArray();
    } catch (error) {
      console.error('Error finding file in GridFS:', error);
      return NextResponse.json(
        { error: 'Error accessing file storage' },
        { status: 500 }
      );
    }
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const file = files[0] as FileWithContentType;
    const contentType = file.contentType || (file.metadata as any)?.contentType || 'application/octet-stream';

    // Create read stream
    let downloadStream;
    try {
      downloadStream = bucket.openDownloadStream(new ObjectId(id));
    } catch (error) {
      console.error('Error opening download stream:', error);
      return NextResponse.json(
        { error: 'Failed to open file stream' },
        { status: 500 }
      );
    }

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    try {
      for await (const chunk of downloadStream) {
        chunks.push(chunk);
      }
    } catch (error) {
      console.error('Error reading file stream:', error);
      return NextResponse.json(
        { error: 'Failed to read file data' },
        { status: 500 }
      );
    }
    const buffer = Buffer.concat(chunks);

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `inline; filename="${file.metadata?.originalName || file.filename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error retrieving file:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve file' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid file ID' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('nexuses-asset');
    const bucket = new GridFSBucket(db, { bucketName: 'files' });

    // Delete file from GridFS
    await bucket.delete(new ObjectId(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

