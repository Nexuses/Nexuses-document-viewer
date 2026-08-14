'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SmartLink,
  SmartLinkContentItem,
  SmartLinkContentType,
  slugify,
} from '@/lib/smart-link-types';
import { countPdfPages, uploadFile } from '@/lib/client-upload';

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

interface Props {
  initial?: SmartLink;
}

const FILE_INPUT_CLASS =
  'block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-900 hover:file:bg-gray-200 cursor-pointer';

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
  const [uploading, setUploading] = useState<string | null>(null);

  const updateItem = (id: string, patch: Partial<SmartLinkContentItem>) => {
    setContent((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleTitle = (value: string) => {
    setTitle(value);
    if (!isEdit && !slug) setSlug(slugify(value));
  };

  const handleImageUpload = async (
    file: File,
    setter: (url: string) => void
  ) => {
    setUploading('media');
    try {
      const url = await uploadFile(file);
      setter(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleContentFile = async (item: SmartLinkContentItem, file: File) => {
    setUploading(item.id);
    setError('');
    try {
      let pageCount = item.pageCount;
      let slideCount = item.slideCount;

      if (item.type === 'pdf') {
        pageCount = await countPdfPages(file);
      }

      if (item.type === 'ppt') {
        const metaForm = new FormData();
        metaForm.append('file', file);
        const metaRes = await fetch('/api/smart-links/pptx-meta', { method: 'POST', body: metaForm });
        if (metaRes.ok) {
          const meta = await metaRes.json();
          slideCount = meta.slideCount;
        }
      }

      const url = await uploadFile(file);
      updateItem(item.id, {
        fileUrl: url,
        fileName: file.name,
        pageCount,
        slideCount,
        title: item.title || file.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
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
          <input
            required
            value={title}
            onChange={(e) => handleTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          />
        </Field>
        <Field label="Cover Image">
          <input
            type="file"
            accept="image/*"
            className={FILE_INPUT_CLASS}
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], setCoverImage)}
          />
          {coverImage && <img src={coverImage} alt="" className="mt-2 h-24 rounded-lg object-cover" />}
        </Field>
        <Field label="Company Logo">
          <input
            type="file"
            accept="image/*"
            className={FILE_INPUT_CLASS}
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], setCompanyLogo)}
          />
          {companyLogo && <img src={companyLogo} alt="" className="mt-2 h-12 object-contain" />}
        </Field>
        <Field label="Slug">
          <input
            required
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          />
          <p className="text-xs text-gray-500 mt-1">Public URL: /s/{slug || 'your-slug'}</p>
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
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
            <p className="text-sm text-gray-500">Add PDFs, decks, videos, and more.</p>
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

              {(item.type === 'pdf' || item.type === 'ppt' || item.type === 'video' || item.type === 'image' || item.type === 'doc') && (
                <div>
                  <input
                    type="file"
                    className={FILE_INPUT_CLASS}
                    accept={
                      item.type === 'pdf'
                        ? 'application/pdf'
                        : item.type === 'ppt'
                          ? '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'
                          : item.type === 'video'
                            ? 'video/mp4,video/webm,video/quicktime'
                            : item.type === 'image'
                              ? 'image/*'
                              : '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    }
                    onChange={(e) => e.target.files?.[0] && handleContentFile(item, e.target.files[0])}
                  />
                  {uploading === item.id && <p className="text-xs text-gray-500 mt-1">Uploading…</p>}
                  {item.fileName && <p className="text-xs text-gray-600 mt-1">{item.fileName}</p>}
                </div>
              )}

              {item.type === 'website' && (
                <input
                  placeholder="https://"
                  value={item.url || ''}
                  onChange={(e) => updateItem(item.id, { url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              )}

              {item.type === 'html' && (
                <textarea
                  rows={6}
                  placeholder="<div>Your HTML</div>"
                  value={item.html || ''}
                  onChange={(e) => updateItem(item.id, { html: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
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
      {uploading === 'media' && <p className="text-sm text-gray-500">Uploading image…</p>}

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
