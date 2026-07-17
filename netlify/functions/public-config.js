/* GET /.netlify/functions/public-config   (PUBLIC — no auth required)

   Returns the small set of values the frontend needs that are safe to
   expose to every visitor (owner email for client-side UI gating,
   Google OAuth client id, Cloudinary cloud name) but must NOT be
   committed as literal strings in the repo — Netlify's secret scanner
   fails the build if a configured environment variable's value
   appears in any deployed file, even ones that are otherwise fine to
   expose. Fetched once at page load by photography/config.js.

   Deliberately excludes anything actually sensitive: no API secrets,
   no service-role key, no upload folder (that one has no reason to be
   public — it's only used server-side to build object paths). */
const { resp } = require('./_lib');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return resp(405, { error: 'Method not allowed' });

  return resp(200, {
    adminEmail: process.env.ADMIN_EMAIL || '',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || ''
  });
};
