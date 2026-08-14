import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';
import type { SmartLink } from './smart-link-types';

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
    content: doc.content || [],
    views: doc.views ?? 0,
    status: doc.status || 'draft',
  };
}

export async function getSmartLinks(): Promise<SmartLink[]> {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const docs = await db
    .collection('smartLinks')
    .find({})
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
  await db.collection('smartLinks').updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...data, updatedAt: new Date() } }
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

export async function getSmartLinkStats() {
  const client = await clientPromise;
  const db = client.db('nexuses-asset');
  const [totalSmartLinks, totalViewsAgg, leads, links] = await Promise.all([
    db.collection('smartLinks').countDocuments(),
    db.collection('smartLinks').aggregate([{ $group: { _id: null, views: { $sum: '$views' } } }]).toArray(),
    db.collection('formSubmissions').countDocuments(),
    db.collection('smartLinks').find({}, { projection: { content: 1 } }).toArray(),
  ]);

  const documentTypes = new Set(['pdf', 'ppt', 'doc']);
  const totalDocuments = links.reduce((sum, link) => {
    const content = (link.content as { type?: string }[] | undefined) || [];
    return sum + content.filter((item) => documentTypes.has(item.type || '')).length;
  }, 0);

  return {
    totalSmartLinks,
    totalDocuments,
    totalViews: totalViewsAgg[0]?.views ?? 0,
    leads,
  };
}
