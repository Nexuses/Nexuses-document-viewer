import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';
import { lookupGeoFromStoredIp, type GeoLocation } from './geo';

export interface Asset {
  _id?: string;
  title: string;
  link: string;
  fileUrl?: string;
  category?: 'document' | 'video';
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Admin {
  _id?: string;
  email: string;
  password: string;
  createdAt?: Date;
}

export interface FormSubmission {
  _id?: string;
  email: string;
  name: string;
  emailNorm?: string;
  nameNorm?: string;
  sessionId?: string;
  smartLinkId?: string;
  smartLinkSlug?: string;
  smartLinkTitle?: string;
  createdAt?: Date;
}

export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

export function normalizePersonName(name: string): string {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export async function getAssets(): Promise<Asset[]> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const assets = await db.collection<Asset>('assets').find({}).toArray();
  
  // Assign default order to assets without order
  const assetsWithOrder = assets.map((asset, index) => ({
    ...asset,
    order: asset.order !== undefined ? asset.order : index,
    category: asset.category || 'document',
  }));
  
  // Sort by order
  assetsWithOrder.sort((a, b) => {
    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    // If orders are equal, sort by creation date
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
  
  return assetsWithOrder.map(asset => ({
    ...asset,
    _id: asset._id?.toString(),
  }));
}

export async function createAsset(
  asset: Omit<Asset, '_id' | 'createdAt' | 'updatedAt' | 'order'>
): Promise<Asset> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const now = new Date();
  
  // Get the maximum order value and add 1 for the new asset
  const maxOrderAsset = await db.collection<Asset>('assets').findOne({}, { sort: { order: -1 } });
  const order = maxOrderAsset?.order !== undefined ? (maxOrderAsset.order + 1) : 0;
  
  const result = await db.collection<Asset>('assets').insertOne({
    ...asset,
    category: asset.category || 'document',
    order,
    createdAt: now,
    updatedAt: now,
  });
  return {
    ...asset,
    category: asset.category || 'document',
    _id: result.insertedId.toString(),
    order,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateAssetOrder(assetId: string, newOrder: number): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  try {
    const result = await db.collection('assets').updateOne(
      { _id: new ObjectId(assetId) },
      { $set: { order: newOrder, updatedAt: new Date() } }
    );
    return result.modifiedCount === 1;
  } catch (error) {
    console.error('Error updating asset order:', error);
    return false;
  }
}

export async function reorderAssets(assetOrders: { id: string; order: number }[]): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  try {
    const bulkOps = assetOrders.map(({ id, order }) => ({
      updateOne: {
        filter: { _id: new ObjectId(id) },
        update: { $set: { order, updatedAt: new Date() } }
      }
    }));
    
    const result = await db.collection('assets').bulkWrite(bulkOps);
    return result.modifiedCount === assetOrders.length;
  } catch (error) {
    console.error('Error reordering assets:', error);
    return false;
  }
}

export async function deleteAsset(id: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  try {
    // Get asset to check if it has a file stored
    const asset = await db.collection('assets').findOne({ _id: new ObjectId(id) });
    
    // Delete the asset
    const result = await db.collection('assets').deleteOne({ _id: new ObjectId(id) });
    
    // If asset had a fileUrl, delete the file from storage
    if (asset?.fileUrl) {
      // Check if it's an S3 file
      if (asset.fileUrl.includes('/api/files/s3/')) {
        const keyMatch = asset.fileUrl.match(/\/api\/files\/s3\/(.+)/);
        if (keyMatch) {
          const fileKey = decodeURIComponent(keyMatch[1]);
          try {
            const { deleteFileFromS3 } = await import('./s3');
            await deleteFileFromS3(fileKey);
          } catch (error) {
            console.error('Error deleting file from S3:', error);
            // Continue even if file deletion fails
          }
        }
      } else if (asset.fileUrl.startsWith('/api/files/')) {
        // GridFS file - extract file ID
        const fileId = asset.fileUrl.replace('/api/files/', '');
        if (ObjectId.isValid(fileId)) {
          try {
            const { GridFSBucket } = await import('mongodb');
            const bucket = new GridFSBucket(db, { bucketName: 'files' });
            await bucket.delete(new ObjectId(fileId));
          } catch (error) {
            console.error('Error deleting file from GridFS:', error);
            // Continue even if file deletion fails
          }
        }
      }
    }
    
    return result.deletedCount === 1;
  } catch (error) {
    console.error('Error deleting asset:', error);
    return false;
  }
}

export async function getAdminByEmail(email: string): Promise<Admin | null> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const admin = await db.collection<Admin>('admins').findOne({ email });
  if (!admin) return null;
  return {
    ...admin,
    _id: admin._id?.toString(),
  };
}

export async function createAdmin(admin: Omit<Admin, '_id' | 'createdAt'>): Promise<Admin> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const now = new Date();
  const result = await db.collection<Admin>('admins').insertOne({
    ...admin,
    createdAt: now,
  });
  return {
    ...admin,
    _id: result.insertedId.toString(),
    createdAt: now,
  };
}

