/* POST /.netlify/functions/photos-write   (ADMIN ONLY)
   Body: { op: 'create'|'update'|'delete'|'layout', ... }
   Every op is gated by requireAdmin BEFORE any DB access.        */
const { admin, requireAdmin, resp, toClient, toRow } = require('./_lib');
const { destroyAsset } = require('./_cloudinary');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });

  const denied = await requireAdmin(event);
  if (denied) return denied;                    // <-- authorization boundary

  const body = JSON.parse(event.body || '{}');
  const db = admin();

  try {
    if (body.op === 'create') {
      const row = toRow(body.photo);
      // Uploads never set sortOrder client-side — assign the next slot
      // server-side so cards don't collide at the schema's default (0),
      // which would otherwise make ordering/pagination unreliable.
      if (row.sort_order == null) {
        const { data: maxRow } = await db.from('photographs')
          .select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
        row.sort_order = ((maxRow && maxRow.sort_order) || 0) + 1;
      }
      const { data, error } = await db.from('photographs').insert(row).select().single();
      if (error) throw error;
      return resp(200, toClient(data));
    }

    if (body.op === 'update') {
      const { data, error } = await db.from('photographs').update(toRow(body.patch)).eq('id', body.id).select().single();
      if (error) throw error;
      return resp(200, toClient(data));
    }

    if (body.op === 'delete') {
      // Storage-first: delete the Cloudinary asset, THEN the metadata
      // row — only if storage cleanup succeeds. On failure, the row is
      // left in place and an error returned so the admin can retry,
      // rather than ever leaving an orphaned file with no metadata
      // reference at all.
      const { data: row, error: fetchErr } = await db.from('photographs')
        .select('cloudinary_public_id').eq('id', body.id).maybeSingle();
      if (fetchErr) throw fetchErr;

      if (row && row.cloudinary_public_id) {
        const ok = await destroyAsset(row.cloudinary_public_id);
        if (!ok) {
          return resp(502, { error: 'Could not delete the stored image — nothing was removed. Try again.' });
        }
      }

      const { error } = await db.from('photographs').delete().eq('id', body.id);
      if (error) throw error;
      return resp(204, '');
    }

    if (body.op === 'layout') {
      // bulk position/size/order update
      const updates = (body.items || []).map((it) =>
        db.from('photographs').update({
          grid_x: it.gridX, grid_y: it.gridY,
          grid_width: it.gridWidth, grid_height: it.gridHeight,
          sort_order: it.sortOrder
        }).eq('id', it.id)
      );
      const results = await Promise.all(updates);
      const bad = results.find((r) => r.error);
      if (bad) throw bad.error;
      return resp(204, '');
    }

    return resp(400, { error: 'Unknown op' });
  } catch (e) {
    return resp(500, { error: e.message || String(e) });
  }
};
