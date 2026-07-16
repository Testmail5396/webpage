/* GET  /.netlify/functions/photos-settings         → public read
   PUT  /.netlify/functions/photos-settings {patch}  → admin only     */
const { admin, anon, requireAdmin, resp } = require('./_lib');

function toClient(r) {
  return {
    title: r.title, description: r.description,
    ownerName: r.owner_name, bio: r.bio, profilePhotoUrl: r.profile_photo_url,
    contactEmail: r.contact_email, socialLinks: r.social_links || [], categories: r.categories || [],
    copyrightText: r.copyright_text,
    defaultGridGap: r.default_grid_gap, defaultBorderRadius: r.default_border_radius,
    updatedAt: r.updated_at
  };
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'GET') {
    const { data, error } = await anon()
      .from('photography_settings').select('*').eq('id', 1).single();
    if (error) return resp(500, { error: error.message });
    return resp(200, toClient(data));
  }

  if (event.httpMethod === 'PUT') {
    const denied = await requireAdmin(event);
    if (denied) return denied;
    const p = JSON.parse(event.body || '{}');
    const row = {};
    if (p.title !== undefined) row.title = p.title;
    if (p.description !== undefined) row.description = p.description;
    if (p.ownerName !== undefined) row.owner_name = p.ownerName;
    if (p.bio !== undefined) row.bio = p.bio;
    if (p.profilePhotoUrl !== undefined) row.profile_photo_url = p.profilePhotoUrl;
    if (p.contactEmail !== undefined) row.contact_email = p.contactEmail;
    if (p.socialLinks !== undefined) row.social_links = p.socialLinks;
    if (p.categories !== undefined) row.categories = p.categories;
    if (p.copyrightText !== undefined) row.copyright_text = p.copyrightText;
    if (p.defaultGridGap !== undefined) row.default_grid_gap = p.defaultGridGap;
    if (p.defaultBorderRadius !== undefined) row.default_border_radius = p.defaultBorderRadius;
    const { data, error } = await admin()
      .from('photography_settings').update(row).eq('id', 1).select().single();
    if (error) return resp(500, { error: error.message });
    return resp(200, toClient(data));
  }

  return resp(405, { error: 'Method not allowed' });
};
