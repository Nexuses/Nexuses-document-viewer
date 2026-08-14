import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  createSmartLink,
  getSmartLinks,
  slugExists,
  slugify,
  SmartLinkContentItem,
} from '@/lib/smart-links';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const links = await getSmartLinks();
  return NextResponse.json(links);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
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

    const created = await createSmartLink({
      title,
      description: body.description || '',
      coverImage: body.coverImage || '',
      companyLogo: body.companyLogo || '',
      slug,
      owner: session,
      status: body.status === 'published' ? 'published' : 'draft',
      content,
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error('Create smart link error:', error);
    return NextResponse.json({ error: 'Failed to create smart link' }, { status: 500 });
  }
}
