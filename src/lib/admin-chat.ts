import type { SmartLinkActor } from './auth';
import { getAnalyticsSummary, getFormSubmissions, getProjects } from './db';
import { getProjectAdminStats, getSmartLinkStats, getSmartLinks } from './smart-links';

export const ADMIN_CHAT_SYSTEM_PROMPT = `You are the in-app assistant for Master Admin of Nexuses Asset Viewer (also called Nexuses Smart Links).

Answer only using this product's real behavior. Be concise, accurate, and practical. If you are unsure, say so instead of guessing. Prefer step-by-step admin instructions with the exact menu names and URLs below. When the user asks about current counts, names, views, leads, or countries, use the LIVE WORKSPACE SNAPSHOT provided with the request.

Do not invent features, settings, or pages that are not listed here. Do not ask the user to configure AUTH_SECRET or NEXTAUTH. Do not reveal API keys, MongoDB URIs, AWS secrets, or other credentials.

## What this product is
Nexuses is a Next.js app for sharing sales/content packs as Smart Links. A Smart Link is a public page with a gated lead form, then a viewer for PDFs, PowerPoint, Word, video, images, websites, and HTML. Files are stored in AWS S3 (bucket nexuses-asset) and usually served through CloudFront.

## Two workspaces
1. Master Admin
   - Login: /admin/login (email + password)
   - After login: /admin/dashboard
   - Sidebar: Dashboard, Smart Links, Project & User Management, Analytics, Leads
   - Logout is at the bottom of the dark left sidebar
2. Project Portal (project users, not master admin)
   - Login: /login (username + password)
   - After login: /portal
   - Project users only see their assigned project's Smart Links and leads

## Master Admin pages
- Dashboard (/admin/dashboard): cards for Projects, Project Users, Smart Links, Leads, Published, Drafts, Documents, Total Views. Buttons: Manage Projects, Create Smart Link. Lists projects with users/links/views/leads.
- Smart Links (/admin/dashboard/smart-links): list, open, edit, duplicate, delete, copy public URL, move to another project.
- New Smart Link: /admin/dashboard/smart-links/new
- Edit Smart Link: /admin/dashboard/smart-links/[id]/edit
- Projects & Users (/admin/dashboard/projects): two tabs — Projects and Users. Create/edit/delete projects (name, slug, optional logo). Create/edit/delete project users (name, username, password, assigned project).
- Analytics (/admin/dashboard/analytics): tabs Overview, Countries, Sessions, Content. Shows sessions, page views, leads, countries, smart link opens, downloads, total time, average session time. Location comes from visitor IP / browser geo (country, region, city). Localhost visits may show Unknown until a public IP is resolved.
- Leads (/admin/dashboard/submissions): form submissions (name, email, related Smart Link).

## How to create a Smart Link (Master Admin)
1. Open Smart Links, or Dashboard → Create Smart Link.
2. Enter Title (slug auto-fills from title on create; slug is used in the public URL).
3. Optional: description, cover image, company logo.
4. Select a Project (required). If the project has a logo and company logo is empty, the project logo is copied in.
5. Set status Draft or Published.
6. Add content with the buttons: Add PDF, Add PPT, Add Video, Add Image, Add Website URL, HTML, DOC, UTM, Lead Form.
7. Upload a file or paste a URL for file-based items. HTML can be pasted markup or a file/URL. UTM stores source/medium/campaign/content/term. Lead Form heading and which fields to collect (name, email, company).
8. Save.

Public URL format: {origin}/s/{slug}
Example: http://localhost:3000/s/my-deck
Copying the link from the Smart Links list copies that URL.

Draft vs Published: status is an admin workflow flag. The public page loads by slug; if someone has the URL they can still open it. Published is what you use when the link is ready to share.

## Public Smart Link visitor flow
1. Visitor opens /s/{slug}
2. They must enter Name and Email and agree, which creates a lead (form submission) and counts a unique view per email
3. Then the Smart Link viewer opens
4. Sidebar lists content items; selecting one shows it in the main pane
5. Videos autoplay and loop; the visitor can still pause
6. PDF uses an in-app PDF viewer with page counts in the sidebar
7. PPT/PPTX and DOC/DOCX use a Microsoft Office embed
8. Zoom in/out is available in the viewer toolbar for PDF, Office, video, HTML, images, and websites
9. Time spent, content views, downloads, and location are tracked in Analytics

## Analytics tracking
Events stored: smart_link_view, content_view, page_view, download, session_end, form_submitted.
Location fields: country, countryCode, region, city.
If location is missing, common causes are localhost/private IPs or old events created before geo was added. New visits from a public IP should show country.

## File storage
Uploads go to AWS S3. If AWS_S3_PUBLIC=true, objects can be public S3 URLs. If AWS_CLOUDFRONT_URL is set, public file URLs use CloudFront. The app can also proxy files.

## Environment variables actually used
Required: MONGODB_URI, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET_NAME
Optional: AWS_S3_PUBLIC, AWS_CLOUDFRONT_URL, DEEPSEEK_API_KEY (this chatbot)
Not used by the app today: AUTH_SECRET, NEXT_PUBLIC_URL

## Tech stack (for developer questions)
Next.js (App Router) + TypeScript + Tailwind + MongoDB (database nexuses-asset) + AWS S3 + react-pdf + bcryptjs cookies for admin session (cookie name admin-session). Project users use cookie project-user-session.

## How you should answer
- For "how do I..." give numbered steps using the Admin UI.
- For "what is..." explain the actual feature.
- For counts/names, quote the live snapshot.
- If the question is unrelated to this product, give a short answer only if it is harmless, then offer to help with Nexuses Admin, Smart Links, projects, analytics, or leads.
`;

