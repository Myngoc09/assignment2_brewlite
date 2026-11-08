import { setTimeout as sleep } from 'node:timers/promises';

const { RENDER_API_KEY, RENDER_API_SERVICE_ID, RENDER_WEB_SERVICE_ID, GITHUB_SHA, API, WEB } = process.env;

async function render(path, options = {}) {
  const response = await fetch(`https://api.render.com/v1${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${RENDER_API_KEY}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Render API returned HTTP ${response.status}`);
  return response.json();
}

async function deploy(serviceId, name) {
  const path = `/services/${encodeURIComponent(serviceId)}/deploys`;
  const started = await render(path, {
    method: 'POST',
    body: JSON.stringify({ commitId: GITHUB_SHA }),
  });
  if (!started.id) throw new Error(`Render did not return a deploy ID for ${name}`);
  console.log(`${name} deployment ${started.id}`);

  for (let attempt = 0; attempt < 120; attempt++) {
    const current = await render(`${path}/${encodeURIComponent(started.id)}`);
    if (current.status === 'live') {
      if (current.commit?.id !== GITHUB_SHA) throw new Error(`Unexpected live commit for ${name}`);
      return;
    }
    if (!['created', 'queued', 'build_in_progress', 'pre_deploy_in_progress', 'update_in_progress'].includes(current.status)) {
      throw new Error(`Render deployment for ${name} ended with status ${current.status}`);
    }
    await sleep(10_000);
  }
  throw new Error(`Timed out waiting for ${name}`);
}

async function smoke(origin, path) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Smoke check ${path} returned HTTP ${response.status}`);
  if (path === '/api/health' && (await response.json()).status !== 'ok') {
    throw new Error('API health did not report ok');
  }
  if (path === '/api/products') {
    const products = await response.json();
    if (!Array.isArray(products) || !products.length) throw new Error('Production menu is empty');
  }
}

try {
  const api = new URL(API);
  const web = new URL(WEB);
  if (api.protocol !== 'https:' || web.protocol !== 'https:') {
    throw new Error('Production URLs must use HTTPS');
  }
  await Promise.all([
    deploy(RENDER_API_SERVICE_ID, 'API'),
    deploy(RENDER_WEB_SERVICE_ID, 'Web'),
  ]);
  await Promise.all([smoke(api, '/api/health'), smoke(web, '/'), smoke(web, '/api/products')]);
} catch (error) {
  console.error(`::error::${error.message}. See docs/deployment.md for rollback.`);
  process.exitCode = 1;
}