export async function createFormSubmission(
  submission: Omit<FormSubmission, '_id' | 'createdAt'>
): Promise<FormSubmission> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const emailNorm = normalizeEmail(submission.email);
  const nameNorm = normalizePersonName(submission.name);
  const linkFilter: Record<string, unknown> = {};
  if (submission.smartLinkId) linkFilter.smartLinkId = submission.smartLinkId;
  else if (submission.smartLinkSlug) linkFilter.smartLinkSlug = submission.smartLinkSlug;

  if (Object.keys(linkFilter).length > 0 && emailNorm && nameNorm) {
    const existing = await db.collection<FormSubmission>('formSubmissions').findOne({
      ...linkFilter,
      $or: [
        { emailNorm, nameNorm },
        { email: emailNorm, name: submission.name.trim() },
      ],
    });
    if (existing) {
      return { ...existing, _id: existing._id?.toString() };
    }
    const sameLink = await db.collection<FormSubmission>('formSubmissions').find(linkFilter).toArray();
    const duplicate = sameLink.find(
      (item) =>
        normalizeEmail(item.email) === emailNorm && normalizePersonName(item.name) === nameNorm
    );
    if (duplicate) {
      return { ...duplicate, _id: duplicate._id?.toString() };
    }
  }

  const now = new Date();
  const doc = {
    ...submission,
    email: emailNorm || submission.email,
    name: submission.name.trim(),
    emailNorm,
    nameNorm,
    createdAt: now,
  };
  const result = await db.collection<FormSubmission>('formSubmissions').insertOne(doc);
  return {
    ...doc,
    _id: result.insertedId.toString(),
    createdAt: now,
  };
}

export async function getFormSubmissions(): Promise<FormSubmission[]> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const submissions = await db.collection<FormSubmission>('formSubmissions')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  
  return submissions.map(submission => ({
    ...submission,
    _id: submission._id?.toString(),
  }));
}

export function uniqueLeads<T extends { email?: string; name?: string; smartLinkId?: string; smartLinkSlug?: string }>(
  submissions: T[]
): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const submission of submissions) {
    const key = [normalizeEmail(submission.email || ''), normalizePersonName(submission.name || '')].join('::');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(submission);
  }
  return unique;
}

export async function deleteFormSubmission(id: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  try {
    const result = await db.collection('formSubmissions').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  } catch (error) {
    console.error('Error deleting form submission:', error);
    return false;
  }
}

export interface Analytics {
  _id?: string;
  sessionId: string;
  action:
    | 'page_view'
    | 'download'
    | 'session_end'
    | 'form_submitted'
    | 'smart_link_view'
    | 'content_view';
  assetId?: string;
  assetTitle?: string;
  smartLinkId?: string;
  smartLinkSlug?: string;
  smartLinkTitle?: string;
  timeSpent?: number; // in seconds
  timestamp?: Date;
  userAgent?: string;
  ipAddress?: string;
  email?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
}

export async function createAnalyticsEvent(
  analytics: Omit<Analytics, '_id' | 'timestamp'>
): Promise<Analytics> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const now = new Date();
  const result = await db.collection<Analytics>('analytics').insertOne({
    ...analytics,
    timestamp: now,
  });
  return {
    ...analytics,
    _id: result.insertedId.toString(),
    timestamp: now,
  };
}

export async function getAnalytics(): Promise<Analytics[]> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const analytics = await db.collection<Analytics>('analytics')
    .find({})
    .sort({ timestamp: -1 })
    .toArray();
  
  return analytics.map(item => ({
    ...item,
    _id: item._id?.toString(),
  }));
}

