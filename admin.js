// ── Planning Center OAuth 2.0 + PKCE ─────────────────────────────────────────
// Register your app at: https://api.planningcenteronline.com/oauth/applications
// Set the Redirect URI to the full URL of admin.html on your domain.

const PCO_CLIENT_ID    = '2567409a10b3f1cfe4726dc532849d5d91e3dc1566f2350bb9f0516b7ef52e88';
const PCO_REDIRECT_URI = 'https://ukuleledanny.github.io/hopechurch/admin.html';
const PCO_AUTH_URL     = 'https://api.planningcenteronline.com/oauth/authorize';
const PCO_TOKEN_URL    = 'https://api.planningcenteronline.com/oauth/token';
const PCO_API_BASE     = 'https://api.planningcenteronline.com';
const PCO_SCOPES       = 'people services giving';

// ── PKCE helpers ─────────────────────────────────────────────────────────────

function base64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateVerifier() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return base64url(arr);
}

async function generateChallenge(verifier) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(buf);
}

// ── Token storage ─────────────────────────────────────────────────────────────

const TOKEN_KEY    = 'pco_access_token';
const VERIFIER_KEY = 'pco_code_verifier';
const STATE_KEY    = 'pco_oauth_state';
const USER_KEY     = 'pco_user';

function saveToken(tokenData) { localStorage.setItem(TOKEN_KEY, JSON.stringify(tokenData)); }
function getToken()           { return JSON.parse(localStorage.getItem(TOKEN_KEY)); }
function clearSession()       {
  [TOKEN_KEY, VERIFIER_KEY, STATE_KEY, USER_KEY].forEach(k => localStorage.removeItem(k));
}

function isTokenValid() {
  const t = getToken();
  if (!t || !t.access_token) return false;
  if (t.expires_at && Date.now() > t.expires_at) return false;
  return true;
}

// ── OAuth flow ────────────────────────────────────────────────────────────────

async function startLogin() {
  const verifier  = await generateVerifier();
  const challenge = await generateChallenge(verifier);
  const state     = base64url(crypto.getRandomValues(new Uint8Array(16)));

  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             PCO_CLIENT_ID,
    redirect_uri:          PCO_REDIRECT_URI,
    scope:                 PCO_SCOPES,
    state,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${PCO_AUTH_URL}?${params}`;
}

async function handleCallback(code, returnedState) {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  const state    = sessionStorage.getItem(STATE_KEY);

  if (!verifier || returnedState !== state) throw new Error('OAuth state mismatch. Please try again.');

  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    client_id:     PCO_CLIENT_ID,
    redirect_uri:  PCO_REDIRECT_URI,
    code,
    code_verifier: verifier,
  });

  const res = await fetch(PCO_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const data = await res.json();
  data.expires_at = Date.now() + (data.expires_in ?? 7200) * 1000;
  saveToken(data);

  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
}

// ── PCO API ───────────────────────────────────────────────────────────────────

async function pcoGet(path) {
  const token = getToken();
  const res = await fetch(`${PCO_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!res.ok) throw new Error(`PCO API error ${res.status} on ${path}`);
  return res.json();
}

// ── Dashboard data ────────────────────────────────────────────────────────────

async function loadMe() {
  const { data } = await pcoGet('/people/v2/me');
  return data;
}

async function loadPeopleSummary() {
  const { meta } = await pcoGet('/people/v2/people?per_page=1');
  return meta?.total_count ?? '—';
}

async function loadServiceTypes() {
  const { data } = await pcoGet('/services/v2/service_types?per_page=10');
  return data;
}

async function loadUpcomingPlans(serviceTypeId) {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await pcoGet(
    `/services/v2/service_types/${serviceTypeId}/plans?filter=future&per_page=3`
  );
  return data;
}

async function loadRecentDonations() {
  const { meta } = await pcoGet('/giving/v2/donations?per_page=1');
  return meta?.total_count ?? '—';
}

// ── Render helpers ────────────────────────────────────────────────────────────

function el(id) { return document.getElementById(id); }
function setHTML(id, html) { const e = el(id); if (e) e.innerHTML = html; }

function avatarHTML(attrs) {
  const url = attrs?.avatar;
  const name = `${attrs?.first_name ?? ''} ${attrs?.last_name ?? ''}`.trim() || 'Staff';
  return url
    ? `<img src="${url}" alt="${name}" class="adm-avatar__img">`
    : `<span class="adm-avatar__initials">${name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}</span>`;
}

