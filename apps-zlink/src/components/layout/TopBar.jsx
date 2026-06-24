import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Search,
  X,
  UserPlus,
  Link2,
  Command,
  Sparkles,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { useAuth } from "../../contexts/AuthContext";

export function TopBar() {
  const { links, designers, searchQuery, setSearchQuery, openModal, currentUser } = useApp();
  const { logout } = useAuth();
  const [focused, setFocused] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const inputRef = useRef(null);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  // Find current user's designer profile (for profile image)
  const myDesigner = designers.find(
    d => d.email?.toLowerCase() === currentUser?.email?.toLowerCase()
  );

  const results =
    searchQuery.length > 1
      ? {
          links: links
            .filter(
              (l) =>
                l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (l.description || "").toLowerCase().includes(searchQuery.toLowerCase())
            )
            .slice(0, 5),
          designers: designers
            .filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .slice(0, 3),
        }
      : null;

  const hasResults = results && (results.links.length > 0 || results.designers.length > 0);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearchQuery("");
        setFocused(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setSearchQuery]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    if (profileOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  // Count shared-with-me links for badge
  const sharedWithMeCount = myDesigner
    ? links.filter(l => (l.sharedWith || []).includes(myDesigner.id) && l.designerId !== myDesigner.id).length
    : 0;

  const navLinkClass = ({ isActive }) =>
    `px-2.5 py-1.5 text-[12.5px] font-medium rounded-md whitespace-nowrap transition-all duration-150 ${
      isActive
        ? "bg-[#EBEBED] text-[#1D1D1F] font-semibold"
        : "text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-[#F2F2F5]"
    }`;

  return (
    <header className="h-[48px] border-b border-[#E8E8EC] bg-white/90 backdrop-blur-xl flex items-center px-5 gap-1 flex-shrink-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-2 mr-6 flex-shrink-0">
        <div className="w-[26px] h-[26px] bg-[#1D1D1F] rounded-[7px] flex items-center justify-center flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
          <Sparkles className="w-[13px] h-[13px] text-white" />
        </div>
        <span className="text-[13.5px] font-semibold text-[#1D1D1F] tracking-[-0.02em]">
          Designfolio
        </span>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-0.5 mr-auto">
        <NavLink to="/" end className={navLinkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/designers" className={navLinkClass}>
          Designers
        </NavLink>
        <NavLink to="/links" className={navLinkClass}>
          All Links
        </NavLink>
        <NavLink to="/shared" className={({ isActive }) =>
          `relative flex items-center gap-1.5 px-2.5 py-1.5 text-[12.5px] font-medium rounded-md whitespace-nowrap transition-all duration-150 ${
            isActive
              ? "bg-[#EBEBED] text-[#1D1D1F] font-semibold"
              : "text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-[#F2F2F5]"
          }`
        }>
          Shared
          {sharedWithMeCount > 0 && (
            <span className="min-w-[16px] h-[15px] rounded-full bg-[#007AFF] text-white text-[8.5px] font-bold flex items-center justify-center px-1">
              {sharedWithMeCount}
            </span>
          )}
        </NavLink>
      </nav>

      {/* Search */}
      <div className="relative w-40 flex-shrink-0">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-[5px] rounded-lg border text-[12px] transition-all duration-150 ${
            focused
              ? "border-[#007AFF] ring-2 ring-[#007AFF]/10 bg-white shadow-[0_0_0_3px_rgba(0,122,255,0.08)]"
              : "border-[#D1D1D6] bg-[#F2F2F5] hover:bg-white hover:border-[#C7C7CC]"
          }`}
        >
          <Search className="w-[11px] h-[11px] text-[#AEAEB2] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            className="flex-1 bg-transparent text-[#1D1D1F] placeholder-[#BABAC2] focus:outline-none text-[12px]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-[#AEAEB2] hover:text-[#636366] transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* Search dropdown */}
        {focused && searchQuery.length > 1 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-[#E5E5EA] shadow-[0_8px_24px_rgba(0,0,0,0.08)] z-50 py-1.5 overflow-hidden">
            {hasResults ? (
              <>
                {results.designers.length > 0 && (
                  <div>
                    <p className="px-3 py-1.5 section-title">Designers</p>
                    {results.designers.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          navigate("/designers");
                          setSearchQuery("");
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#F5F5F7] text-left transition-colors"
                      >
                        {d.profileImage ? (
                          <img src={d.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div
                            className={`w-5 h-5 ${d.avatarColor} rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0`}
                          >
                            {d.avatar}
                          </div>
                        )}
                        <span className="text-[12px] text-[#1D1D1F] font-medium">{d.name}</span>
                        {d.role && (
                          <span className="ml-auto text-[10px] text-[#86868B]">{d.role}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {results.links.length > 0 && (
                  <div>
                    {results.designers.length > 0 && (
                      <div className="my-1 border-t border-[#E5E5EA]" />
                    )}
                    <p className="px-3 py-1.5 section-title">Links</p>
                    {results.links.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => {
                          navigate("/links");
                          setSearchQuery("");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#F5F5F7] text-left transition-colors"
                      >
                        <Link2 className="w-3 h-3 text-[#AEAEB2] flex-shrink-0" />
                        <span className="text-[12px] text-[#636366] truncate flex-1">
                          {l.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-[12px] text-[#86868B]">No results</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
        <button onClick={() => openModal("invite")} className="btn-secondary py-[5px] text-[11px]">
          <UserPlus className="w-3 h-3" />
          <span className="hidden lg:inline">Invite</span>
        </button>
        <button onClick={() => openModal("addLink", {})} className="btn-primary py-[5px] text-[11px]">
          <Link2 className="w-3 h-3" />
          <span className="hidden lg:inline">Add Link</span>
        </button>
      </div>

      {/* Profile dropdown */}
      <div ref={profileRef} className="relative ml-1.5 flex-shrink-0">
        <button
          onClick={() => setProfileOpen(o => !o)}
          className="focus:outline-none"
        >
          {myDesigner?.profileImage ? (
            <img src={myDesigner.profileImage} alt={currentUser.name}
              className={`w-7 h-7 rounded-full object-cover ring-2 transition-all ${profileOpen ? "ring-[#007AFF]" : "ring-transparent hover:ring-[#E5E5EA]"}`} />
          ) : (
            <div
              className={`w-7 h-7 ${currentUser.avatarColor} rounded-full flex items-center justify-center text-white text-[10px] font-bold cursor-pointer ring-2 transition-all ${profileOpen ? "ring-[#007AFF]" : "ring-transparent hover:ring-[#E5E5EA]"}`}
            >
              {currentUser.avatar}
            </div>
          )}
        </button>

        {profileOpen && (
          <div className="absolute top-9 right-0 z-50 w-[220px] bg-white rounded-xl border border-[#D1D1D6] shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden">
            {/* User info */}
            <div className="px-4 py-3.5 border-b border-[#E5E5EA]">
              <div className="flex items-center gap-3">
                {myDesigner?.profileImage ? (
                  <img src={myDesigner.profileImage} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className={`w-9 h-9 ${currentUser.avatarColor} rounded-xl flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0`}>
                    {currentUser.avatar}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#1D1D1F] truncate">{currentUser.name}</p>
                  <p className="text-[11px] text-[#86868B] truncate">{currentUser.email}</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1.5">
              <button
                onClick={() => { navigate("/settings"); setProfileOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-[#636366] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-all text-left"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="font-medium flex-1">Settings</span>
                <ChevronRight className="w-3 h-3 text-[#C7C7CC]" />
              </button>
            </div>

            {/* Footer */}
            <div className="border-t border-[#E5E5EA] py-1.5">
              <button
                onClick={() => { logout(); navigate("/login"); setProfileOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-[#636366] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-all text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