export interface AnalyticsSummary {
  totalSessions: number;
  totalPageViews: number;
  totalDownloads: number;
  totalTimeSpent: number; // in seconds
  totalLeads: number;
  totalSmartLinkViews: number;
  uniqueCountries: number;
  mostViewedAssets: { assetId: string; assetTitle: string; views: number }[];
  mostDownloadedAssets: { assetId: string; assetTitle: string; downloads: number }[];
  mostViewedSmartLinks: { smartLinkId: string; smartLinkTitle: string; views: number }[];
  viewsByCountry: {
    country: string;
    countryCode?: string;
    sessions: number;
    pageViews: number;
    totalTimeSpent: number;
    averageTimeSpent: number;
  }[];
  averageSessionTime: number; // in seconds
}

export interface UserSession {
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  email?: string;
  companyName?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  smartLinkTitle?: string;
  smartLinkSlug?: string;
  startTime: Date;
  endTime?: Date;
  totalTimeSpent: number;
  pagesVisited: { assetId: string; assetTitle: string; timestamp: Date }[];
  downloads: { assetId: string; assetTitle: string; timestamp: Date }[];
}

async function buildSessionGeoMap(events: Analytics[]): Promise<Map<string, GeoLocation>> {
  const result = new Map<string, GeoLocation>();
  const ipBySession = new Map<string, string>();
  const ipCache = new Map<string, GeoLocation>();

  for (const event of events) {
    if (!event.sessionId) continue;
    if ((event.country || event.countryCode) && !result.has(event.sessionId)) {
      result.set(event.sessionId, {
        country: event.country,
        countryCode: event.countryCode,
        region: event.region,
        city: event.city,
      });
    }
    if (event.ipAddress && event.ipAddress !== 'unknown') {
      ipBySession.set(event.sessionId, event.ipAddress);
    }
  }

  for (const [sessionId, ip] of ipBySession) {
    if (result.has(sessionId)) continue;
    if (!ipCache.has(ip)) {
      ipCache.set(ip, await lookupGeoFromStoredIp(ip));
    }
    const geo = ipCache.get(ip)!;
    if (geo.country || geo.countryCode) {
      result.set(sessionId, geo);
    }
  }

  return result;
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  
  const [allAnalytics, leadCount] = await Promise.all([
    db.collection<Analytics>('analytics').find({}).toArray(),
    db.collection('formSubmissions').countDocuments({}),
  ]);
  
  const uniqueSessions = new Set(allAnalytics.map((a) => a.sessionId));
  const totalSessions = uniqueSessions.size;
  
  const pageViews = allAnalytics.filter(
    (a) => a.action === 'page_view' || a.action === 'content_view'
  );
  const downloads = allAnalytics.filter((a) => a.action === 'download');
  const sessionEnds = allAnalytics.filter((a) => a.action === 'session_end');
  const smartLinkViews = allAnalytics.filter((a) => a.action === 'smart_link_view');
  
  const totalTimeSpent = sessionEnds.reduce((sum, event) => sum + (event.timeSpent || 0), 0);
  const averageSessionTime = totalSessions > 0 ? totalTimeSpent / totalSessions : 0;

  const sessionMeta: Record<
    string,
    { country?: string; countryCode?: string; region?: string; city?: string; timeSpent: number; pageViews: number }
  > = {};

  for (const event of allAnalytics) {
    if (!event.sessionId) continue;
    if (!sessionMeta[event.sessionId]) {
      sessionMeta[event.sessionId] = { timeSpent: 0, pageViews: 0 };
    }
    const meta = sessionMeta[event.sessionId];
    if (event.country && !meta.country) {
      meta.country = event.country;
      meta.countryCode = event.countryCode;
      meta.region = event.region;
      meta.city = event.city;
    }
    if (event.action === 'page_view' || event.action === 'content_view') meta.pageViews += 1;
    if (event.action === 'session_end') meta.timeSpent += event.timeSpent || 0;
  }

  const sessionGeoMap = await buildSessionGeoMap(allAnalytics);
  for (const [sessionId, meta] of Object.entries(sessionMeta)) {
    if (meta.country || meta.countryCode) continue;
    const geo = sessionGeoMap.get(sessionId);
    if (!geo) continue;
    meta.country = geo.country;
    meta.countryCode = geo.countryCode;
    meta.region = geo.region;
    meta.city = geo.city;
  }

  const countryStats: Record<
    string,
    { country: string; countryCode?: string; sessions: number; pageViews: number; totalTimeSpent: number }
  > = {};

  Object.values(sessionMeta).forEach((meta) => {
    const key = meta.countryCode || meta.country || 'Unknown';
    if (!countryStats[key]) {
      countryStats[key] = {
        country: meta.country || 'Unknown',
        countryCode: meta.countryCode,
        sessions: 0,
        pageViews: 0,
        totalTimeSpent: 0,
      };
    }
    countryStats[key].sessions += 1;
    countryStats[key].pageViews += meta.pageViews;
    countryStats[key].totalTimeSpent += meta.timeSpent;
  });

  const viewsByCountry = Object.values(countryStats)
    .map((row) => ({
      ...row,
      averageTimeSpent: row.sessions > 0 ? row.totalTimeSpent / row.sessions : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions || b.totalTimeSpent - a.totalTimeSpent);
  
  const assetViews: Record<string, { assetId: string; assetTitle: string; views: number }> = {};
  pageViews.forEach((view) => {
    if (view.assetId) {
      if (!assetViews[view.assetId]) {
        assetViews[view.assetId] = {
          assetId: view.assetId,
          assetTitle: view.assetTitle || 'Unknown',
          views: 0,
        };
      }
      assetViews[view.assetId].views++;
    }
  });
  
  const assetDownloads: Record<string, { assetId: string; assetTitle: string; downloads: number }> = {};
  downloads.forEach((download) => {
    if (download.assetId) {
      if (!assetDownloads[download.assetId]) {
        assetDownloads[download.assetId] = {
          assetId: download.assetId,
          assetTitle: download.assetTitle || 'Unknown',
          downloads: 0,
        };
      }
      assetDownloads[download.assetId].downloads++;
    }
  });

  const smartLinkViewCounts: Record<string, { smartLinkId: string; smartLinkTitle: string; views: number }> = {};
  smartLinkViews.forEach((view) => {
    if (!view.smartLinkId) return;
    if (!smartLinkViewCounts[view.smartLinkId]) {
      smartLinkViewCounts[view.smartLinkId] = {
        smartLinkId: view.smartLinkId,
        smartLinkTitle: view.smartLinkTitle || view.smartLinkSlug || 'Smart Link',
        views: 0,
      };
    }
    smartLinkViewCounts[view.smartLinkId].views += 1;
  });
  
  const mostViewedAssets = Object.values(assetViews)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  
  const mostDownloadedAssets = Object.values(assetDownloads)
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 10);

  const mostViewedSmartLinks = Object.values(smartLinkViewCounts)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  
  return {
    totalSessions,
    totalPageViews: pageViews.length,
    totalDownloads: downloads.length,
    totalTimeSpent,
    totalLeads: leadCount,
    totalSmartLinkViews: smartLinkViews.length,
    uniqueCountries: viewsByCountry.filter((row) => row.country !== 'Unknown').length,
    mostViewedAssets,
    mostDownloadedAssets,
    mostViewedSmartLinks,
    viewsByCountry,
    averageSessionTime,
  };
}

export async function getUserSessions(): Promise<UserSession[]> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  
  const allAnalytics = await db.collection<Analytics>('analytics')
    .find({})
    .sort({ timestamp: 1 })
    .toArray();
  
  // Get form submissions to link emails to sessions
  const formSubmissions = await db.collection<FormSubmission>('formSubmissions')
    .find({})
    .toArray();
  
  // Create a map of sessionId to email/company
  const sessionEmailMap: Record<string, { email?: string; companyName?: string }> = {};
  formSubmissions.forEach(submission => {
    if (submission.sessionId) {
      const legacyAny = submission as unknown as {
        companyEmail?: string;
        companyName?: string;
      };
      sessionEmailMap[submission.sessionId] = {
        email: submission.email || legacyAny.companyEmail,
        companyName: legacyAny.companyName,
      };
    }
  });
  
  // Group by session ID
  const sessionsMap: Record<string, UserSession> = {};
  
  allAnalytics.forEach(event => {
    if (!event.sessionId) return;
    
    if (!sessionsMap[event.sessionId]) {
      const emailInfo = sessionEmailMap[event.sessionId];
      sessionsMap[event.sessionId] = {
        sessionId: event.sessionId,
        ipAddress: event.ipAddress || 'unknown',
        userAgent: event.userAgent || 'unknown',
        email: emailInfo?.email,
        companyName: emailInfo?.companyName,
        country: event.country,
        countryCode: event.countryCode,
        region: event.region,
        city: event.city,
        smartLinkTitle: event.smartLinkTitle,
        smartLinkSlug: event.smartLinkSlug,
        startTime: event.timestamp || new Date(),
        totalTimeSpent: 0,
        pagesVisited: [],
        downloads: [],
      };
    }
    
    const session = sessionsMap[event.sessionId];

    if (event.country && !session.country) {
      session.country = event.country;
      session.countryCode = event.countryCode;
      session.region = event.region;
      session.city = event.city;
    }
    if (event.smartLinkTitle && !session.smartLinkTitle) {
      session.smartLinkTitle = event.smartLinkTitle;
      session.smartLinkSlug = event.smartLinkSlug;
    }
    
    // Store email if form was submitted (also check analytics event)
    if (event.action === 'form_submitted' && event.email) {
      session.email = event.email;
    }
    
    if ((event.action === 'page_view' || event.action === 'content_view') && event.assetId) {
      session.pagesVisited.push({
        assetId: event.assetId,
        assetTitle: event.assetTitle || 'Unknown',
        timestamp: event.timestamp || new Date(),
      });
    } else if (event.action === 'download' && event.assetId) {
      session.downloads.push({
        assetId: event.assetId,
        assetTitle: event.assetTitle || 'Unknown',
        timestamp: event.timestamp || new Date(),
      });
    } else if (event.action === 'session_end' && event.timeSpent) {
      session.totalTimeSpent += event.timeSpent;
      session.endTime = event.timestamp || new Date();
    }
    
    // Update start time if earlier
    if (event.timestamp && event.timestamp < session.startTime) {
      session.startTime = event.timestamp;
    }
    
    // Update end time if later
    if (event.timestamp && (!session.endTime || event.timestamp > session.endTime)) {
      session.endTime = event.timestamp;
    }
  });
  
  const sessionGeoMap = await buildSessionGeoMap(allAnalytics);

  // Convert to array and sort by start time (newest first)
  return Object.values(sessionsMap)
    .map((session) => {
      const geo = sessionGeoMap.get(session.sessionId);
      const enriched =
        geo && !session.country && !session.countryCode
          ? { ...session, ...geo }
          : session;
      return {
        ...enriched,
        startTime: enriched.startTime instanceof Date ? enriched.startTime : new Date(enriched.startTime),
        endTime: enriched.endTime instanceof Date
          ? enriched.endTime
          : enriched.endTime
            ? new Date(enriched.endTime)
            : undefined,
      };
    })
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}

