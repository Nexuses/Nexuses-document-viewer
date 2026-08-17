import { NextResponse } from 'next/server';
import { deleteProjectUserSession } from '@/lib/auth';

export async function POST() {
  try {
    await deleteProjectUserSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Project user logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
