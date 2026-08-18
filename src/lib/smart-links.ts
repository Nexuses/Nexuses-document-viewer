import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';
import type { MasterAdminStats, ProjectAdminStats, ProjectStat, SmartLink } from './smart-link-types';

export type {
  SmartLink,
  SmartLinkContentItem,
  SmartLinkContentType,
  SmartLinkStatus,
} from './smart-link-types';
export { slugify } from './smart-link-types';

function mapDoc(doc: Omit<SmartLink, '_id'> & { _id?: ObjectId | string }): SmartLink {
  return {
    ...doc,
    _id: doc._id?.toString(),
    projectId: doc.projectId != null ? String(doc.projectId) : undefined,
    content: doc.content || [],
    views: doc.views ?? 0,
    status: doc.status || 'draft',
  };
}

function projectScope(projectId: string) {
  const values: Array<string | ObjectId> = [String(projectId)];
  if (ObjectId.isValid(projectId)) values.push(new ObjectId(projectId));
  return { projectId: { $in: values } };
}

export async function getSmartLinks(projectId?: string): Promise<SmartLink[]> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const filter = projectId ? projectScope(projectId) : {};
  const docs = await db
    .collection('smartLinks')
    .find(filter)
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map((doc) => mapDoc(doc as Omit<SmartLink, '_id'> & { _id?: ObjectId | string }));
}

export async function getSmartLinkById(id: string): Promise<SmartLink | null> {
  if (!ObjectId.isValid(id)) return null;
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const doc = await db.collection('smartLinks').findOne({ _id: new ObjectId(id) });
  return doc ? mapDoc(doc as Omit<SmartLink, '_id'> & { _id?: ObjectId | string }) : null;
}

export async function getSmartLinkBySlug(slug: string): Promise<SmartLink | null> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const doc = await db.collection('smartLinks').findOne({ slug });
  return doc ? mapDoc(doc as Omit<SmartLink, '_id'> & { _id?: ObjectId | string }) : null;
}

export async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const filter: Record<string, unknown> = { slug };
  if (excludeId && ObjectId.isValid(excludeId)) {
    filter._id = { $ne: new ObjectId(excludeId) };
  }
  const count = await db.collection('smartLinks').countDocuments(filter);
  return count > 0;
}

export async function createSmartLink(
  data: Omit<SmartLink, '_id' | 'createdAt' | 'updatedAt' | 'views'> & { views?: number }
): Promise<SmartLink> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const now = new Date();
  const doc = {
    ...data,
    projectId: data.projectId ? String(data.projectId) : undefined,
    views: data.views ?? 0,
    content: data.content || [],
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection('smartLinks').insertOne(doc);
  return mapDoc({ ...doc, _id: result.insertedId });
}

export async function updateSmartLink(
  id: string,
  data: Partial<Omit<SmartLink, '_id' | 'createdAt'>>
): Promise<SmartLink | null> {
  if (!ObjectId.isValid(id)) return null;
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const patch = {
    ...data,
    ...(data.projectId != null ? { projectId: String(data.projectId) } : {}),
    updatedAt: new Date(),
  };
  await db.collection('smartLinks').updateOne(
    { _id: new ObjectId(id) },
    { $set: patch }
  );
  return getSmartLinkById(id);
}

