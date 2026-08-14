import { NextRequest, NextResponse } from 'next/server';
import { createFormSubmission, getFormSubmissions, deleteFormSubmission } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const submissions = await getFormSubmissions();
    return NextResponse.json(submissions);
  } catch (error) {
    console.error('Error fetching form submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form submissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      name,
      sessionId,
      smartLinkId,
      smartLinkSlug,
      smartLinkTitle,
    } = await request.json();

    // Validate required fields
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const submission = await createFormSubmission({
      email,
      name,
      sessionId,
      smartLinkId,
      smartLinkSlug,
      smartLinkTitle,
    });

    // Track form submission in analytics
    if (sessionId) {
      try {
        await fetch(`${request.nextUrl.origin}/api/analytics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            action: 'form_submitted',
            email,
            userAgent: request.headers.get('user-agent') || 'unknown',
          }),
        });
      } catch (err) {
        console.error('Error tracking form submission in analytics:', err);
      }
    }

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error('Error creating form submission:', error);
    return NextResponse.json(
      { error: 'Failed to create form submission' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      );
    }

    const deleted = await deleteFormSubmission(id);
    
    if (deleted) {
      return NextResponse.json({ success: true, message: 'Submission deleted successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete submission or submission not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json(
      { error: 'Failed to delete submission' },
      { status: 500 }
    );
  }
}

