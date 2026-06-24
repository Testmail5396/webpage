import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { useAuth } from "../../contexts/AuthContext";
import { Copy, Check, Mail, Send, ExternalLink, Clock } from "lucide-react";

export function InviteModal({ onClose }) {
  const { invite, getPendingInvites, ALLOWED_DOMAIN } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { link, email }
  const [copied, setCopied] = useState(false);

  const pending = getPendingInvites();

  const handleInvite = () => {
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    const res = invite(email);
    if (res.ok) {
      setResult({ link: res.link, email: email.trim().toLowerCase() });
      setEmail("");
    } else {
      setError(res.error);
    }
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(result.link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMailto = () => {
    const subject = encodeURIComponent("Join me on Designfolio");
    const body = encodeURIComponent(
      `Hi!\n\nI'd like you to join our team on Designfolio.\n\nClick the link below to create your account:\n${result.link}\n\nSee you there!`
    );
    window.open(`mailto:${result.email}?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Invite designer"
      size="sm"
      footer={
        result ? (
          <button onClick={onClose} className="btn-primary">Done</button>
        ) : (
          <>
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleInvite} className="btn-primary">
              <Send className="w-3 h-3" /> Send Invite
            </button>
          </>
        )
      }
    >
      {result ? (
        /* ── Success state ── */
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-[13px] font-semibold text-emerald-800">
              Invite created!
            </p>
            <p className="text-[12px] text-emerald-600 mt-1">
              Share this link with <span className="font-medium">{result.email}</span>
            </p>
          </div>

          {/* Invite link */}
          <div className="bg-[#F5F5F7] rounded-lg p-3 border border-[#E5E5EA]">
            <p className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">
              Invite Link
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] text-[#636366] bg-white px-2.5 py-2 rounded border border-[#E5E5EA] truncate font-mono">
                {result.link}
              </code>
              <button
                onClick={handleCopy}
                className={`p-2 rounded-lg border transition-all flex-shrink-0 ${
                  copied
                    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                    : "border-[#D1D1D6] text-[#636366] hover:bg-[#F5F5F7]"
                }`}
                title="Copy link"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Send via email */}
          <button
            onClick={handleMailto}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#D1D1D6] text-[12px] font-semibold text-[#636366] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-all"
          >
            <Mail className="w-3.5 h-3.5" />
            Send via Zoho Mail
            <ExternalLink className="w-3 h-3 text-[#AEAEB2]" />
          </button>
        </div>
      ) : (
        /* ── Input state ── */
        <div className="space-y-4">
          <div>
            <label className="label">Email address *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#AEAEB2]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                placeholder={`colleague@${ALLOWED_DOMAIN}`}
                autoFocus
                className="input-field pl-9"
              />
            </div>
            {error && (
              <p className="text-[11px] text-red-500 mt-1.5 font-medium">{error}</p>
            )}
            <p className="text-[10px] text-[#AEAEB2] mt-1.5">
              Only <span className="font-medium">@{ALLOWED_DOMAIN}</span> emails can be invited
            </p>
          </div>

          {/* Pending invites */}
          {pending.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Pending invites
              </p>
              <div className="space-y-1">
                {pending.map(inv => (
                  <div key={inv.id} className="flex items-center gap-2 px-3 py-2 bg-[#F5F5F7] rounded-lg">
                    <Mail className="w-3 h-3 text-[#AEAEB2] flex-shrink-0" />
                    <span className="text-[12px] text-[#636366] flex-1 truncate">{inv.email}</span>
                    <span className="text-[10px] text-[#FF9500] font-medium flex-shrink-0">Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
