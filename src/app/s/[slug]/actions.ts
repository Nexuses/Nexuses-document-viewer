'use server';

import { redirect } from 'next/navigation';
import { createFormSubmission } from '@/lib/db';
import { getSmartLinkBySlug, recordUniqueSmartLinkView } from '@/lib/smart-links';

export async function agreeAndView(formData: FormData) {
  const slug = String(formData.get('slug') || '');
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();

  if (!slug || name.length < 2 || !email.includes('@')) {
    return;
  }

  const link = await getSmartLinkBySlug(slug);
  if (link?._id) {
    try {
      await createFormSubmission({
        name,
        email,
        sessionId: `session_${Date.now()}`,
        smartLinkId: link._id,
        smartLinkSlug: slug,
        smartLinkTitle: link.title,
      });
      await recordUniqueSmartLinkView(link._id, email);
    } catch (error) {
      console.error('agreeAndView save failed', error);
    }
  }

  redirect(`/s/${slug}/view`);
}
