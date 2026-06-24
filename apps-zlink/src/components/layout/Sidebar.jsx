import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Link2, Settings, Sparkles, Menu, X } from "lucide-react";
import { useApp } from "../../contexts/AppContext";

const navItems = [
  { to: "/",          icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/designers", icon: Users,           label: "Designers" },
  { to: "/links",     icon: Link2,           label: "All Links" },
  { to: "/settings",  icon: Settings,        label: "Settings" },
];

function SidebarContent({ onClose }) {
  const { currentUser } = useApp();

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/[0.08] rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white/70" />
          </div>
          <span className="text-[14px] font-semibold text-white/90 tracking-tight">Designfolio</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? "bg-white/[0.08] text-white/90"
                  : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
              }`
            }
          >
            <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 pb-5">
        <div className="border-t border-white/[0.06] pt-4 mb-3 mx-2" />
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-all duration-150">
          <div className={`w-7 h-7 ${currentUser.avatarColor} rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
            {currentUser.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-white/70 truncate leading-tight">{currentUser.name}</p>
            <p className="text-[10px] text-white/30 truncate mt-0.5">{currentUser.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="hidden lg:flex flex-col w-[200px] bg-[#1B1B1E] flex-shrink-0 h-screen">
        <SidebarContent />
      </aside>

      <button
        className="lg:hidden fixed top-3 left-3 z-50 w-9 h-9 bg-[#1B1B1E] text-white rounded-lg flex items-center justify-center"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-4 h-4" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[200px] bg-[#1B1B1E] h-full">
            <button
              className="absolute top-4 right-3 w-7 h-7 text-white/40 hover:text-white/70 rounded-lg flex items-center justify-center transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
