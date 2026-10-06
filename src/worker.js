// Hope Church site Worker.
// Static pages are served by Cloudflare automatically; this file only handles /api/* routes.
//
// Required secrets (set in the Cloudflare dashboard, never in this repo):
//   PCO_APP_ID  - Planning Center Personal Access Token "Application ID"
//   PCO_SECRET  - Planning Center Personal Access Token "Secret"

const PCO_EVENTS_URL =
  'https://api.planningcenteronline.com/calendar/v2/event_instances' +
  '?filter=future&include=event&order=starts_at&per_page=100';

const CACHE_SECONDS = 300; // events refresh at most every 5 minutes

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

// Planning Center descriptions can contain HTML; reduce to plain text.
function toPlainText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function getEvents(env, ctx, request) {
  if (!env.PCO_APP_ID || !env.PCO_SECRET) {
    return json({ error: 'Events are not configured yet.' }, 500);
  }

  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).origin + '/api/events');
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const auth = 'Basic ' + btoa(`${env.PCO_APP_ID}:${env.PCO_SECRET}`);
  let res;
  try {
    res = await fetch(PCO_EVENTS_URL, {
      headers: { Authorization: auth, 'User-Agent': 'HopeChurchSite (hopeinmadison.org)' },
    });
  } catch (err) {
    return json({ error: 'Could not reach Planning Center.' }, 502);
  }
  if (!res.ok) {
    return json({ error: 'Planning Center returned an error.', status: res.status }, 502);
  }

  const payload = await res.json();
  const eventsById = new Map();
  for (const item of payload.included || []) {
    if (item.type === 'Event') eventsById.set(item.id, item.attributes || {});
  }

  const events = [];
  for (const inst of payload.data || []) {
    const a = inst.attributes || {};
    const eventId = inst.relationships?.event?.data?.id;
    const ev = eventsById.get(eventId);
    // Only events marked "Visible in Church Center" are public.
    if (!ev || ev.visible_in_church_center !== true) continue;

    events.push({
      id: inst.id,
      name: ev.name || 'Event',
      summary: toPlainText(ev.summary || ev.description),
      starts_at: a.starts_at || null,
      ends_at: a.ends_at || null,
      all_day: !!a.all_day_event,
      location: a.location || '',
      recurrence: a.recurrence_description || a.recurrence || '',
      url: a.church_center_url || null,
    });
  }

  const response = json(
    { events: events.slice(0, 60), updated: new Date().toISOString() },
    200,
    { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` }
  );
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/events' && request.method === 'GET') {
      return getEvents(env, ctx, request);
    }
    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'Not found' }, 404);
    }
    // Anything else: serve the static site.
    return env.ASSETS.fetch(request);
  },
};
