import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, UserPlus, Link2, Command } from "lucide-react";
import { useApp } from "../../contexts/AppContext";

export function Header({ title, subtitle }) {
  const { links, designers, searchQuery, setSearchQuery, openModal } = useApp();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const results = searchQuery.length > 1
    ? {
        links: links.filter(l =>
          l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (l.description || "").toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 5),
        designers: designers.filter(d =>
          d.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 3),
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

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E8E8E5] px-6 py-4 flex items-center gap-4">
      <div className="min-w-0 flex-1">
        {title && (
          <div>
            <h1 className="text-[15px] font-semibold text-[#1A1A1A] tracking-tight">{title}</h1>
            {subtitle && <p className="text-[12px] text-[#A1A1A6] mt-0.5">{subtitle}</p>}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative w-48">
        <div className={`flex items-center gap-2 px-3 py-[7px] rounded-lg border text-[12px] transition-all duration-150 ${
          focused
            ? "border-[#A0A0A5] ring-2 ring-[#E8E8EE] bg-white"
            : "border-[#E2E2DF] bg-[#F8F7F5] hover:bg-white hover:border-[#D8D8D5]"
        }`}>
          <Search className="w-3.5 h-3.5 text-[#B8B8BC] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            className="flex-1 bg-transparent text-[#1A1A1A] placeholder-[#B8B8BC] focus:outline-none text-[12px]"
          />
          {searchQuery ? (
            <button onClick={() => setSearchQuery("")} className="text-[#B8B8BC] hover:text-[#6B6B70] transition-colors">
              <X className="w-3 h-3" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-0.5 text-[#C0C0C4] text-[10px] font-medium">
              <Command className="w-2.5 h-2.5" />K
            </div>
          )}
        </div>

        {focused && searchQuery.length > 1 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-lg border border-[#E2E2DF] shadow-lg z-50 py-1.5 overflow-hidden">
            {hasResults ? (
              <>
                {results.designers.length > 0 && (
                  <div>
                    <p className="px-3 py-1.5 section-title">Designers</p>
                    {results.designers.map(d => (
                      <button key={d.id} onClick={() => { navigate("/designers"); setSearchQuery(""); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#F5F4F1] text-left transition-colors">
                        <div className={`w-5 h-5 ${d.avatarColor} rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0`}>{d.avatar}</div>
                        <span className="text-[12px] text-[#1A1A1A] font-medium">{d.name}</span>
                        {d.role && <span className="ml-auto text-[10px] text-[#A1A1A6]">{d.role}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {results.links.length > 0 && (
                  <div>
                    {results.designers.length > 0 && <div className="my-1 border-t border-[#EEEEE9]" />}
                    <p className="px-3 py-1.5 section-title">Links</p>
                    {results.links.map(l => (
                      <button key={l.id} onClick={() => { navigate("/links"); setSearchQuery(""); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#F5F4F1] text-left transition-colors">
                        <Link2 className="w-3 h-3 text-[#B8B8BC] flex-shrink-0" />
                        <span className="text-[12px] text-[#6B6B70] truncate flex-1">{l.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-[12px] text-[#A1A1A6]">No results</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => openModal("addDesigner")} className="btn-secondary">
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Designer</span>
        </button>
        <button onClick={() => openModal("addLink", {})} className="btn-primary">
          <Link2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Link</span>
        </button>
      </div>
    </header>
  );
}
