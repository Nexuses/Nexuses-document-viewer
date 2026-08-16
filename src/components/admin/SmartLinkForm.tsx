'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SmartLink,
  SmartLinkContentItem,
  SmartLinkContentType,
  slugify,
} from '@/lib/smart-link-types';

const CONTENT_BUTTONS: { type: SmartLinkContentType; label: string }[] = [
  { type: 'pdf', label: 'Add PDF' },
  { type: 'ppt', label: 'Add PPT' },
  { type: 'video', label: 'Add Video' },
  { type: 'image', label: 'Add Image' },
  { type: 'website', label: 'Add Website URL' },
  { type: 'html', label: 'HTML' },
  { type: 'doc', label: 'DOC' },
  { type: 'utm', label: 'UTM' },
  { type: 'lead_form', label: 'Lead Form' },
];

const URL_TYPES = new Set<SmartLinkContentType>(['pdf', 'ppt', 'video', 'image', 'doc', 'website']);

function newItem(type: SmartLinkContentType): SmartLinkContentItem {
  return {
    id: crypto.randomUUID(),
    type,
    title: '',
    leadForm:
      type === 'lead_form'
        ? { heading: 'Get in touch', collectName: true, collectEmail: true, collectCompany: false }
        : undefined,
    utm: type === 'utm' ? { source: '', medium: '', campaign: '' } : undefined,
  };
}

function contentSummary(item: SmartLinkContentItem): string {
  if (item.type === 'pdf') {
    return item.pageCount ? `PDF, ${item.pageCount} pages` : 'PDF';
  }
  if (item.type === 'ppt') {
    return item.slideCount
      ? `PowerPoint presentation, ${item.slideCount} slides`
      : 'PowerPoint presentation';
  }
  return item.type.replace('_', ' ');
}

