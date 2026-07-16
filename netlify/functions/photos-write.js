/* POST /.netlify/functions/photos-write   (ADMIN ONLY)
   Body: { op: 'create'|'update'|'delete'|'layout', ... }
   Every op is gated by requireAdmin BEFORE any DB access.        */
const { admin, requireAdmin, resp, toClient, toRow } = require('./_lib');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });

  const denied = await requireAdmin(event);
  if (denied) return denied;                    // <-- authorization boundary

  const body = JSON.parse(event.body || '{}');
  const db = admin();

  try {
    if (body.op === 'create') {
      const { data, error } = await db.from('photographs').insert(toRow(body.photo)).select().single();
      if (error) throw error;
      return resp(200, toClient(data));
    }

    if (body.op === 'update') {
      const { data, error } = await db.from('photographs').update(toRow(body.patch)).eq('id', body.id).select().single();
      if (error) throw error;
      return resp(200, toClient(data));
    }

    if (body.op === 'delete') {
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
