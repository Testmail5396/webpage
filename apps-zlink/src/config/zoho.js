const CLIENT_ID = process.env.REACT_APP_ZOHO_CLIENT_ID || null;

export const ZOHO_OAUTH = {
  clientId: CLIENT_ID,
  authEndpoint: "https://accounts.zoho.com/oauth/v2/auth",
  tokenEndpoint: "https://accounts.zoho.com/oauth/v2/token",
  userInfoEndpoint: "https://accounts.zoho.com/oauth/v2/userinfo",
  scopes: "openid profile email",
  allowedDomain: "zohocorp.com",
  isConfigured: !!CLIENT_ID,
};

export function getRedirectUri() {
  return `${window.location.origin}/auth/callback`;
}