export const PORTAL_CHAT_SYSTEM_PROMPT = `You are the in-app assistant for a Project Admin in the Nexuses Portal (Smart Links workspace).

Answer only using this product's real behavior. Be concise, accurate, and practical. If you are unsure, say so instead of guessing. Prefer step-by-step instructions with the exact Portal menu names and URLs below. When the user asks about current counts, names, views, or leads, use the LIVE WORKSPACE SNAPSHOT provided with the request. Only talk about THIS project — never other projects or Master Admin data.

Do not invent features, settings, or pages that are not listed here. Do not reveal API keys, MongoDB URIs, AWS secrets, or other credentials. Portal users cannot manage other projects or create project users. Portal Analytics only shows data for this project’s Smart Links — not Master Admin global analytics.

## What this product is
Nexuses lets a project share sales/content packs as Smart Links. A Smart Link is a public page with a name/email gate, then a viewer for PDFs, PowerPoint, Word, video, images, websites, and HTML.

## This workspace (Project Portal)
- Login: /login (username + password)
- After login: /portal
- Sidebar: Dashboard, Smart Links, Analytics, Leads
- Logout is at the bottom of the dark left sidebar
- The logged-in user only sees Smart Links, analytics, and leads for their assigned project

## Portal pages
- Dashboard (/portal): cards for Smart Links, Published, Drafts, Leads, Documents, Total Views. Button: Create Smart Link. Recent Smart Links table with title, status, views.
- Smart Links (/portal/smart-links): list this project's links; open, edit, duplicate, delete, copy public URL.
- New Smart Link: /portal/smart-links/new (project is assigned automatically; there is no project picker)
- Edit Smart Link: /portal/smart-links/[id]/edit
- Analytics (/portal/analytics): same tabs as Master Admin (Overview, Countries, Sessions, Content), but only for this project's Smart Links. Shows sessions, page views, leads, countries, smart link opens, downloads, total time, average session time.
- Leads (/portal/leads): form submissions (date, name, email, Smart Link title) from this project's links

## How to create a Smart Link (Portal)
1. Dashboard → Create Smart Link, or Smart Links → create/new.
2. Enter Title (slug auto-fills from title on create).
3. Optional: description, cover image, company logo.
4. Set status Draft or Published.
5. Add content: Add PDF, Add PPT, Add Video, Add Image, Add Website URL, HTML, DOC, UTM, Lead Form.
6. Upload a file or paste a URL. HTML can be pasted markup or a file/URL.
7. Save.

Public URL format: {origin}/s/{slug}
Copying the link from the Smart Links list copies that URL.

Draft vs Published: status is a workflow flag. The public page loads by slug; if someone has the URL they can still open it. Use Published when the link is ready to share.

## Public Smart Link visitor flow
1. Visitor opens /s/{slug}
2. They enter Name and Email and agree → a lead is created and a unique view is counted per email
3. The viewer opens with a sidebar of content items
4. Videos autoplay and loop; PDF uses the in-app viewer; PPT/DOC use Microsoft Office embed; zoom is available in the toolbar

## How you should answer
- For "how do I..." give numbered steps using the Portal UI (not Master Admin paths).
- For counts/names, quote the live snapshot for this project.
- If asked about other projects, Master Admin, or creating portal users, say that is only available to Master Admin at /admin.
- If the question is unrelated, give a short harmless answer then offer to help with this project's Smart Links, analytics, or leads.
`;

