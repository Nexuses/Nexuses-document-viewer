import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { countPptxSlides } from '@/lib/pptx';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  const isPptx =
    name.endsWith('.pptx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

  const slideCount = isPptx ? countPptxSlides(buffer) : undefined;

  return NextResponse.json({
    fileName: file.name,
    slideCount: slideCount || undefined,
    display: slideCount
      ? `PowerPoint presentation, ${slideCount} slides`
      : 'PowerPoint presentation',
  });
}
