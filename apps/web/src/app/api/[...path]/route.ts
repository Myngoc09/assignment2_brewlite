import {NextRequest} from 'next/server';
type Ctx={params:Promise<{path:string[]}>};
async function forward(req: NextRequest, ctx: Ctx) {
  const root = (process.env.API_SERVER_URL || 'http://localhost:3001').replace(/\/$/, '');
  const { path } = await ctx.params;
  const url = `${root}/api/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;
  const headers = new Headers();
  for (const key of ['authorization', 'content-type', 'idempotency-key']) {
    const value = req.headers.get(key);
    if (value) headers.set(key, value);
  }
  const method = req.method;
  const body = ['GET', 'HEAD'].includes(method) ? undefined : await req.arrayBuffer();
  const upstream = await fetch(url, { method, headers, body, cache: 'no-store' });
  const outHeaders = new Headers({ 'cache-control': 'no-store' });
  const type = upstream.headers.get('content-type');
  if (type) outHeaders.set('content-type', type);
  if (process.env.BREWLITE_REVISION) {
    outHeaders.set('x-brewlite-revision', process.env.BREWLITE_REVISION);
  }
  return new Response(method === 'HEAD' ? null : await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: outHeaders,
  });
}
export const GET=forward;export const POST=forward;export const PATCH=forward;export const dynamic='force-dynamic';
