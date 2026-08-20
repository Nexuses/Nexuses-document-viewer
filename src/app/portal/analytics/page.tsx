'use client';

import { useEffect, useState } from 'react';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export default function PortalAnalyticsPage() {
  const [projectName, setProjectName] = useState('your project');

  useEffect(() => {
    fetch('/api/auth/project-check')
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (data.user?.projectName) setProjectName(data.user.projectName);
      })
      .catch(() => undefined);
  }, []);

  return (
    <AnalyticsDashboard
      description={`Visitor locations, time spent, smart link engagement, and content performance for ${projectName}`}
    />
  );
}
