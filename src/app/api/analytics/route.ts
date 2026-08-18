import { NextRequest, NextResponse } from 'next/server';
import { createAnalyticsEvent, getAnalytics, getAnalyticsSummary, getUserSessions, deleteUserSession } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { resolveEventGeo } from '@/lib/geo';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const summary = searchParams.get('summary') === 'true';
    const sessions = searchParams.get('sessions') === 'true';

    if (sessions) {
      const userSessions = await getUserSessions();
      return NextResponse.json(userSessions);
    } else if (summary) {
      const analyticsSummary = await getAnalyticsSummary();
      return NextResponse.json(analyticsSummary);
    } else {
      const analytics = await getAnalytics();
      return NextResponse.json(analytics);
    }
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      body = await request.json();
    } else {
      // Handle sendBeacon blob
      const text = await request.text();
      body = JSON.parse(text);
    }
    
    const {
      sessionId,
      action,
      assetId,
      assetTitle,
      smartLinkId,
      smartLinkSlug,
      smartLinkTitle,
      timeSpent,
      userAgent,
      email,
      country: clientCountry,
      countryCode: clientCountryCode,
      region: clientRegion,
      city: clientCity,
    } = body;

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: 'Session ID and action are required' },
        { status: 400 }
      );
    }

    const geo = await resolveEventGeo(request.headers, {
      country: clientCountry,
      countryCode: clientCountryCode,
      region: clientRegion,
      city: clientCity,
    });

    const analytics = await createAnalyticsEvent({
      sessionId,
      action,
      assetId,
      assetTitle,
      smartLinkId,
      smartLinkSlug,
      smartLinkTitle,
      timeSpent,
      email,
      userAgent: userAgent || request.headers.get('user-agent') || 'unknown',
      ipAddress: geo.ipAddress,
      country: geo.country,
      countryCode: geo.countryCode,
      region: geo.region,
      city: geo.city,
    });

    return NextResponse.json(analytics, { status: 201 });
  } catch (error) {
    console.error('Error creating analytics event:', error);
    return NextResponse.json(
      { error: 'Failed to create analytics event' },
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
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const deleted = await deleteUserSession(sessionId);
    
    if (deleted) {
      return NextResponse.json({ success: true, message: 'Session deleted successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete session or session not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}

