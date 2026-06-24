import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { Copy, Edit2, ArrowUpRight, Link2, Share2, Send, Inbox } from "lucide-react";
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

export function SharedLinks() {
  const { links, designers, folders, currentUser, copyLink, openModal, deleteLink } = useApp();
  const [tab, setTab] = useState("withMe"); // "withMe" | "byMe"

  // Find the current user's designer profile
  const myDesigner = useMemo(
    () => designers.find(d => d.email?.toLowerCase() === currentUser?.email?.toLowerCase()),
    [designers, currentUser]
  );
  const myId = myDesigner?.id;

  // Shared with me: links where I'm in sharedWith (and I'm not the owner)
  const sharedWithMe = useMemo(() => {
    if (!myId) return [];
    return links
      .filter(l => (l.sharedWith || []).includes(myId) && l.designerId !== myId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [links, myId]);

  // Shared by me: links I own that have sharedWith entries
  const sharedByMe = useMemo(() => {
    if (!myId) return [];
    return links
      .filter(l => l.designerId === myId && (l.sharedWith || []).length > 0)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [links, myId]);

  // Group "with me" by who shared
  const withMeGrouped = useMemo(() => {
    const groups = new Map();
    sharedWithMe.forEach(link => {
      const d = designers.find(x => x.id === link.designerId);
      const key = d?.id || "unknown";
      if (!groups.has(key)) groups.set(key, { designer: d, links: [] });
      groups.get(key).links.push(link);
    });
    return Array.from(groups.values());
  }, [sharedWithMe, designers]);

  const activeList = tab === "withMe" ? sharedWithMe : sharedByMe;
  const counts = { withMe: sharedWithMe.length, byMe: sharedByMe.length };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#E5E5EA] bg-white flex-shrink-0">
        <div className="flex items-center gap-4 px-6 py-3 max-w-4xl mx-auto">
          <div className="mr-auto flex items-center gap-2.5">
            <Share2 className="w-4 h-4 text-[#636366]" />
            <h1 className="text-[15px] font-semibold text-[#1D1D1F] tracking-tight">Shared</h1>
          </div>

          {/* Tabs */}
          <div className="flex items-center bg-[#F5F5F7] rounded-lg p-0.5">
            <button
              onClick={() => setTab("withMe")}
              className={`flex items-center gap-1.5 px-3 py-[5px] rounded-md text-[12px] font-medium transition-all duration-150 ${
                tab === "withMe"
                  ? "bg-white text-[#1D1D1F] shadow-sm"
                  : "text-[#636366] hover:text-[#1D1D1F]"
              }`}
            >
              <Inbox className="w-3 h-3" />
              Shared with me
              {counts.withMe > 0 && (
                <span className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full ${
                  tab === "withMe" ? "bg-[#007AFF]/10 text-[#007AFF]" : "bg-[#E5E5EA] text-[#86868B]"
                }`}>
                  {counts.withMe}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("byMe")}
              className={`flex items-center gap-1.5 px-3 py-[5px] rounded-md text-[12px] font-medium transition-all duration-150 ${
                tab === "byMe"
                  ? "bg-white text-[#1D1D1F] shadow-sm"
                  : "text-[#636366] hover:text-[#1D1D1F]"
              }`}
            >
              <Send className="w-3 h-3" />
              Shared by me
              {counts.byMe > 0 && (
                <span className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full ${
                  tab === "byMe" ? "bg-[#007AFF]/10 text-[#007AFF]" : "bg-[#E5E5EA] text-[#86868B]"
                }`}>
                  {counts.byMe}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 bg-[#F2F2F7] rounded-xl flex items-center justify-center mb-3">
              {tab === "withMe"
                ? <Inbox className="w-5 h-5 text-[#C7C7CC]" />
                : <Send className="w-5 h-5 text-[#C7C7CC]" />}
            </div>
            <p className="text-[13px] font-medium text-[#86868B] mb-1">
              {tab === "withMe" ? "No links shared with you yet" : "You haven't shared any links yet"}
            </p>
            <p className="text-[12px] text-[#AEAEB2] max-w-[260px] leading-relaxed">
              {tab === "withMe"
                ? "When others share links with you, they'll appear here"
                : "Share a link by selecting designers in the Share with option when adding a link"}
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {tab === "withMe" ? (
              /* ── Grouped by sender ── */
              withMeGrouped.map(({ designer: fromD, links: groupLinks }) => (
                <div key={fromD?.id || "unknown"}>
                  {/* Group header */}
                  <div className="flex items-center gap-2.5 mb-2.5 px-1">
                    {fromD && (
                      <>
                        {fromD.profileImage ? (
                          <img src={fromD.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className={`w-5 h-5 ${fromD.avatarColor} rounded-full flex items-center justify-center text-white text-[7px] font-bold`}>
                            {fromD.avatar}
                          </div>
                        )}
                        <span className="text-[12px] font-semibold text-[#1D1D1F]">
                          From {fromD.name}
                        </span>
                      </>
                    )}
                    <span className="text-[11px] text-[#AEAEB2] font-medium tabular-nums">{groupLinks.length}</span>
                    <div className="flex-1 h-px bg-[#E5E5EA]" />
                  </div>

                  <div className="space-y-1.5">
                    {groupLinks.map(link => (
                      <LinkCard key={link.id} link={link} designers={designers} folders={folders}
                        copyLink={copyLink} openModal={openModal} deleteLink={deleteLink}
                        showSharedBy={false} showSharedWith={false} isOwn={link.designerId === myId} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              /* ── Flat list for shared by me ── */
              <div className="space-y-1.5">
                {sharedByMe.map(link => (
                  <LinkCard key={link.id} link={link} designers={designers} folders={folders}
                    copyLink={copyLink} openModal={openModal} deleteLink={deleteLink}
                    showSharedBy={false} showSharedWith={true} isOwn={true} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Shared Link Card ── */

function LinkCard({ link, designers, folders, copyLink, openModal, deleteLink, showSharedWith, isOwn }) {
  const designer = designers.find(d => d.id === link.designerId);
  const folder = link.folderId ? folders.find(f => f.id === link.folderId) : null;
  const domain = getDomain(link.url);
  const sharedDesigners = (link.sharedWith || []).map(id => designers.find(d => d.id === id)).filter(Boolean);

  return (
    <div
      onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
      className="group flex items-center gap-4 px-4 py-3.5 bg-white rounded-xl border border-[#E5E5EA] hover:border-[#C7C7CC] transition-all duration-150 cursor-pointer"
    >
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${detectBrand(link.url) ? "bg-[#F8F8FA]" : ""}`}
        style={detectBrand(link.url) ? {} : { background: getGradient(link.url) }}
      >
        {detectBrand(link.url)
          ? <BrandLogo url={link.url} className="w-5 h-5" />
          : <Link2 className="w-3.5 h-3.5 text-[#AEAEB2]/50" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-[#1D1D1F] truncate">{link.title}</p>
          {folder && (
            <span className="text-[10px] text-[#86868B] bg-[#F2F2F7] px-1.5 py-0.5 rounded font-medium flex-shrink-0">{folder.name}</span>
          )}
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

        {/* Shared with avatars */}
        {showSharedWith && sharedDesigners.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[10px] text-[#AEAEB2]">Shared with</span>
            <div className="flex items-center -space-x-1">
              {sharedDesigners.map(d => (
                d.profileImage ? (
                  <img key={d.id} src={d.profileImage} alt={d.name} title={d.name}
                    className="w-4 h-4 rounded-full object-cover ring-1 ring-white" />
                ) : (
                  <div key={d.id} title={d.name}
                    className={`w-4 h-4 ${d.avatarColor} rounded-full flex items-center justify-center text-white text-[6px] font-bold ring-1 ring-white`}>
                    {d.avatar}
                  </div>
                )
              ))}
            </div>
            <span className="text-[10px] text-[#86868B] font-medium">
              {sharedDesigners.map(d => d.name.split(" ")[0]).join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
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
        {isOwn && (
          <button onClick={(e) => { e.stopPropagation(); openModal("editLink", { link }); }}
            className="p-1.5 text-[#AEAEB2] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-md transition-all" title="Edit">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
