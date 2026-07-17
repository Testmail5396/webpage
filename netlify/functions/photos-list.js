/* GET /.netlify/functions/photos-list?scope=public|all
   - scope=public : anyone; returns published rows only (RLS-enforced)
   - scope=all    : admin only; returns every row incl. drafts

   Backward-compatible response shape: with no `limit` param, resolves
   to a plain ARRAY exactly as before (every existing adapter caller —
   listAll()/listPublic() — expects that and is unchanged).

   Optional pagination (opt-in, used by the "load more" scroll trigger):
   pass `?limit=N` (+ optional `&cursor=<sortOrder>`) to instead get
   `{ items, nextCursor, hasMore }`. Ordered by (sort_order, created_at)
   — sort_order is kept unique/sequential by both the create-path fix
   (photos-write.js) and the existing drag-reorder logic, so cursoring
   on sort_order alone is reliable for this app's actual usage pattern. */
const { admin, anon, requireAdmin, resp, toClient } = require('./_lib');

const DEFAULT_CAP = 500; // safety net for the non-paginated (default) path

exports.handler = async (event, context) => {
  const params = event.queryStringParameters || {};
  const scope = params.scope || 'public';
  const limit = params.limit ? Math.min(Math.max(parseInt(params.limit, 10) || 0, 1), 200) : null;
  const cursor = params.cursor != null && params.cursor !== '' ? Number(params.cursor) : null;

  let query;
  if (scope === 'all') {
    const denied = await requireAdmin(event);
    if (denied) return denied;
    query = admin().from('photographs').select('*');
  } else {
    query = anon().from('photographs').select('*').eq('is_published', true);
  }

  // Optional category filter — lets the public gallery fetch only the
  // selected category's page instead of loading everything up front.
  if (params.category && params.category !== 'All') {
    query = query.eq('category', params.category);
  }

  query = query.order('sort_order', { ascending: true }).order('created_at', { ascending: true });

  if (limit) {
    if (cursor != null && !Number.isNaN(cursor)) query = query.gt('sort_order', cursor);
    // fetch one extra row to know whether there's a next page
    query = query.limit(limit + 1);
  } else {
    query = query.limit(DEFAULT_CAP);
  }

  const { data, error } = await query;
  if (error) return resp(500, { error: error.message });

  if (!limit) {
    return resp(200, data.map(toClient)); // unchanged shape for existing callers
  }

  const hasMore = data.length > limit;
  const page = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore ? page[page.length - 1].sort_order : null;
  return resp(200, { items: page.map(toClient), nextCursor, hasMore });
};
