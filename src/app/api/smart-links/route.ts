import { NextRequest, NextResponse } from 'next/server';
import { getSmartLinkActor } from '@/lib/auth';
import { getProjectById } from '@/lib/db';
import {
  createSmartLink,
  getSmartLinks,
  slugExists,
  slugify,
  SmartLinkContentItem,
} from '@/lib/smart-links';

async function resolveProject(
  actor: NonNullable<Awaited<ReturnType<typeof getSmartLinkActor>>>,
  requestedId?: string
) {
  if (actor.role === 'project') {
    return { projectId: actor.projectId, projectName: actor.projectName, logoUrl: actor.logoUrl };
  }
  const projectId = String(requestedId || '').trim();
  if (!projectId) {
    return { error: 'Select a project for this Smart Link' };
  }
  const project = await getProjectById(projectId);
  if (!project?._id) {
    return { error: 'Project not found' };
  }
  return { projectId: project._id, projectName: project.name, logoUrl: project.logoUrl };
}

export async function GET(request: NextRequest) {
  const actor = await getSmartLinkActor(request);
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const links =
    actor.role === 'project' ? await getSmartLinks(actor.projectId) : await getSmartLinks();
  return NextResponse.json(links);
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getSmartLinkActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const title = String(body.title || '').trim();
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    let slug = slugify(body.slug || title);
    let n = 1;
    const base = slug;
    while (await slugExists(slug)) {
      n += 1;
      slug = `${base}-${n}`;
    }

    const content: SmartLinkContentItem[] = Array.isArray(body.content) ? body.content : [];
    const project = await resolveProject(actor, body.projectId);
    if ('error' in project) {
      return NextResponse.json({ error: project.error }, { status: 400 });
    }
    const companyLogo = String(body.companyLogo || '').trim() || project.logoUrl || '';

    const created = await createSmartLink({
      title,
      description: body.description || '',
      coverImage: body.coverImage || '',
      companyLogo,
      slug,
      owner: actor.owner,
      projectId: project.projectId,
      projectName: project.projectName,
      status: body.status === 'published' ? 'published' : 'draft',
      content,
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error('Create smart link error:', error);
    return NextResponse.json({ error: 'Failed to create smart link' }, { status: 500 });
  }
}
