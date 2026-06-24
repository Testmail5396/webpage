import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ZOHO_OAUTH, getRedirectUri } from "../config/zoho";

export function OAuthCallback() {
  const { loginWithZoho } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    handleCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    const returnedState = params.get("state");

    // Silent auth failed — mark attempted, return to login
    if (error === "login_required" || error === "access_denied") {
      sessionStorage.setItem("sso_attempted", "true");
      navigate("/login", { replace: true });
      return;
    }

    if (error) {
      setStatus("error");
      setErrorMsg(`Zoho sign-in error: ${error}`);
      return;
    }

    if (!code) {
      navigate("/login", { replace: true });
      return;
    }

    // CSRF state check
    const savedState = sessionStorage.getItem("oauth_state");
    if (!savedState || returnedState !== savedState) {
      setStatus("error");
      setErrorMsg("Invalid state parameter. Please try signing in again.");
      return;
    }

    const codeVerifier = sessionStorage.getItem("oauth_code_verifier");
    if (!codeVerifier) {
      setStatus("error");
      setErrorMsg("Session expired. Please try signing in again.");
      return;
    }

    try {
      // Exchange code for access token (PKCE — no client secret needed)
      const tokenRes = await fetch(ZOHO_OAUTH.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: ZOHO_OAUTH.clientId,
          redirect_uri: getRedirectUri(),
          code,
          code_verifier: codeVerifier,
        }).toString(),
      });

      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => ({}));
        throw new Error(errData.error_description || "Token exchange failed");
      }

      const { access_token } = await tokenRes.json();

      // Fetch user profile from Zoho
      const userRes = await fetch(ZOHO_OAUTH.userInfoEndpoint, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (!userRes.ok) throw new Error("Failed to fetch Zoho profile");

      const profile = await userRes.json();
      const email = (profile.email || "").toLowerCase();

      if (!email.endsWith("@" + ZOHO_OAUTH.allowedDomain)) {
        setStatus("error");
        setErrorMsg(`Only @${ZOHO_OAUTH.allowedDomain} accounts are allowed`);
        return;
      }

      const inviteToken = sessionStorage.getItem("oauth_invite_token") || undefined;
      const result = await loginWithZoho({ email, name: profile.name || email }, inviteToken);

      if (result.ok) {
        sessionStorage.removeItem("oauth_code_verifier");
        sessionStorage.removeItem("oauth_state");
        sessionStorage.removeItem("sso_attempted");
        sessionStorage.removeItem("oauth_invite_token");
        navigate("/", { replace: true });
      } else {
        setStatus("error");
        setErrorMsg(result.error);
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Authentication failed. Please try again.");
    }
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
        <div className="w-full max-w-[360px] text-center">
          <div className="w-12 h-12 bg-[#1D1D1F] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm p-6">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-[15px] font-semibold text-[#1D1D1F] mb-1">Sign-in failed</h2>
            <p className="text-[13px] text-[#86868B] mb-5">{errorMsg}</p>
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="w-full py-2.5 rounded-xl bg-[#007AFF] text-white text-[13px] font-semibold hover:bg-[#0066D6] active:scale-[0.98] transition-all"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 bg-[#1D1D1F] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="w-5 h-5 border-2 border-[#C7C7CC] border-t-[#1D1D1F] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[13px] text-[#86868B]">Signing you in with Zoho...</p>
      </div>
    </div>
  );
}
