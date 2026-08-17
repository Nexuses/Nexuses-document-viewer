import { NextRequest, NextResponse } from 'next/server';
import { loginProjectUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const result = await loginProjectUser(String(username), String(password));
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({ success: true, user: result.session });
  } catch (error) {
    console.error('Project user login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
