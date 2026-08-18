export interface GeoLocation {
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
}

const STORAGE_KEY = 'viewer-geo';

function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let ip = raw.split(',')[0]?.trim();
  if (!ip) return null;

  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }

  if (
    ip === 'unknown' ||
    ip === '::1' ||
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  ) {
    return null;
  }

  return ip;
}

export function clientIpFromHeaders(headers: Headers): string | null {
  return normalizeIp(
    headers.get('x-forwarded-for') ||
      headers.get('x-vercel-forwarded-for') ||
      headers.get('cf-connecting-ip') ||
      headers.get('x-real-ip')
  );
}

function parseIpWhois(data: Record<string, unknown>): GeoLocation {
  if (!data.success) return {};
  return {
    country: typeof data.country === 'string' ? data.country : undefined,
    countryCode: typeof data.country_code === 'string' ? data.country_code : undefined,
    region: typeof data.region === 'string' ? data.region : undefined,
    city: typeof data.city === 'string' ? data.city : undefined,
  };
}

function parseIpApi(data: Record<string, unknown>): GeoLocation {
  if (data.status !== 'success') return {};
  return {
    country: typeof data.country === 'string' ? data.country : undefined,
    countryCode: typeof data.countryCode === 'string' ? data.countryCode : undefined,
    region: typeof data.regionName === 'string' ? data.regionName : undefined,
    city: typeof data.city === 'string' ? data.city : undefined,
  };
}

async function fetchGeoFromProvider(url: string, parser: (data: Record<string, unknown>) => GeoLocation) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return {};
  const data = (await res.json()) as Record<string, unknown>;
  return parser(data);
}

export async function lookupGeo(ip: string | null): Promise<GeoLocation> {
  const providers = ip
    ? [
        () => fetchGeoFromProvider(`https://ipwho.is/${encodeURIComponent(ip)}`, parseIpWhois),
        () =>
          fetchGeoFromProvider(
            `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city`,
            parseIpApi
          ),
      ]
    : [
        () => fetchGeoFromProvider('https://ipwho.is/', parseIpWhois),
        () =>
          fetchGeoFromProvider(
            'http://ip-api.com/json/?fields=status,country,countryCode,regionName,city',
            parseIpApi
          ),
      ];

  for (const provider of providers) {
    try {
      const geo = await provider();
      if (geo.country || geo.countryCode) return geo;
    } catch {
      // try next provider
    }
  }

  return {};
}

export function sanitizeGeo(input: Partial<GeoLocation> | undefined): GeoLocation {
  if (!input) return {};
  const country = typeof input.country === 'string' ? input.country.trim().slice(0, 80) : undefined;
  const countryCode =
    typeof input.countryCode === 'string' ? input.countryCode.trim().toUpperCase().slice(0, 2) : undefined;
  const region = typeof input.region === 'string' ? input.region.trim().slice(0, 80) : undefined;
  const city = typeof input.city === 'string' ? input.city.trim().slice(0, 80) : undefined;
  if (!country && !countryCode && !region && !city) return {};
  return { country, countryCode, region, city };
}

export async function resolveEventGeo(
  headers: Headers,
  clientGeo?: Partial<GeoLocation>
): Promise<GeoLocation & { ipAddress: string }> {
  const ip = clientIpFromHeaders(headers);
  const ipAddress = ip || 'unknown';
  const serverGeo = await lookupGeo(ip);
  if (serverGeo.country || serverGeo.countryCode) {
    return { ...serverGeo, ipAddress };
  }

  const fallback = sanitizeGeo(clientGeo);
  if (fallback.country || fallback.countryCode) {
    return { ...fallback, ipAddress };
  }

  // Last resort: provider lookup without IP uses the server's egress IP (better than nothing locally).
  const egressGeo = ip ? {} : await lookupGeo(null);
  return { ...egressGeo, ipAddress };
}

export async function lookupGeoFromStoredIp(ipAddress?: string): Promise<GeoLocation> {
  return lookupGeo(normalizeIp(ipAddress || null));
}

export async function getClientGeo(): Promise<GeoLocation> {
  if (typeof window === 'undefined') return {};
  try {
    const cached = window.sessionStorage.getItem(STORAGE_KEY);
    if (cached) return JSON.parse(cached) as GeoLocation;
  } catch {
    // ignore bad cache
  }

  const geo = await lookupGeo(null);
  if (geo.country || geo.countryCode) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(geo));
    } catch {
      // ignore storage failures
    }
  }
  return geo;
}
