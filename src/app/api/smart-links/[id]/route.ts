import { NextRequest, NextResponse } from 'next/server';
import { getSmartLinkActor } from '@/lib/auth';
import { getProjectById } from '@/lib/db';
import {
  deleteSmartLink,
  getSmartLinkById,
  slugExists,
  slugify,
  updateSmartLink,
} from '@/lib/smart-links';

function canAccess(actor: Awaited<ReturnType<typeof getSmartLinkActor>>, projectId?: string) {
  if (!actor) return false;
  if (actor.role === 'master') return true;
  return Boolean(projectId && String(projectId) === String(actor.projectId));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getSmartLinkActor(_request);
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const link = await getSmartLinkById(id);
  if (!link || !canAccess(actor, link.projectId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(link);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getSmartLinkActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const existing = await getSmartLinkById(id);
    if (!existing || !canAccess(actor, existing.projectId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.title === 'string') updates.title = body.title.trim();
    if (typeof body.description === 'string') updates.description = body.description;
    if (typeof body.coverImage === 'string') updates.coverImage = body.coverImage;
    if (typeof body.companyLogo === 'string') updates.companyLogo = body.companyLogo;
    if (body.status === 'draft' || body.status === 'published') updates.status = body.status;
    if (Array.isArray(body.content)) updates.content = body.content;

    if (typeof body.slug === 'string') {
      const slug = slugify(body.slug);
      if (await slugExists(slug, id)) {
        return NextResponse.json({ error: 'Slug already in use' }, { status: 400 });
      }
      updates.slug = slug;
    }

    if (actor.role === 'master' && typeof body.projectId === 'string') {
      const projectId = body.projectId.trim();
      if (!projectId) {
        return NextResponse.json({ error: 'Select a project for this Smart Link' }, { status: 400 });
      }
      const project = await getProjectById(projectId);
      if (!project?._id) {
        return NextResponse.json({ error: 'Project not found' }, { status: 400 });
      }
      updates.projectId = project._id;
      updates.projectName = project.name;
    }

    const updated = await updateSmartLink(id, updates);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update smart link error:', error);
    return NextResponse.json({ error: 'Failed to update smart link' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getSmartLinkActor(_request);
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getSmartLinkById(id);
  if (!existing || !canAccess(actor, existing.projectId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const ok = await deleteSmartLink(id);
  if (!ok) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
