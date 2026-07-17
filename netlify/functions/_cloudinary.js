/* =========================================================
   Shared Cloudinary helpers for the photography serverless
   functions. Uses the official `cloudinary` SDK — pure JS,
   no native module, so no special Netlify bundler config is
   needed (unlike the `sharp` dependency this replaces).

   Signing note: every param below is converted to its STRING
   form before signing, and that exact string is what's handed
   back to the client to embed in the upload FormData — so the
   signature can never mismatch a JS-type coercion difference
   (e.g. boolean `false` vs the string `"false"`).
   ========================================================= */
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const ALLOWED_FORMATS = 'jpg,png,webp,avif';

// Returns everything the browser needs to POST directly to Cloudinary:
// the signed params (echoed back verbatim, as strings) plus the
// signature, api key, and cloud name. api_secret never leaves this file.
function signUploadParams({ publicId, folder }) {
  const timestamp = Math.round(Date.now() / 1000).toString();
  const paramsToSign = {
    timestamp,
    public_id: publicId,
    folder,
    overwrite: 'false',
    colors: 'true',
    allowed_formats: ALLOWED_FORMATS
  };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);
  return {
    ...paramsToSign,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME
  };
}

// Best-effort delete. Treats "already gone" as success — the caller's
// goal ("this asset must not exist") is already satisfied either way,
// and treating a not-found as a failure would block retries needlessly.
async function destroyAsset(publicId) {
  if (!publicId) return true;
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  return result && (result.result === 'ok' || result.result === 'not found');
}

module.exports = { signUploadParams, destroyAsset };
