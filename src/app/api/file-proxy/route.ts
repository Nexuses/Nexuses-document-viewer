import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cloudfrontHost() {
  const raw = process.env.AWS_CLOUDFRONT_URL?.trim();
  if (!raw) return null;
  try {
    const withProto = raw.startsWith('http') ? raw : `https://${raw}`;
    return new URL(withProto).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isAllowed(url: URL, request: NextRequest) {
  const host = url.hostname.toLowerCase();
  const originHost = request.nextUrl.hostname.toLowerCase();
  const cf = cloudfrontHost();
  return (
    host === originHost ||
    host === 'localhost' ||
    host.endsWith('.amazonaws.com') ||
    host.endsWith('.cloudfront.net') ||
    (cf != null && host === cf)
  );
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url');
  if (!raw) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let target: URL;
  try {
    target = raw.startsWith('/') ? new URL(raw, request.nextUrl.origin) : new URL(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (!isAllowed(target, request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const res = await fetch(target.href, { redirect: 'follow' });
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: res.status });
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json') && target.pathname.includes('/api/files/s3/')) {
    const data = (await res.json()) as { url?: string };
    if (!data.url) {
      return NextResponse.json({ error: 'File URL missing' }, { status: 502 });
    }
    const nested = await fetch(data.url, { redirect: 'follow' });
    if (!nested.ok) {
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: nested.status });
    }
    const nestedType = nested.headers.get('content-type') || 'application/octet-stream';
    return new NextResponse(nested.body, {
      headers: {
        'Content-Type': nestedType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  }

  return new NextResponse(res.body, {
    headers: {
      'Content-Type': contentType || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
