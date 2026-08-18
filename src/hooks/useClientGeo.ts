'use client';

import { useEffect, useRef } from 'react';
import type { GeoLocation } from '@/lib/geo';
import { getClientGeo } from '@/lib/geo';

export function useClientGeo() {
  const geoRef = useRef<GeoLocation>({});

  useEffect(() => {
    void getClientGeo().then((geo) => {
      geoRef.current = geo;
    });
  }, []);

  return geoRef;
}