export async function deleteUserSession(sessionId: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  try {
    // Delete all analytics events for this session
    const result = await db.collection<Analytics>('analytics').deleteMany({ sessionId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting user session:', error);
    return false;
  }
}

export interface Project {
  _id?: string;
  name: string;
  slug: string;
  logoUrl?: string;
  createdAt?: Date;
}

export interface ProjectUser {
  _id?: string;
  name: string;
  email?: string;
  username: string;
  password: string;
  projectId: string;
  projectName?: string;
  createdAt?: Date;
}

export async function getProjects(): Promise<(Project & { userCount: number })[]> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const projects = await db.collection<Project>('projects').find({}).sort({ createdAt: -1 }).toArray();
  const users = await db.collection<ProjectUser>('projectUsers').find({}).toArray();
  const counts: Record<string, number> = {};
  users.forEach((user) => {
    const id = user.projectId;
    counts[id] = (counts[id] || 0) + 1;
  });
  return projects.map((project) => ({
    ...project,
    _id: project._id?.toString(),
    userCount: counts[project._id?.toString() || ''] || 0,
  }));
}

export async function createProject(data: Omit<Project, '_id' | 'createdAt'>): Promise<Project> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const now = new Date();
  const result = await db.collection<Project>('projects').insertOne({ ...data, createdAt: now });
  return { ...data, _id: result.insertedId.toString(), createdAt: now };
}

