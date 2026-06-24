import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Users, Folder, Link2, ArrowRight, Plus, ArrowUpRight, Tag } from "lucide-react";
import { useApp } from "../contexts/AppContext";

function StatCard({ icon: Icon, label, value, to }) {
  const inner = (
    <div className="bg-white rounded-2xl border border-[#E8E8EC] px-4 py-4 flex items-center gap-3.5 hover:border-[#C7C7CC] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200 group">
      <div className="w-9 h-9 bg-[#F2F2F5] rounded-xl flex items-center justify-center flex-shrink-0">
        <Icon className="w-[16px] h-[16px] text-[#8E8E93]" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[20px] font-bold text-[#1D1D1F] leading-none tracking-[-0.02em] tabular-nums">{value}</div>
        <div className="text-[10.5px] text-[#8E8E93] mt-1 font-medium tracking-wide">{label}</div>
      </div>
      {to && <ArrowRight className="w-3.5 h-3.5 text-[#C7C7CC] group-hover:text-[#8E8E93] group-hover:translate-x-0.5 transition-all" />}
    </div>
  );
  return to ? <Link to={to} className="block">{inner}</Link> : inner;
}

export function Dashboard() {
  const { designers, folders, links, modules, currentUser, openModal } = useApp();

  const recentLinks = [...links]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-8 max-w-3xl w-full mx-auto">
        {/* Greeting */}
        <div>
          <h1 className="text-[18px] font-semibold text-[#1D1D1F] tracking-tight">
            {greeting}, {currentUser.name.split(" ")[0]}
          </h1>
          <p className="text-[13px] text-[#86868B] mt-0.5">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <StatCard icon={Users}  label="Designers" value={designers.length} to="/designers" />
          <StatCard icon={Folder} label="Folders"   value={folders.length}  to="/designers" />
          <StatCard icon={Link2}  label="Links"     value={links.length}    to="/links" />
          <StatCard icon={Tag}    label="Modules"   value={modules.length}  to="/links" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">Recent Links</p>
            <Link to="/links" className="text-[12px] text-[#636366] hover:text-[#1D1D1F] flex items-center gap-1 font-medium transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-[#E5E5EA] overflow-hidden">
            {recentLinks.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[13px] text-[#86868B]">No links yet</p>
                <button onClick={() => openModal("addLink", {})} className="mt-3 text-[12px] text-[#636366] hover:text-[#1D1D1F] font-medium transition-colors">
                  + Add your first link
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#F2F2F7]">
                {recentLinks.map((link) => {
                  const designer = designers.find(d => d.id === link.designerId);
                  const folder = folders.find(f => f.id === link.folderId);
                  return (
                    <div key={link.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors group">
                      <div className={`w-8 h-8 ${designer?.avatarColor || "bg-gray-300"} rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                        {designer?.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#1D1D1F] truncate">{link.title}</p>
                        <p className="text-[11px] text-[#86868B] truncate mt-0.5">
                          {designer?.name}{folder ? ` · ${folder.name}` : ""}
                        </p>
                      </div>
                      <span className="text-[11px] text-[#AEAEB2] flex-shrink-0 tabular-nums">
                        {format(new Date(link.createdAt), "d MMM")}
                      </span>
                      <a href={link.url} target="_blank" rel="noreferrer"
                        className="opacity-0 group-hover:opacity-100 text-[#AEAEB2] hover:text-[#1D1D1F] transition-all flex-shrink-0">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">Designers</p>
            <button onClick={() => openModal("addDesigner")} className="text-[12px] text-[#636366] hover:text-[#1D1D1F] font-medium flex items-center gap-1 transition-colors">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E5EA] overflow-hidden">
            <div className="divide-y divide-[#F2F2F7]">
              {designers.map(d => {
                const count = links.filter(l => l.designerId === d.id).length;
                return (
                  <Link key={d.id} to="/designers"
                    className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors group">
                    <div className={`w-9 h-9 ${d.avatarColor} rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0`}>
                      {d.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#1D1D1F]">{d.name}</p>
                      {d.role && <p className="text-[11px] text-[#86868B] mt-0.5">{d.role}</p>}
                    </div>
                    <span className="text-[11px] text-[#AEAEB2] font-medium tabular-nums">{count} link{count !== 1 ? "s" : ""}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#C7C7CC] group-hover:text-[#86868B] group-hover:translate-x-0.5 transition-all" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
