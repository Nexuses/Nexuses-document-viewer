import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createProject, getProjects, projectSlugExists } from '@/lib/db';
import { slugify } from '@/lib/smart-link-types';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getProjects());
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Full name is required' }, { status: 400 });

  let slug = slugify(body.slug || name);
  const base = slug;
  let n = 1;
  while (await projectSlugExists(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const created = await createProject({
    name,
    slug,
    logoUrl: String(body.logoUrl || '').trim(),
  });
  return NextResponse.json(created);
}
