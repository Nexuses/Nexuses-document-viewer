import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword } from '@/lib/auth';
import { createProjectUser, getProjectUsers, projectUsernameExists } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getProjectUsers());
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const name = String(body.name || '').trim();
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const projectId = String(body.projectId || '').trim();

  if (!name || !username || !password || !projectId) {
    return NextResponse.json(
      { error: 'Name, username, password, and project are required' },
      { status: 400 }
    );
  }

  if (password.length < 4) {
    return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
  }

  if (await projectUsernameExists(username)) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
  }

  const hashed = await hashPassword(password);
  const created = await createProjectUser({
    name,
    email: '',
    username,
    password: hashed,
    projectId,
  });
  return NextResponse.json(created);
}
