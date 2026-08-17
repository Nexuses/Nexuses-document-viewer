import { NextRequest, NextResponse } from 'next/server';
import { getSmartLinkActor } from '@/lib/auth';
import {
  createSmartLink,
  getSmartLinks,
  slugExists,
  slugify,
  SmartLinkContentItem,
} from '@/lib/smart-links';

export async function GET() {
  const actor = await getSmartLinkActor();
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const links =
    actor.role === 'project' ? await getSmartLinks(actor.projectId) : await getSmartLinks();
  return NextResponse.json(links);
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getSmartLinkActor();
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
    const projectId = actor.role === 'project' ? actor.projectId : String(body.projectId || '').trim() || undefined;
    const projectName = actor.role === 'project' ? actor.projectName : String(body.projectName || '').trim() || undefined;
    const companyLogo =
      String(body.companyLogo || '').trim() ||
      (actor.role === 'project' ? actor.logoUrl || '' : '');

    const created = await createSmartLink({
      title,
      description: body.description || '',
      coverImage: body.coverImage || '',
      companyLogo,
      slug,
      owner: actor.owner,
      projectId,
      projectName,
      status: body.status === 'published' ? 'published' : 'draft',
      content,
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error('Create smart link error:', error);
    return NextResponse.json({ error: 'Failed to create smart link' }, { status: 500 });
  }
}
