import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteProject, projectSlugExists, updateProject } from '@/lib/db';
import { slugify } from '@/lib/smart-link-types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Full name is required' }, { status: 400 });

  let slug = slugify(body.slug || name);
  if (await projectSlugExists(slug, id)) {
    return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
  }

  const updated = await updateProject(id, {
    name,
    slug,
    logoUrl: String(body.logoUrl || '').trim(),
  });
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
  const deleted = await deleteProject(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
