import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ZOHO_OAUTH, getRedirectUri } from "../config/zoho";
import { generateCodeVerifier, generateCodeChallenge, generateState } from "../utils/pkce";

export function Signup() {
  const { findInvite, loginWithZoho, zohoSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const inviteToken = searchParams.get("invite") || "";
  const inviteEmail = searchParams.get("email") || "";
  const pendingInvite = useMemo(
    () => (inviteToken ? findInvite(inviteToken) : null),
    [inviteToken, findInvite]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If no invite context, go to login
  useEffect(() => {
    if (!inviteToken && !inviteEmail) {
      navigate("/login", { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAcceptWithZoho() {
    setError("");
    setLoading(true);

    if (inviteToken) sessionStorage.setItem("oauth_invite_token", inviteToken);

    if (ZOHO_OAUTH.isConfigured) {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      const state = generateState();

      sessionStorage.setItem("oauth_code_verifier", verifier);
      sessionStorage.setItem("oauth_state", state);

      const params = new URLSearchParams({
        client_id: ZOHO_OAUTH.clientId,
        response_type: "code",
        scope: ZOHO_OAUTH.scopes,
        redirect_uri: getRedirectUri(),
        code_challenge: challenge,
        code_challenge_method: "S256",
        state,
        ...(inviteEmail ? { login_hint: inviteEmail } : {}),
      });

      window.location.href = `${ZOHO_OAUTH.authEndpoint}?${params.toString()}`;
    } else {
      // Demo mode
      const demoProfile = zohoSession || { email: inviteEmail || "vikash.m@zohocorp.com", name: "Vikash M" };
      setTimeout(async () => {
        const result = await loginWithZoho(demoProfile, inviteToken || undefined);
        setLoading(false);
        if (result.ok) {
          navigate("/", { replace: true });
        } else {
          setError(result.error);
        }
      }, 550);
    }
  }

  const displayEmail = inviteEmail || pendingInvite?.email || "";

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#1D1D1F] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-[22px] font-bold text-[#1D1D1F] tracking-tight">You're invited!</h1>
          <p className="text-[14px] text-[#86868B] mt-1">Join your team on Designfolio</p>
        </div>

        {/* Invite badge */}
        {displayEmail && (
          <div className="bg-[#007AFF]/[0.06] border border-[#007AFF]/20 rounded-xl px-4 py-3 mb-4 text-center">
            <p className="text-[12px] text-[#007AFF] font-medium">
              Invited as <span className="font-semibold">{displayEmail}</span>
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              <p className="text-[12px] text-red-600 font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleAcceptWithZoho}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-[13.5px] font-semibold transition-all border ${
              loading
                ? "bg-[#F5F5F7] border-[#E5E5EA] text-[#AEAEB2] cursor-not-allowed"
                : "bg-white border-[#D1D1D6] text-[#1D1D1F] hover:bg-[#F5F5F7] hover:border-[#C7C7CC] shadow-sm active:scale-[0.98]"
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#AEAEB2]/30 border-t-[#AEAEB2] rounded-full animate-spin" />
                <span>Redirecting to Zoho...</span>
              </>
            ) : (
              <>
                <div className="w-5 h-5 bg-[#E8384F] rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-extrabold leading-none" style={{ fontSize: 9 }}>Z</span>
                </div>
                Accept Invitation with Zoho
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-[12px] text-[#86868B] mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-[#007AFF] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
