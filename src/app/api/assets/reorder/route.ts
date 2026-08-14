import { NextRequest, NextResponse } from 'next/server';
import { reorderAssets } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    const { assetOrders } = await request.json();

    
    if (!Array.isArray(assetOrders)) {
      return NextResponse.json(
        { error: 'Invalid request. assetOrders must be an array' },
        { status: 400 }
      );
    }

    const success = await reorderAssets(assetOrders);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to reorder assets' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering assets:', error);
    return NextResponse.json(
      { error: 'Failed to reorder assets' },
      { status: 500 }
    );
  }
}