async function renderDashboard() {
  // Profile
  try {
    const me = await loadMe();
    const attrs = me.attributes;
    const name = `${attrs.first_name ?? ''} ${attrs.last_name ?? ''}`.trim() || 'Staff';
    setHTML('adm-avatar', avatarHTML(attrs));
    setHTML('adm-greeting', `Welcome back, ${attrs.first_name || 'friend'}`);
    setHTML('adm-name', name);
    setHTML('adm-email', attrs.primary_contact_data ?? attrs.demographic_avatar_url ?? '');
    localStorage.setItem(USER_KEY, JSON.stringify({ name, attrs }));
  } catch(e) {
    setHTML('adm-greeting', 'Welcome back');
  }

  // Stats
  try {
    const peopleCount = await loadPeopleSummary();
    setHTML('stat-people', peopleCount.toLocaleString());
  } catch(_) { setHTML('stat-people', '—'); }

  try {
    const donationCount = await loadRecentDonations();
    setHTML('stat-donations', donationCount.toLocaleString());
  } catch(_) { setHTML('stat-donations', '—'); }

  // Upcoming services
  try {
    const serviceTypes = await loadServiceTypes();
    if (serviceTypes.length === 0) {
      setHTML('adm-services', '<p class="adm-empty">No service types found.</p>');
      return;
    }

    const plansByType = await Promise.all(
      serviceTypes.slice(0, 3).map(async st => {
        const plans = await loadUpcomingPlans(st.id);
        return { serviceType: st, plans };
      })
    );

    const html = plansByType.map(({ serviceType, plans }) => {
      const stName = serviceType.attributes.name;
      if (!plans.length) return '';
      const planItems = plans.map(p => {
        const d = p.attributes.sort_date
          ? new Date(p.attributes.sort_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'TBD';
        const title = p.attributes.title || 'Untitled Plan';
        const pcoLink = `https://services.planningcenteronline.com/plans/${p.id}`;
        return `
          <a href="${pcoLink}" target="_blank" rel="noopener" class="adm-plan-row">
            <span class="adm-plan-row__date">${d}</span>
            <span class="adm-plan-row__title">${title}</span>
            <span class="adm-plan-row__arrow">→</span>
          </a>`;
      }).join('');
      return `<div class="adm-service-group"><h4 class="adm-service-group__name">${stName}</h4>${planItems}</div>`;
    }).filter(Boolean).join('');

    setHTML('adm-services', html || '<p class="adm-empty">No upcoming plans found.</p>');
  } catch(e) {
    setHTML('adm-services', `<p class="adm-empty">Could not load service plans.</p>`);
  }
}

// ── App init ──────────────────────────────────────────────────────────────────

async function init() {
  const params = new URLSearchParams(window.location.search);
  const code   = params.get('code');
  const state  = params.get('state');
  const error  = params.get('error');

  // Clean URL after callback
  if (code || error) {
    history.replaceState({}, '', window.location.pathname);
  }

  if (error) {
    showError(`Planning Center denied access: ${params.get('error_description') || error}`);
    showLogin();
    return;
  }

  if (code && state) {
    showLoading('Signing you in…');
    try {
      await handleCallback(code, state);
    } catch (e) {
      showError(e.message);
      showLogin();
      return;
    }
  }

  if (isTokenValid()) {
    showDashboard();
    renderDashboard();
  } else {
    clearSession();
    showLogin();
  }
}

function showLogin() {
  el('screen-login').hidden    = false;
  el('screen-loading').hidden  = true;
  el('screen-dashboard').hidden = true;
}

function showDashboard() {
  el('screen-login').hidden    = true;
  el('screen-loading').hidden  = true;
  el('screen-dashboard').hidden = false;
}

function showLoading(msg = 'Loading…') {
  el('screen-loading').hidden   = false;
  el('screen-login').hidden     = true;
  el('screen-dashboard').hidden = true;
  setHTML('loading-msg', msg);
}

function showError(msg) {
  const el = document.getElementById('login-error');
  if (el) { el.textContent = msg; el.hidden = false; }
}

// ── Wire up buttons ───────────────────────────────────────────────────────────

document.getElementById('btn-login')?.addEventListener('click', startLogin);
document.getElementById('btn-logout')?.addEventListener('click', () => {
  clearSession();
  showLogin();
});

init();
