/* GET /.netlify/functions/photos-list?scope=public|all
   - scope=public : anyone; returns published rows only (RLS-enforced)
   - scope=all    : admin only; returns every row incl. drafts        */
const { admin, anon, requireAdmin, resp, toClient } = require('./_lib');

exports.handler = async (event, context) => {
  const scope = (event.queryStringParameters && event.queryStringParameters.scope) || 'public';

  if (scope === 'all') {
    const denied = await requireAdmin(event);
    if (denied) return denied;
    const { data, error } = await admin()
      .from('photographs').select('*').order('sort_order', { ascending: true });
    if (error) return resp(500, { error: error.message });
    return resp(200, data.map(toClient));
  }

  // public: rely on RLS (published only)
  const { data, error } = await anon()
    .from('photographs').select('*')
    .eq('is_published', true).order('sort_order', { ascending: true });
  if (error) return resp(500, { error: error.message });
  return resp(200, data.map(toClient));
};