function nameFromUrl(value: string) {
  try {
    const path = new URL(value).pathname.split('/').filter(Boolean).pop() || '';
    return decodeURIComponent(path);
  } catch {
    return '';
  }
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white';

interface Props {
  initial?: SmartLink;
}

export default function SmartLinkForm({ initial }: Props) {
  const router = useRouter();
  const isEdit = Boolean(initial?._id);
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [coverImage, setCoverImage] = useState(initial?.coverImage || '');
  const [companyLogo, setCompanyLogo] = useState(initial?.companyLogo || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  const [status, setStatus] = useState(initial?.status || 'draft');
  const [content, setContent] = useState<SmartLinkContentItem[]>(initial?.content || []);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const updateItem = (id: string, patch: Partial<SmartLinkContentItem>) => {
    setContent((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleTitle = (value: string) => {
    setTitle(value);
    if (!isEdit && !slug) setSlug(slugify(value));
  };

  const setItemUrl = (item: SmartLinkContentItem, value: string) => {
    const fileName = nameFromUrl(value);
    updateItem(item.id, {
      url: value,
      fileUrl: value,
      fileName: fileName || item.fileName,
      title: item.title || fileName,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        title,
        description,
        coverImage,
        companyLogo,
        slug,
        status,
        content,
      };
      const response = await fetch(
        isEdit ? `/api/smart-links/${initial?._id}` : '/api/smart-links',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Save failed');
        return;
      }
      router.push('/admin/dashboard/smart-links');
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Smart Link details</h2>
        <Field label="Title">
          <input required value={title} onChange={(e) => handleTitle(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
        </Field>
        <Field label="Cover Image URL">
          <input
            type="url"
            placeholder="https://"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            className={inputClass}
          />
          {coverImage && <img src={coverImage} alt="" className="mt-2 h-24 rounded-lg object-cover" />}
        </Field>
        <Field label="Company Logo URL">
          <input
            type="url"
            placeholder="https://"
            value={companyLogo}
            onChange={(e) => setCompanyLogo(e.target.value)}
            className={inputClass}
          />
          {companyLogo && <img src={companyLogo} alt="" className="mt-2 h-12 object-contain" />}
        </Field>
        <Field label="Slug">
          <input required value={slug} onChange={(e) => setSlug(slugify(e.target.value))} className={inputClass} />
          <p className="text-xs text-gray-500 mt-1">Public URL: /s/{slug || 'your-slug'}</p>
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
            className={inputClass}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </Field>
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Content Builder</h2>
        <div className="flex flex-wrap gap-2">
          {CONTENT_BUTTONS.map((btn) => (
            <button
              key={btn.type}
              type="button"
              onClick={() => setContent((items) => [...items, newItem(btn.type)])}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-800"
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {content.length === 0 && (
            <p className="text-sm text-gray-500">Add PDFs, decks, videos, and more by URL.</p>
          )}
          {content.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900 capitalize">{contentSummary(item)}</p>
                <button
                  type="button"
                  className="text-sm text-red-600"
                  onClick={() => setContent((items) => items.filter((c) => c.id !== item.id))}
                >
                  Remove
                </button>
              </div>

              {URL_TYPES.has(item.type) && (
                <div className="space-y-2">
                  <input
                    type="url"
                    placeholder="https://"
                    value={item.fileUrl || item.url || ''}
                    onChange={(e) => setItemUrl(item, e.target.value)}
                    className={inputClass}
                  />
                  <input
                    placeholder="Title (optional)"
                    value={item.title || ''}
                    onChange={(e) => updateItem(item.id, { title: e.target.value })}
                    className={inputClass}
                  />
                  {item.type === 'pdf' && (
                    <input
                      type="number"
                      min={1}
                      placeholder="Page count (optional)"
                      value={item.pageCount || ''}
                      onChange={(e) => updateItem(item.id, { pageCount: Number(e.target.value) || undefined })}
                      className={inputClass}
                    />
                  )}
                  {item.type === 'ppt' && (
                    <input
                      type="number"
                      min={1}
                      placeholder="Slide count (optional)"
                      value={item.slideCount || ''}
                      onChange={(e) => updateItem(item.id, { slideCount: Number(e.target.value) || undefined })}
                      className={inputClass}
                    />
                  )}
                  {item.type === 'doc' && (
                    <input
                      type="number"
                      min={1}
                      placeholder="Page count (optional)"
                      value={item.pageCount || ''}
                      onChange={(e) => updateItem(item.id, { pageCount: Number(e.target.value) || undefined })}
                      className={inputClass}
                    />
                  )}
                </div>
              )}

              {item.type === 'html' && (
                <textarea
                  rows={6}
                  placeholder="<div>Your HTML</div>"
                  value={item.html || ''}
                  onChange={(e) => updateItem(item.id, { html: e.target.value })}
                  className={inputClass}
                />
              )}

              {item.type === 'utm' && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {(['source', 'medium', 'campaign', 'content', 'term'] as const).map((key) => (
                    <input
                      key={key}
                      placeholder={`utm_${key}`}
                      value={item.utm?.[key] || ''}
                      onChange={(e) =>
                        updateItem(item.id, { utm: { ...item.utm, [key]: e.target.value } })
                      }
                      className={inputClass}
                    />
                  ))}
                </div>
              )}

              {item.type === 'lead_form' && (
                <div className="space-y-2 text-sm text-gray-700">
                  <input
                    placeholder="Form heading"
                    value={item.leadForm?.heading || ''}
                    onChange={(e) =>
                      updateItem(item.id, { leadForm: { ...item.leadForm, heading: e.target.value } })
                    }
                    className={inputClass}
                  />
                  {(['collectName', 'collectEmail', 'collectCompany'] as const).map((key) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(item.leadForm?.[key])}
                        onChange={(e) =>
                          updateItem(item.id, {
                            leadForm: { ...item.leadForm, [key]: e.target.checked },
                          })
                        }
                      />
                      {key.replace('collect', 'Collect ')}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 bg-[#120C29] text-white rounded-lg font-medium disabled:bg-gray-400"
      >
        {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create Smart Link'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
