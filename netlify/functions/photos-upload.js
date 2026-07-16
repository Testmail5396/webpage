/* POST /.netlify/functions/photos-upload   (ADMIN ONLY)
   Body: { filename, contentType, dataBase64 }
   Stores the ORIGINAL in Supabase Storage (never altered) and returns
   optimized display/thumbnail/high-res URLs via Supabase's on-the-fly
   image transformation (render/image endpoint). The original file is
   preserved untouched; cropping/focal point are display-only.

   Storage layout:  photography/originals/{photoId}.{ext}
   (Supabase serves resized/format-converted variants from the same
   object, so we don't duplicate binaries per size.)                 */
const crypto = require('crypto');
const { admin, requireAdmin, resp } = require('./_lib');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });

  const denied = await requireAdmin(event);
  if (denied) return denied;                    // <-- authorization boundary

  const { filename, contentType, dataBase64 } = JSON.parse(event.body || '{}');
  if (!dataBase64) return resp(400, { error: 'No file data' });

  const ext = (filename && filename.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const id = crypto.randomUUID();
  const path = `originals/${id}.${ext}`;
  const buffer = Buffer.from(dataBase64, 'base64');

  const db = admin();
  const { error } = await db.storage.from('photography')
    .upload(path, buffer, { contentType: contentType || 'image/jpeg', upsert: false });
  if (error) return resp(500, { error: error.message });

  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, '');
  const original = `${base}/storage/v1/object/public/photography/${path}`;
  const render = (w) => `${base}/storage/v1/render/image/public/photography/${path}?width=${w}&quality=80`;

  return resp(200, {
    imageUrl: render(1200),          // optimized display
    thumbnailUrl: render(480),
    highResolutionUrl: render(2000), // lightbox
    originalImageUrl: original,      // preserved original
    originalWidth: 0,                // (add `sharp` to compute real dims — see README)
    originalHeight: 0
  });
};
