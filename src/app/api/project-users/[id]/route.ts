import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword } from '@/lib/auth';
import { deleteProjectUser, projectUsernameExists, updateProjectUser } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const name = String(body.name || '').trim();
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const projectId = String(body.projectId || '').trim();

  if (!name || !username || !projectId) {
    return NextResponse.json(
      { error: 'Name, username, and project are required' },
      { status: 400 }
    );
  }

  if (await projectUsernameExists(username, id)) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
  }

  const patch: {
    name: string;
    username: string;
    projectId: string;
    password?: string;
  } = { name, username, projectId };

  if (password) {
    if (password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }
    patch.password = await hashPassword(password);
  }

  const updated = await updateProjectUser(id, patch);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const deleted = await deleteProjectUser(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
