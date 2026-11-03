import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Custom Vite middleware for Dual-Source DIBS Telemetry in Dev Mode
function dibsDevProxyPlugin() {
  let cachedSession: { token: string; cookie: string; expires: number } | null = null;

  async function getOfficialSession() {
    if (cachedSession && Date.now() < cachedSession.expires) {
      return cachedSession;
    }
    try {
      const res = await fetch('https://davaobus.davaocity.gov.ph/dibs/public/bus/map', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const cookie = res.headers.get('set-cookie') || '';
      const html = await res.text();
      const tokenMatch = html.match(/const\s+requestToken\s*=\s*["']([^"']+)["']/);
      if (tokenMatch && tokenMatch[1]) {
        cachedSession = {
          token: tokenMatch[1],
          cookie,
          expires: Date.now() + 240000 // 4 minutes
        };
        return cachedSession;
      }
    } catch (e) {
      console.warn('[DIBS Proxy] Official session fetch error:', e);
    }
    return null;
  }

  return {
    name: 'dibs-dev-proxy',
    configureServer(server: any) {
      server.middlewares.use('/api/dibs-live', async (_req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');

        let officialBuses: any[] = [];
        let source = 'none';

        // 1. Try Official Davao City Government DIBS
        try {
          const session = await getOfficialSession();
          if (session && session.token) {
            const locRes = await fetch('https://davaobus.davaocity.gov.ph/dibs/application/api/locations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Cookie': session.cookie,
                'Referer': 'https://davaobus.davaocity.gov.ph/dibs/public/bus/map',
                'X-Requested-With': 'XMLHttpRequest'
              },
              body: 'id=' + session.token
            });
            if (locRes.ok) {
              const locData: any = await locRes.json();
              if (locData && locData.success && Array.isArray(locData.data) && locData.data.length > 0) {
                officialBuses = locData.data.map((b: any) => ({
                  fleet: (b.vehicleName || b.id || 'BUS').trim(),
                  route: (b.routeId || b.route || 'DIBS').trim(),
                  code: (b.routeId || 'DIBS').trim(),
                  lat: Number(b.lat),
                  lon: Number(b.lon),
                  speed: Math.round(Number(b.speed || 0)),
                  heading: Number(b.directionAngle || 0),
                  directionAngle: Number(b.directionAngle || 0),
                  ignition: b.accState === 1,
                  energyType: b.energyType || 'Electric',
                  online: b.onlineState === 1,
                  status: Number(b.speed || 0) > 2 ? 'En Route' : 'At Stop'
                }));
                source = 'Official DIBS • davaobus.davaocity.gov.ph';
              }
            }
          }
        } catch (err) {
          console.warn('[DIBS Proxy] Official endpoint query error:', err);
        }

        // 2. Fallback to dcbus.site telemetry if official returns 0 buses
        if (officialBuses.length === 0) {
          try {
            const fbRes = await fetch('https://dcbus.site/live');
            if (fbRes.ok) {
              const fbData: any = await fbRes.json();
              if (fbData && Array.isArray(fbData.buses) && fbData.buses.length > 0) {
                officialBuses = fbData.buses.map((b: any) => ({
                  fleet: (b.fleet || b.name || 'BUS').trim(),
                  route: (b.route || b.code || 'DIBS').trim(),
                  code: (b.code || 'DIBS').trim(),
                  lat: Number(b.lat),
                  lon: Number(b.lon),
                  speed: Math.round(Number(b.speed || 0)),
                  heading: Number(b.heading || 0),
                  directionAngle: Number(b.heading || 0),
                  ignition: typeof b.ignition === 'boolean' ? b.ignition : (b.online !== false && !b.stale),
                  energyType: 'Electric',
                  online: b.online !== false,
                  status: Number(b.speed || 0) > 2 ? 'En Route' : 'At Stop'
                }));
                source = 'Live DIBS Telemetry • dcbus.site';
              }
            }
          } catch (err) {
            console.warn('[DIBS Proxy] Fallback query error:', err);
          }
        }

        res.end(JSON.stringify({
          success: true,
          source,
          count: officialBuses.length,
          timestamp: new Date().toISOString(),
          buses: officialBuses
        }));
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), dibsDevProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/dcbus-live': {
        target: 'https://dcbus.site',
        changeOrigin: true,
        rewrite: () => '/live'
      }
    }
  }
})
