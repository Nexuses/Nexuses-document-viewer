import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createSmartLink, getSmartLinkById, slugExists, slugify } from '@/lib/smart-links';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const source = await getSmartLinkById(id);
  if (!source) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let slug = slugify(`${source.slug}-copy`);
  let n = 1;
  const base = slug;
  while (await slugExists(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const created = await createSmartLink({
    title: `${source.title} (Copy)`,
    description: source.description,
    coverImage: source.coverImage,
    companyLogo: source.companyLogo,
    slug,
    owner: session,
    status: 'draft',
    content: source.content || [],
  });

  return NextResponse.json(created);
}