function summarizeContent(content: Array<{ type?: string }> | undefined) {
  if (!content?.length) return 'no content';
  const counts: Record<string, number> = {};
  for (const item of content) {
    const type = item.type || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');
}

export function chatSystemPrompt(actor: SmartLinkActor): string {
  if (actor.role === 'project') {
    return `${PORTAL_CHAT_SYSTEM_PROMPT}\nCurrent portal user: ${actor.owner}. Current project: ${actor.projectName} (slug=${actor.projectSlug}, id=${actor.projectId}).`;
  }
  return ADMIN_CHAT_SYSTEM_PROMPT;
}

export async function buildChatSnapshot(actor: SmartLinkActor): Promise<string> {
  if (actor.role === 'project') return buildPortalChatSnapshot(actor);
  return buildAdminChatSnapshot();
}

async function buildPortalChatSnapshot(actor: Extract<SmartLinkActor, { role: 'project' }>): Promise<string> {
  try {
    const [stats, links, submissions] = await Promise.all([
      getProjectAdminStats(actor.projectId),
      getSmartLinks(actor.projectId),
      getFormSubmissions(),
    ]);

    const linkIds = new Set(links.map((link) => link._id).filter(Boolean) as string[]);
    const slugs = new Set(links.map((link) => link.slug).filter(Boolean));
    const analytics = await getAnalyticsSummary({
      smartLinkIds: linkIds,
      smartLinkSlugs: slugs,
    });
    const linkLines = links.slice(0, 40).map((link) => {
      const types = summarizeContent(link.content);
      return `- ${link.title} | slug=${link.slug} | status=${link.status} | views=${link.views ?? 0} | content=${types}`;
    });

    const leadLines = submissions
      .filter(
        (lead) =>
          (lead.smartLinkId && linkIds.has(lead.smartLinkId)) ||
          (lead.smartLinkSlug && slugs.has(lead.smartLinkSlug))
      )
      .slice(0, 25)
      .map((lead) => {
        const when = lead.createdAt ? new Date(lead.createdAt).toISOString() : 'unknown-date';
        return `- ${lead.name || 'unnamed'} <${lead.email || 'no-email'}> | link=${lead.smartLinkTitle || lead.smartLinkSlug || 'unknown'} | ${when}`;
      });

    const countryLines = (analytics.viewsByCountry || []).slice(0, 8).map(
      (row) => `- ${row.country}${row.countryCode ? ` (${row.countryCode})` : ''}: ${row.sessions} sessions, ${row.pageViews} views`
    );

    return [
      `LIVE PROJECT SNAPSHOT for ${actor.projectName} (source of truth for this portal user):`,
      `Totals: smartLinks=${stats.totalSmartLinks}, published=${stats.publishedLinks}, drafts=${stats.draftLinks}, documents=${stats.totalDocuments}, uniqueViews=${stats.totalViews}, leads=${stats.leads}, projectUsers=${stats.users}`,
      `Analytics (this project only): sessions=${analytics.totalSessions}, pageViews=${analytics.totalPageViews}, downloads=${analytics.totalDownloads}, countries=${analytics.uniqueCountries}, smartLinkOpens=${analytics.totalSmartLinkViews}, totalTimeSpentSec=${Math.round(analytics.totalTimeSpent)}, avgSessionSec=${Math.round(analytics.averageSessionTime)}`,
      'Smart Links:',
      linkLines.length ? linkLines.join('\n') : '- none',
      'Top countries:',
      countryLines.length ? countryLines.join('\n') : '- none / unknown',
      'Recent leads:',
      leadLines.length ? leadLines.join('\n') : '- none',
    ].join('\n');
  } catch (error) {
    console.error('Failed to build portal chat snapshot:', error);
    return 'LIVE PROJECT SNAPSHOT unavailable. Answer from product knowledge only and say current counts cannot be loaded.';
  }
}

export async function buildAdminChatSnapshot(): Promise<string> {
  try {
    const [stats, links, projects, analytics] = await Promise.all([
      getSmartLinkStats(),
      getSmartLinks(),
      getProjects(),
      getAnalyticsSummary(),
    ]);

    const linkLines = links.slice(0, 40).map((link) => {
      const types = summarizeContent(link.content);
      return `- ${link.title} | slug=${link.slug} | status=${link.status} | project=${link.projectName || 'unassigned'} | views=${link.views ?? 0} | content=${types}`;
    });

    const projectLines = projects.map(
      (project) => `- ${project.name} | slug=${project.slug} | users=${project.userCount}`
    );

    const countryLines = (analytics.viewsByCountry || []).slice(0, 10).map(
      (row) => `- ${row.country}${row.countryCode ? ` (${row.countryCode})` : ''}: ${row.sessions} sessions, ${row.pageViews} views, ${Math.round(row.totalTimeSpent)}s total time`
    );

    return [
      'LIVE WORKSPACE SNAPSHOT (current MongoDB data; treat as source of truth for numbers and names):',
      `Totals: projects=${stats.totalProjects}, projectUsers=${stats.totalUsers}, smartLinks=${stats.totalSmartLinks}, published=${stats.publishedLinks}, drafts=${stats.draftLinks}, unassigned=${stats.unassignedLinks}, documents=${stats.totalDocuments}, uniqueViews=${stats.totalViews}, leads=${stats.leads}`,
      `Analytics: sessions=${analytics.totalSessions}, pageViews=${analytics.totalPageViews}, downloads=${analytics.totalDownloads}, countries=${analytics.uniqueCountries}, smartLinkOpens=${analytics.totalSmartLinkViews}, totalTimeSpentSec=${Math.round(analytics.totalTimeSpent)}, avgSessionSec=${Math.round(analytics.averageSessionTime)}`,
      'Projects:',
      projectLines.length ? projectLines.join('\n') : '- none',
      'Smart Links:',
      linkLines.length ? linkLines.join('\n') : '- none',
      'Top countries:',
      countryLines.length ? countryLines.join('\n') : '- none / unknown',
    ].join('\n');
  } catch (error) {
    console.error('Failed to build admin chat snapshot:', error);
    return 'LIVE WORKSPACE SNAPSHOT unavailable. Answer from product knowledge only and say current counts cannot be loaded.';
  }
}
