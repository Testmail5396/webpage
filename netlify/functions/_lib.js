/* =========================================================
   Shared helpers for the photography serverless functions.
   ========================================================= */
const { createClient } = require('@supabase/supabase-js');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client();

// Service-role client — bypasses RLS. NEVER expose this key to the client.
function admin() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// Anon client — subject to RLS (public reads only).
function anon() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
}

/* THE authorization boundary (async).
   The client sends the Google Identity Services ID token as
   `Authorization: Bearer <google-id-token>`. We cryptographically
   verify the token against Google's public keys (signature +
   expiry + audience === GOOGLE_CLIENT_ID), then require the
   verified email to exactly equal the private ADMIN_EMAIL.
   Merely being signed into Google is never enough — the token
   must be issued for THIS site's client id and match the owner.
   Returns null if authorized, or an HTTP response object if not. */
async function requireAdmin(event) {
  const auth = (event && event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!token) return resp(401, { error: 'Not authenticated' });
  if (!clientId) return resp(500, { error: 'Server missing GOOGLE_CLIENT_ID' });

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: token, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload || payload.email_verified === false) return resp(401, { error: 'Email not verified' });
    if (String(payload.email || '').trim().toLowerCase() !== adminEmail) return resp(403, { error: 'Not authorized' });
    return null; // authorized
  } catch (e) {
    return resp(401, { error: 'Invalid or expired token' });
  }
}

function resp(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

// map DB row (snake_case) → client shape (camelCase)
function toClient(r) {
  return {
    id: r.id,
    imageUrl: r.image_url,
    displayImageUrl: r.display_image_url || r.image_url,
    originalImageUrl: r.original_image_url,
    thumbnailUrl: r.thumbnail_url,
    highResolutionUrl: r.high_resolution_url,
    fileName: r.file_name,
    title: r.title, caption: r.caption, altText: r.alt_text, category: r.category,
    originalWidth: r.original_width, originalHeight: r.original_height,
    gridX: r.grid_x, gridY: r.grid_y, gridWidth: r.grid_width, gridHeight: r.grid_height,
    focalPointX: r.focal_point_x, focalPointY: r.focal_point_y,
    sortOrder: r.sort_order, isPublished: r.is_published,
    createdAt: r.created_at, updatedAt: r.updated_at
  };
}

// map client shape → DB row (only defined keys)
function toRow(p) {
  const m = {
    image_url: p.imageUrl, display_image_url: p.displayImageUrl, original_image_url: p.originalImageUrl,
    thumbnail_url: p.thumbnailUrl, high_resolution_url: p.highResolutionUrl, file_name: p.fileName,
    title: p.title, caption: p.caption, alt_text: p.altText, category: p.category,
    original_width: p.originalWidth, original_height: p.originalHeight,
    grid_x: p.gridX, grid_y: p.gridY, grid_width: p.gridWidth, grid_height: p.gridHeight,
    focal_point_x: p.focalPointX, focal_point_y: p.focalPointY,
    sort_order: p.sortOrder, is_published: p.isPublished
  };
  Object.keys(m).forEach((k) => m[k] === undefined && delete m[k]);
  return m;
}

module.exports = { admin, anon, requireAdmin, resp, toClient, toRow };
