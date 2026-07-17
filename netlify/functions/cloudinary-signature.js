/* POST /.netlify/functions/cloudinary-signature   (ADMIN ONLY)
   Body: { filename, contentType, fileSize }

   Mints a fresh Cloudinary public_id + folder, signs the upload
   params server-side (api_secret never leaves this file), and
   returns everything the browser needs to POST the file DIRECTLY
   to Cloudinary — the original bytes never route through this
   function or any other Netlify Function.

   No speculative pre-upload URL is returned here: Cloudinary's
   folder/public_id behavior differs between "dynamic folders" and
   legacy fixed-folder accounts, so the only URL the app ever trusts
   is `secure_url` from the REAL upload response (see
   CloudinaryAdapter.uploadImage in data-adapter.js). */
const crypto = require('crypto');
const { requireAdmin, resp } = require('./_lib');
const { signUploadParams } = require('./_cloudinary');

const ALLOWED_TYPES = { 'image/jpeg': 1, 'image/png': 1, 'image/webp': 1, 'image/avif': 1 };
const MAX_BYTES = 25 * 1024 * 1024;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });

  const denied = await requireAdmin(event);
  if (denied) return denied; // <-- authorization boundary

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return resp(400, { error: 'Invalid JSON body' }); }

  const contentType = String(body.contentType || '').toLowerCase();
  const fileSize = Number(body.fileSize) || 0;

  if (!ALLOWED_TYPES[contentType]) {
    return resp(400, { error: 'Unsupported file type — only JPEG, PNG, WebP, and AVIF photos are accepted.' });
  }
  if (fileSize <= 0 || fileSize > MAX_BYTES) {
    return resp(400, { error: 'File is too large (max 25MB).' });
  }

  const publicId = crypto.randomUUID();
  // Category/book aren't known yet at upload time in this app's UX (both
  // are assigned afterward in the edit dialog) — folder is UUID/year-based
  // only, never re-derived or moved later when metadata changes.
  const folder = `${process.env.CLOUDINARY_UPLOAD_FOLDER || 'gallery'}/uploads/${new Date().getFullYear()}`;

  const signed = signUploadParams({ publicId, folder });
  return resp(200, signed);
};
