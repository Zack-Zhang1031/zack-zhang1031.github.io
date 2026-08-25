const UPSTREAM = 'zz1031-zack-zhangs-projects.vercel.app';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = UPSTREAM;
    url.protocol = 'https:';
    url.port = '';

    const req = new Request(url.toString(), request);
    req.headers.delete('cf-connecting-ip');
    req.headers.delete('cf-ipcountry');
    req.headers.delete('cf-ray');
    req.headers.delete('cf-visitor');
    req.headers.delete('x-forwarded-for');
    req.headers.delete('x-forwarded-proto');

    const resp = await fetch(req);
    const headers = new Headers(resp.headers);
    headers.delete('x-vercel-id');
    headers.delete('server');
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers,
    });
  },
};
