/* DELETE /.netlify/functions/cloudinary-delete   (ADMIN ONLY)
   Body: { publicId }

   Securely deletes a single Cloudinary asset. Used for the
   replace-photo flow's best-effort OLD-asset cleanup, fired only
   after the new metadata is already saved (see photography.js) —
   failure here never blocks or reverts the replace itself.

   (The main "delete a photo" flow does NOT call this over HTTP —
   photos-write.js's 'delete' op imports destroyAsset() directly so
   it can enforce storage-first-then-metadata-row ordering in one
   atomic server-side sequence. This endpoint is for the standalone
   cleanup case, matching the literal endpoint the spec asked for.) */
const { requireAdmin, resp } = require('./_lib');
const { destroyAsset } = require('./_cloudinary');

exports.handler = async (event) => {
  if (event.httpMethod !== 'DELETE') return resp(405, { error: 'Method not allowed' });

  const denied = await requireAdmin(event);
  if (denied) return denied; // <-- authorization boundary

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return resp(400, { error: 'Invalid JSON body' }); }

  const publicId = String(body.publicId || '');
  if (!publicId) return resp(204, '');

  // Defense in depth: only ever delete assets under this app's own
  // upload folder, even though this endpoint is already admin-gated —
  // guards against deleting something else if the Cloudinary account
  // is ever shared with another project.
  const expectedPrefix = `${process.env.CLOUDINARY_UPLOAD_FOLDER || 'gallery'}/`;
  if (!publicId.startsWith(expectedPrefix)) {
    return resp(400, { error: 'Refusing to delete an asset outside this app’s upload folder.' });
  }

  const ok = await destroyAsset(publicId);
  if (!ok) return resp(502, { error: 'Could not delete the Cloudinary asset. Try again.' });
  return resp(204, '');
};
