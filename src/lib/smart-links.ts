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
      .find({}, { projection: { smartLinkId: 1, smartLinkSlug: 1 } })
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

  const linkIdToProject = new Map<string, string>();
  const slugToProject = new Map<string, string>();
  let publishedLinks = 0;
  let draftLinks = 0;
  let unassignedLinks = 0;
  let totalDocuments = 0;
  let totalViews = 0;

  for (const link of links) {
    const projectId = String(link.projectId || '');
    const views = Number(link.views || 0);
    const docs = documentCount(link.content);
    const published = link.status === 'published';
    totalDocuments += docs;
    totalViews += views;
    if (published) publishedLinks += 1;
    else draftLinks += 1;

    const linkId = link._id?.toString();
    if (linkId) linkIdToProject.set(linkId, projectId);
    if (link.slug) slugToProject.set(String(link.slug), projectId);

    const row = byProject.get(projectId);
    if (!row) {
      unassignedLinks += 1;
      continue;
    }
    row.links += 1;
    row.views += views;
    row.documents += docs;
    if (published) row.published += 1;
    else row.drafts += 1;
  }

  let leads = 0;
  for (const submission of submissions) {
    leads += 1;
    const fromId = submission.smartLinkId ? linkIdToProject.get(String(submission.smartLinkId)) : undefined;
    const fromSlug = submission.smartLinkSlug
      ? slugToProject.get(String(submission.smartLinkSlug))
      : undefined;
    const projectId = fromId || fromSlug || '';
    const row = byProject.get(projectId);
    if (row) row.leads += 1;
  }

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
      .find({}, { projection: { smartLinkId: 1, smartLinkSlug: 1 } })
      .toArray(),
  ]);

  const linkIds = new Set(links.map((link) => link._id?.toString()).filter(Boolean) as string[]);
  const slugs = new Set(links.map((link) => String(link.slug || '')).filter(Boolean));

  let publishedLinks = 0;
  let draftLinks = 0;
  let totalDocuments = 0;
  let totalViews = 0;
  for (const link of links) {
    const published = link.status === 'published';
    if (published) publishedLinks += 1;
    else draftLinks += 1;
    totalDocuments += documentCount(link.content);
    totalViews += Number(link.views || 0);
  }

  const leads = submissions.filter((submission) => {
    const id = submission.smartLinkId ? String(submission.smartLinkId) : '';
    const slug = submission.smartLinkSlug ? String(submission.smartLinkSlug) : '';
    return (id && linkIds.has(id)) || (slug && slugs.has(slug));
  }).length;

  return {
    projectName: project?.name ? String(project.name) : '',
    totalSmartLinks: links.length,
    publishedLinks,
    draftLinks,
    totalDocuments,
    totalViews,
    leads,
    users,
  };
}
