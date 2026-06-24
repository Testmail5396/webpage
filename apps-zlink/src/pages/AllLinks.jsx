import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { Copy, Search, X, Edit2, Trash2, ArrowUpRight, Link2, Share2 } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { BrandLogo, detectBrand } from "../components/ui/BrandLogo";

function getDomain(url) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}

function getGradient(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash % 360);
  return `linear-gradient(135deg, hsl(${h}, 12%, 94%) 0%, hsl(${(h + 25) % 360}, 8%, 91%) 100%)`;
}

function getDateGroup(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (dDay >= today) return "Today";
  if (dDay >= yesterday) return "Yesterday";
  if (dDay >= weekAgo) return "This Week";
  if (dDay >= thisMonthStart) return "This Month";
  return format(d, "MMMM yyyy");
}

export function AllLinks() {
  const { links, designers, folders, modules, copyLink, openModal, deleteLink, currentUser, getPersonalFolderIds } = useApp();

  // Find current user's designer ID
  const myDesigner = useMemo(
    () => designers.find(d => d.email?.toLowerCase() === currentUser?.email?.toLowerCase()),
    [designers, currentUser]
  );
  const myId = myDesigner?.id;
  const [localSearch, setLocalSearch] = useState("");
  const [filterDesigner, setFilterDesigner] = useState("");
  const [filterFolder, setFilterFolder] = useState("");
  const [filterModule, setFilterModule] = useState("");

  const folderOptions = useMemo(() => {
    const buildPath = (folderId) => {
      const parts = [];
      let cur = folders.find(f => f.id === folderId);
      while (cur) {
        parts.unshift(cur.name);
        cur = cur.parentFolderId ? folders.find(f => f.id === cur.parentFolderId) : null;
      }
      return parts.join(" / ");
    };
    const options = folders.map(f => ({
      id: f.id,
      designerId: f.designerId,
      path: buildPath(f.id),
    }));
    options.sort((a, b) => a.path.localeCompare(b.path));
    return filterDesigner ? options.filter(o => o.designerId === filterDesigner) : options;
  }, [folders, filterDesigner]);

  // Collect personal folder IDs for all OTHER designers (to hide their private content)
  const hiddenFolderIds = useMemo(() => {
    const otherDesigners = designers.filter(d => d.id !== myId);
    return otherDesigners.flatMap(d => getPersonalFolderIds(d.id));
  }, [designers, myId, getPersonalFolderIds]);

  const filtered = useMemo(() => {
    return links.filter(l => {
      // Hide links in other designers' personal folders
      if (l.designerId !== myId && l.folderId && hiddenFolderIds.includes(l.folderId)) return false;
      if (filterDesigner && l.designerId !== filterDesigner) return false;
      if (filterFolder) {
        const collectFolderIds = (folderId) => {
          const children = folders.filter(f => f.parentFolderId === folderId).map(f => f.id);
          return [folderId, ...children.flatMap(collectFolderIds)];
        };
        const matchIds = collectFolderIds(filterFolder);
        if (!matchIds.includes(l.folderId)) return false;
      }
      if (filterModule) {
        if (!(l.modules || []).includes(filterModule)) return false;
      }
      if (localSearch) {
        const q = localSearch.toLowerCase();
        return l.title.toLowerCase().includes(q) || (l.description || "").toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [links, folders, filterDesigner, filterFolder, filterModule, localSearch, myId, hiddenFolderIds]);

  /* Group filtered links by date */
  const grouped = useMemo(() => {
    const groups = new Map();
    filtered.forEach(link => {
      const group = getDateGroup(link.createdAt);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(link);
    });
    return Array.from(groups.entries());
  }, [filtered]);

  const hasFilters = filterDesigner || filterFolder || filterModule || localSearch;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filter bar */}
      <div className="border-b border-[#E5E5EA] bg-white flex-shrink-0">
        <div className="flex items-center gap-3 px-6 py-3 max-w-4xl mx-auto flex-wrap">
          <div className="mr-auto flex items-baseline gap-2">
            <h1 className="text-[15px] font-semibold text-[#1D1D1F] tracking-tight">All Links</h1>
            <span className="text-[12px] text-[#86868B]">{filtered.length} of {links.length}</span>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-[5px] border border-[#D1D1D6] rounded-md bg-[#F5F5F7] hover:bg-white focus-within:bg-white focus-within:border-[#007AFF] focus-within:ring-2 focus-within:ring-[#007AFF]/12 transition-all w-44">
            <Search className="w-3 h-3 text-[#AEAEB2] flex-shrink-0" />
            <input
              type="text"
              placeholder="Search links..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="flex-1 bg-transparent text-[12px] text-[#1D1D1F] placeholder-[#AEAEB2] outline-none"
            />
            {localSearch && (
              <button onClick={() => setLocalSearch("")} className="text-[#AEAEB2] hover:text-[#636366] transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={filterDesigner}
            onChange={(e) => { setFilterDesigner(e.target.value); setFilterFolder(""); }}
            className="text-[12px] border border-[#D1D1D6] rounded-md px-2.5 py-[5px] bg-[#F5F5F7] hover:bg-white text-[#636366] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/12 focus:border-[#007AFF] cursor-pointer transition-all font-medium"
          >
            <option value="">All Designers</option>
            {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <select
            value={filterFolder}
            onChange={(e) => setFilterFolder(e.target.value)}
            className="text-[12px] border border-[#D1D1D6] rounded-md px-2.5 py-[5px] bg-[#F5F5F7] hover:bg-white text-[#636366] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/12 focus:border-[#007AFF] cursor-pointer transition-all max-w-[180px] font-medium"
          >
            <option value="">All Folders</option>
            {folderOptions.map(fo => <option key={fo.id} value={fo.id}>{fo.path}</option>)}
          </select>

          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="text-[12px] border border-[#D1D1D6] rounded-md px-2.5 py-[5px] bg-[#F5F5F7] hover:bg-white text-[#636366] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/12 focus:border-[#007AFF] cursor-pointer transition-all max-w-[140px] font-medium"
          >
            <option value="">All Modules</option>
            {modules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {hasFilters && (
            <button onClick={() => { setFilterDesigner(""); setFilterFolder(""); setFilterModule(""); setLocalSearch(""); }}
              className="text-[11px] text-[#636366] hover:text-[#1D1D1F] font-medium px-1.5 transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Links — grouped by date */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 bg-[#F2F2F7] rounded-xl flex items-center justify-center mb-3">
              <Link2 className="w-5 h-5 text-[#C7C7CC]" />
            </div>
            <p className="text-[13px] font-medium text-[#86868B] mb-1">
              {localSearch ? `No results for "${localSearch}"` : "No links found"}
            </p>
            {!hasFilters && (
              <button onClick={() => openModal("addLink", {})} className="text-[12px] text-[#636366] hover:text-[#1D1D1F] font-medium mt-2 transition-colors">
                + Add a link
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {grouped.map(([groupLabel, groupLinks]) => (
              <div key={groupLabel}>
                {/* Date group header */}
                <div className="flex items-center gap-3 mb-2 px-1">
                  <span className="text-[12px] font-semibold text-[#1D1D1F]">{groupLabel}</span>
                  <span className="text-[11px] text-[#AEAEB2] font-medium tabular-nums">{groupLinks.length}</span>
                  <div className="flex-1 h-px bg-[#E5E5EA]" />
                </div>

                {/* Links in this group */}
                <div className="space-y-1.5">
                  {groupLinks.map(link => {
                    const designer = designers.find(d => d.id === link.designerId);
                    const folder = link.folderId ? folders.find(f => f.id === link.folderId) : null;
                    const domain = getDomain(link.url);
                    return (
                      <div key={link.id}
                        onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
                        className="group flex items-center gap-4 px-4 py-3.5 bg-white rounded-xl border border-[#E5E5EA] hover:border-[#C7C7CC] transition-all duration-150 cursor-pointer"
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${detectBrand(link.url) ? "bg-[#F8F8FA]" : ""}`}
                          style={detectBrand(link.url) ? {} : { background: getGradient(link.url) }}
                        >
                          {detectBrand(link.url)
                            ? <BrandLogo url={link.url} className="w-5 h-5" />
                            : <Link2 className="w-3.5 h-3.5 text-[#AEAEB2]/50" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-medium text-[#1D1D1F] truncate">{link.title}</p>
                            {folder && (
                              <span className="text-[10px] text-[#86868B] bg-[#F2F2F7] px-1.5 py-0.5 rounded font-medium flex-shrink-0">{folder.name}</span>
                            )}
                            {(link.modules || []).map(m => (
                              <span key={m} className="text-[10px] text-[#007AFF] bg-[#007AFF]/[0.06] px-1.5 py-0.5 rounded font-medium flex-shrink-0">{m}</span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-[#86868B]">{designer?.name}</span>
                            {domain && (
                              <>
                                <span className="text-[#C7C7CC]">·</span>
                                <span className="text-[11px] text-[#AEAEB2] truncate">{domain}</span>
                              </>
                            )}
                            <span className="text-[#C7C7CC]">·</span>
                            <span className="text-[11px] text-[#AEAEB2] tabular-nums">{format(new Date(link.createdAt), "d MMM yy")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <a href={link.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-[#AEAEB2] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-md transition-all" title="Open">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                          <button onClick={(e) => { e.stopPropagation(); copyLink(link.url); }}
                            className="p-1.5 text-[#AEAEB2] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-md transition-all" title="Copy URL">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openModal("shareLink", { link }); }}
                            className="p-1.5 text-[#AEAEB2] hover:text-[#007AFF] hover:bg-[#007AFF]/[0.06] rounded-md transition-all" title="Share">
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          {link.designerId === myId && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); openModal("editLink", { link }); }}
                                className="p-1.5 text-[#AEAEB2] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-md transition-all" title="Edit">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); deleteLink(link.id); }}
                                className="p-1.5 text-[#AEAEB2] hover:text-red-500 hover:bg-red-50 rounded-md transition-all" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