export async function projectSlugExists(slug: string, excludeId?: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const filter: Record<string, unknown> = { slug };
  if (excludeId && ObjectId.isValid(excludeId)) {
    filter._id = { $ne: new ObjectId(excludeId) };
  }
  const count = await db.collection('projects').countDocuments(filter);
  return count > 0;
}

export async function updateProject(
  id: string,
  data: Partial<Omit<Project, '_id' | 'createdAt'>>
): Promise<Project | null> {
  if (!ObjectId.isValid(id)) return null;
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const result = await db.collection('projects').updateOne(
    { _id: new ObjectId(id) },
    { $set: data }
  );
  if (result.matchedCount === 0) return null;
  return getProjectById(id);
}

export async function deleteProject(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  await db.collection('projectUsers').deleteMany({ projectId: id });
  const result = await db.collection('projects').deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function getProjectById(id: string): Promise<Project | null> {
  if (!ObjectId.isValid(id)) return null;
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const project = await db.collection('projects').findOne({ _id: new ObjectId(id) });
  if (!project) return null;
  return {
    _id: project._id?.toString(),
    name: String(project.name || ''),
    slug: String(project.slug || ''),
    logoUrl: project.logoUrl ? String(project.logoUrl) : undefined,
    createdAt: project.createdAt instanceof Date ? project.createdAt : undefined,
  };
}

export async function getProjectUsers(): Promise<Omit<ProjectUser, 'password'>[]> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const users = await db.collection<ProjectUser>('projectUsers').find({}).sort({ createdAt: -1 }).toArray();
  const projects = await db.collection<Project>('projects').find({}).toArray();
  const names: Record<string, string> = {};
  projects.forEach((project) => {
    names[project._id?.toString() || ''] = project.name;
  });
  return users.map((user) => {
    const { password: _password, ...rest } = user;
    return {
      ...rest,
      _id: user._id?.toString(),
      projectName: names[user.projectId] || '—',
    };
  });
}

