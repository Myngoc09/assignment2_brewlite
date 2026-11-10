import { setTimeout as delay } from 'node:timers/promises';

const base = new URL(process.env.PRODUCTION_WEB_URL);
const revision = process.env.BREWLITE_REVISION;
if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
  throw new Error('PRODUCTION_WEB_URL must be an HTTPS origin');
}
if (!/^[a-f0-9]{40}$/.test(revision)) {
  throw new Error('BREWLITE_REVISION must be a full commit SHA');
}

async function request(path) {
  const response = await fetch(new URL(path, base), {
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response;
}

async function check() {
  const healthResponse = await request('/api/health');
  const health = await healthResponse.json();
  if (health.status !== 'ok' || health.revision !== revision ||
      healthResponse.headers.get('x-brewlite-revision') !== revision) {
    throw new Error('Web and API have not both reached the expected healthy revision');
  }
  const [home, products] = await Promise.all([request('/'), request('/api/products')]);
  if (!(await home.text()).includes('BrewLite')) throw new Error('Unexpected web content');
  const menu = await products.json();
  if (!Array.isArray(menu) || menu.length === 0) throw new Error('Product catalog is empty');
}

const deadline = Date.now() + 8 * 60_000;
for (;;) {
  try {
    await check();
    console.log(`BrewLite ${revision} is serving the website, API and catalog over HTTPS`);
    break;
  } catch (error) {
    if (Date.now() >= deadline) throw error;
    console.log(`Waiting for deployment: ${error.message}`);
    await delay(10_000);
  }
}
