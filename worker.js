/**
 * NBA BetBuilder — Cloudflare Worker
 * Proxies ESPN NBA API to fix CORS on GitHub Pages.
 *
 * ── DEPLOY STEPS ──────────────────────────────────────────────
 * 1. Go to https://workers.cloudflare.com and sign in (free tier works)
 * 2. Click "Create a Worker"
 * 3. Paste this entire file into the editor
 * 4. Click "Save and Deploy"
 * 5. Copy your worker URL — looks like:
 *      https://nba-proxy.YOUR-NAME.workers.dev
 * 6. In index.html find this line near the top of the <script>:
 *      const WORKER_URL = 'YOUR_WORKER_URL_HERE';
 *    Replace with your actual URL, e.g.:
 *      const WORKER_URL = 'https://nba-proxy.yourname.workers.dev';
 * ──────────────────────────────────────────────────────────────
 */

const ESPN_BASE   = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const ALLOWED_ORIGIN = '*'; // Lock to your GitHub Pages URL for extra security:
                             // e.g. 'https://yourusername.github.io'

export default {
  async fetch(request) {

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    const url    = new URL(request.url);
    const path   = url.searchParams.get('path')  || 'scoreboard';
    const dates  = url.searchParams.get('dates') || '';
    const event  = url.searchParams.get('event') || '';

    // Build ESPN URL
    let espnUrl = `${ESPN_BASE}/${path}`;
    const params = [];
    if (dates) params.push(`dates=${dates}`);
    if (event) params.push(`event=${event}`);
    if (params.length) espnUrl += `?${params.join('&')}`;

    try {
      const resp = await fetch(espnUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (!resp.ok) {
        return new Response(
          JSON.stringify({ error: `ESPN returned ${resp.status}` }),
          {
            status: resp.status,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
            }
          }
        );
      }

      const data = await resp.json();

      // Live games: cache 20 seconds. Static/upcoming: 60 seconds.
      const isLive = path.includes('summary') || path.includes('scoreboard');
      const maxAge = isLive ? 20 : 60;

      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Cache-Control': `public, max-age=${maxAge}`,
        }
      });

    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch from ESPN', detail: err.message }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          }
        }
      );
    }
  }
};
