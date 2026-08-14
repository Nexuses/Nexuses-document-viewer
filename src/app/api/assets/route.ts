import { NextRequest, NextResponse } from 'next/server';
import { getAssets, createAsset } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const assets = await getAssets();
    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { title, link, fileUrl, category } = await request.json();

    if (!title || !link) {
      return NextResponse.json(
        { error: 'Title and link are required' },
        { status: 400 }
      );
    }

    const asset = await createAsset({
      title,
      link,
      fileUrl,
      category: category === 'video' ? 'video' : 'document',
    });
    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json(
      { error: 'Failed to create asset' },
      { status: 500 }
    );
  }
}