export async function getProjectUserByUsername(username: string): Promise<ProjectUser | null> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const normalized = username.trim().toLowerCase();
  const user = await db.collection<ProjectUser>('projectUsers').findOne({ username: normalized });
  if (!user) return null;
  return { ...user, _id: user._id?.toString() };
}

export async function projectUsernameExists(username: string, excludeId?: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const normalized = username.trim().toLowerCase();
  const filter: Record<string, unknown> = { username: normalized };
  if (excludeId && ObjectId.isValid(excludeId)) {
    filter._id = { $ne: new ObjectId(excludeId) };
  }
  const count = await db.collection('projectUsers').countDocuments(filter);
  return count > 0;
}

export async function createProjectUser(
  data: Omit<ProjectUser, '_id' | 'createdAt' | 'projectName'>
): Promise<Omit<ProjectUser, 'password'>> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const now = new Date();
  const result = await db.collection<ProjectUser>('projectUsers').insertOne({ ...data, createdAt: now });
  const { password: _password, ...rest } = data;
  return { ...rest, _id: result.insertedId.toString(), createdAt: now };
}

export async function updateProjectUser(
  id: string,
  data: Partial<Omit<ProjectUser, '_id' | 'createdAt' | 'projectName'>>
): Promise<Omit<ProjectUser, 'password'> | null> {
  if (!ObjectId.isValid(id)) return null;
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const result = await db.collection('projectUsers').updateOne(
    { _id: new ObjectId(id) },
    { $set: data }
  );
  if (result.matchedCount === 0) return null;
  const user = await db.collection('projectUsers').findOne({ _id: new ObjectId(id) });
  if (!user) return null;
  const project = ObjectId.isValid(String(user.projectId))
    ? await db.collection('projects').findOne({ _id: new ObjectId(String(user.projectId)) })
    : null;
  return {
    _id: user._id?.toString(),
    name: String(user.name || ''),
    email: user.email ? String(user.email) : undefined,
    username: String(user.username || ''),
    projectId: String(user.projectId || ''),
    projectName: project?.name ? String(project.name) : '—',
    createdAt: user.createdAt instanceof Date ? user.createdAt : undefined,
  };
}

export async function deleteProjectUser(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const result = await db.collection('projectUsers').deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

