import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Login() {
  const { loginOpen } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = loginOpen({ name, email });
    if (result.ok) {
      navigate("/", { replace: true });
    } else {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#1D1D1F] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-[22px] font-bold text-[#1D1D1F] tracking-tight">Welcome to Designfolio</h1>
          <p className="text-[14px] text-[#86868B] mt-1">Sign in to manage your design links</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-[12px] text-red-600 font-medium">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-[#636366] mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-[#D1D1D6] text-[13.5px] text-[#1D1D1F] placeholder-[#AEAEB2] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#636366] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 rounded-xl border border-[#D1D1D6] text-[13.5px] text-[#1D1D1F] placeholder-[#AEAEB2] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all ${
              loading
                ? "bg-[#007AFF]/60 cursor-not-allowed"
                : "bg-[#007AFF] hover:bg-[#0066D6] active:scale-[0.98]"
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-[#AEAEB2] mt-5">
          Open access — anyone can sign in and create links
        </p>
      </div>
    </div>
  );
}