export async function deleteSmartLink(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const result = await db.collection('smartLinks').deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function incrementSmartLinkViews(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  await db.collection('smartLinks').updateOne({ _id: new ObjectId(id) }, { $inc: { views: 1 } });
}

export async function recordUniqueSmartLinkView(id: string, email: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const emailNorm = String(email || '').trim().toLowerCase();
  if (!emailNorm) return false;

  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const viewers = db.collection('smartLinkViewers');
  try {
    await viewers.createIndex({ smartLinkId: 1, email: 1 }, { unique: true });
  } catch {
    // index already exists
  }

  const result = await viewers.updateOne(
    { smartLinkId: id, email: emailNorm },
    { $setOnInsert: { smartLinkId: id, email: emailNorm, createdAt: new Date() } },
    { upsert: true }
  );

  const uniqueViews = await viewers.countDocuments({ smartLinkId: id });
  await db.collection('smartLinks').updateOne({ _id: new ObjectId(id) }, { $set: { views: uniqueViews } });
  return Boolean(result.upsertedCount);
}

const DOCUMENT_TYPES = new Set(['pdf', 'ppt', 'doc']);

function documentCount(content: unknown): number {
  if (!Array.isArray(content)) return 0;
  return content.filter((item) => DOCUMENT_TYPES.has((item as { type?: string }).type || '')).length;
}

export async function getSmartLinkStats(): Promise<MasterAdminStats> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const [projects, users, links, submissions] = await Promise.all([
    db.collection('projects').find({}).sort({ name: 1 }).toArray(),
    db.collection('projectUsers').find({}, { projection: { projectId: 1 } }).toArray(),
    db
      .collection('smartLinks')
      .find(
        {},
        {
          projection: {
            projectId: 1,
            projectName: 1,
            status: 1,
            views: 1,
            content: 1,
            slug: 1,
          },
        }
      )
      .toArray(),
    db
      .collection('formSubmissions')
      .find({}, { projection: { smartLinkId: 1, smartLinkSlug: 1, email: 1, name: 1 } })
      .toArray(),
  ]);

  const emptyProject = (): Omit<ProjectStat, 'id' | 'name' | 'slug' | 'logoUrl'> => ({
    users: 0,
    links: 0,
    published: 0,
    drafts: 0,
    documents: 0,
    views: 0,
    leads: 0,
  });

  const byProject = new Map<string, ProjectStat>();
  for (const project of projects) {
    const id = project._id?.toString() || '';
    byProject.set(id, {
      id,
      name: String(project.name || 'Untitled'),
      slug: String(project.slug || ''),
      logoUrl: project.logoUrl ? String(project.logoUrl) : undefined,
      ...emptyProject(),
    });
  }

  for (const user of users) {
    const id = String(user.projectId || '');
    const row = byProject.get(id);
    if (row) row.users += 1;
  }

  const linkViewEmails = new Map<string, Set<string>>();
  const slugToLinkId = new Map<string, string>();
  for (const link of links) {
    const linkId = link._id?.toString();
    if (linkId) linkViewEmails.set(linkId, new Set());
    if (link.slug && linkId) slugToLinkId.set(String(link.slug), linkId);
  }

  const linkIdToProject = new Map<string, string>();
  let publishedLinks = 0;
  let draftLinks = 0;
  let unassignedLinks = 0;
  let totalDocuments = 0;

  for (const link of links) {
    const projectId = String(link.projectId || '');
    const docs = documentCount(link.content);
    const published = link.status === 'published';
    totalDocuments += docs;
    if (published) publishedLinks += 1;
    else draftLinks += 1;

    const linkId = link._id?.toString();
    if (linkId) linkIdToProject.set(linkId, projectId);

    const row = byProject.get(projectId);
    if (!row) {
      unassignedLinks += 1;
      continue;
    }
    row.links += 1;
    row.documents += docs;
    if (published) row.published += 1;
    else row.drafts += 1;
  }

  for (const submission of submissions) {
    const email = String(submission.email || '').trim().toLowerCase();
    const name = String(submission.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const fromId = submission.smartLinkId ? String(submission.smartLinkId) : '';
    const fromSlug = submission.smartLinkSlug ? String(submission.smartLinkSlug) : '';
    const linkId = (fromId && linkViewEmails.has(fromId) ? fromId : '') || slugToLinkId.get(fromSlug) || fromId;
    if (!linkId) continue;
    if (email) {
      if (!linkViewEmails.has(linkId)) linkViewEmails.set(linkId, new Set());
      linkViewEmails.get(linkId)!.add(email);
    }
  }

  let totalViews = 0;
  let leads = 0;
  const globalLeadKeys = new Set<string>();
  const projectLeadKeys = new Map<string, Set<string>>();

  linkViewEmails.forEach((emails, linkId) => {
    const views = emails.size;
    totalViews += views;
    const projectId = linkIdToProject.get(linkId);
    const row = projectId ? byProject.get(projectId) : undefined;
    if (row) row.views += views;
  });

  for (const submission of submissions) {
    const email = String(submission.email || '').trim().toLowerCase();
    const name = String(submission.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
    if (!email || !name) continue;
    const person = `${email}::${name}`;
    globalLeadKeys.add(person);
    const fromId = submission.smartLinkId ? String(submission.smartLinkId) : '';
    const fromSlug = submission.smartLinkSlug ? String(submission.smartLinkSlug) : '';
    const linkId = (fromId && linkIdToProject.has(fromId) ? fromId : '') || slugToLinkId.get(fromSlug) || '';
    const projectId = linkId ? linkIdToProject.get(linkId) : undefined;
    if (projectId) {
      if (!projectLeadKeys.has(projectId)) projectLeadKeys.set(projectId, new Set());
      projectLeadKeys.get(projectId)!.add(person);
    }
  }
  leads = globalLeadKeys.size;
  projectLeadKeys.forEach((keys, projectId) => {
    const row = byProject.get(projectId);
    if (row) row.leads = keys.size;
  });

  return {
    totalProjects: projects.length,
    totalUsers: users.length,
    totalSmartLinks: links.length,
    publishedLinks,
    draftLinks,
    unassignedLinks,
    totalDocuments,
    totalViews,
    leads,
    projects: Array.from(byProject.values()),
  };
}

export async function getProjectAdminStats(projectId: string): Promise<ProjectAdminStats> {
  const empty: ProjectAdminStats = {
    projectName: '',
    totalSmartLinks: 0,
    publishedLinks: 0,
    draftLinks: 0,
    totalDocuments: 0,
    totalViews: 0,
    leads: 0,
    users: 0,
  };
  if (!ObjectId.isValid(projectId)) return empty;

  const client = await clientPromise;
  const db = client.db('nexuses-asset');

  const [project, users, links, submissions] = await Promise.all([
    db.collection('projects').findOne({ _id: new ObjectId(projectId) }),
    db.collection('projectUsers').countDocuments({ projectId }),
    db
      .collection('smartLinks')
      .find(projectScope(projectId), { projection: { status: 1, views: 1, content: 1, slug: 1 } })
      .toArray(),
    db
      .collection('formSubmissions')
      .find({}, { projection: { smartLinkId: 1, smartLinkSlug: 1, email: 1, name: 1 } })
      .toArray(),
  ]);

  const linkIds = new Set(links.map((link) => link._id?.toString()).filter(Boolean) as string[]);
  const slugs = new Set(links.map((link) => String(link.slug || '')).filter(Boolean));

  let publishedLinks = 0;
  let draftLinks = 0;
  let totalDocuments = 0;
  for (const link of links) {
    const published = link.status === 'published';
    if (published) publishedLinks += 1;
    else draftLinks += 1;
    totalDocuments += documentCount(link.content);
  }

  const viewEmails = new Map<string, Set<string>>();
  const leadKeys = new Set<string>();
  for (const submission of submissions) {
    const id = submission.smartLinkId ? String(submission.smartLinkId) : '';
    const slug = submission.smartLinkSlug ? String(submission.smartLinkSlug) : '';
    const linkId = (id && linkIds.has(id) ? id : '') || (slug && slugs.has(slug) ? slug : '');
    if (!((id && linkIds.has(id)) || (slug && slugs.has(slug)))) continue;
    const email = String(submission.email || '').trim().toLowerCase();
    const name = String(submission.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const key = id || slug;
    if (email && key) {
      if (!viewEmails.has(key)) viewEmails.set(key, new Set());
      viewEmails.get(key)!.add(email);
    }
    if (email && name) leadKeys.add(`${email}::${name}`);
  }

  let totalViews = 0;
  viewEmails.forEach((emails) => {
    totalViews += emails.size;
  });

  return {
    projectName: project?.name ? String(project.name) : '',
    totalSmartLinks: links.length,
    publishedLinks,
    draftLinks,
    totalDocuments,
    totalViews,
    leads: leadKeys.size,
    users,
  };
}
