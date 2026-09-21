import { readFile } from 'node:fs/promises';
import { createGalleryService } from './app.mjs';
const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const aiEnabled = process.env.CURATOR_ENABLED === 'true';
let curator = null;
if (aiEnabled) {
  const { CURATOR_ENDPOINT: endpoint, CURATOR_API_KEY: key, CURATOR_MODEL: model } = process.env;
  if (!endpoint || new URL(endpoint).protocol !== 'https:' || !key || !model) throw Error('Curator requires HTTPS endpoint, dedicated key and model');
  curator = { endpoint, key, model };
}
const service = createGalleryService({
  catalogue: await json('../data/catalogue.json'), experience: await json('../data/experience.json'),
  directory: process.env.INQUIRY_DIRECTORY || '/var/lib/unconventionart/inquiries',
  origins: (process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean),
  inquiriesEnabled: process.env.INQUIRIES_ENABLED === 'true',
  privacyUrl: process.env.PRIVACY_URL || '', retentionDays: Number(process.env.RETENTION_DAYS || 90), curator,
});
await service.maintain();
const cleanup = setInterval(() => service.maintain().catch(() => console.error('Storage maintenance failed')), 3600000);
cleanup.unref();
service.server.listen(Number(process.env.PORT || 8787), process.env.HOST || '127.0.0.1', () => console.log('UnconventionArt service ready'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { clearInterval(cleanup); service.server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 15000).unref(); });
