import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import {
  ChevronRight,
  Folder as FolderIcon,
  FolderOpen,
  FileText,
  Plus,
  FolderPlus,
  Edit2,
  Trash2,
  ExternalLink,
  Copy,
  Link2,
  ArrowUpRight,
  Clock,
  Users,
  Search,
  Pin,
  PinOff,
  ArrowDownAZ,
  ArrowUpDown,
  Layers,
  Check,
  FolderSymlink,
  Camera,
  Calendar,
  Share2,
  Lock,
  X,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { DropdownMenu } from "../ui/DropdownMenu";
import { BrandLogo, detectBrand } from "../ui/BrandLogo";
import { useApp, MAX_FOLDER_DEPTH } from "../../contexts/AppContext";

/* ── Helpers ────────────────────────────────────────────── */

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getDomain(url) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}

function getGradient(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash % 360);
  return `linear-gradient(135deg, hsl(${h}, 18%, 93%) 0%, hsl(${(h + 25) % 360}, 14%, 90%) 100%)`;
}

/* Collect a folder + all its descendants (to prevent circular moves) */
function getDescendantIds(folderId, allFolders) {
  const children = allFolders.filter(f => f.parentFolderId === folderId);
  return [folderId, ...children.flatMap(c => getDescendantIds(c.id, allFolders))];
}

/* Get nesting depth of a folder (1-based: top-level = 1) */
function getFolderNestingDepth(folderId, allFolders) {
  let depth = 1;
  let currentId = folderId;
  while (true) {
    const folder = allFolders.find(f => f.id === currentId);
    if (!folder || !folder.parentFolderId) break;
    depth++;
    currentId = folder.parentFolderId;
  }
  return depth;
}

/* Get max depth of subtree below a folder (0 = leaf, 1 = has children, etc.) */
function getSubtreeMaxDepth(folderId, allFolders) {
  const children = allFolders.filter(f => f.parentFolderId === folderId);
  if (children.length === 0) return 0;
  return 1 + Math.max(...children.map(c => getSubtreeMaxDepth(c.id, allFolders)));
}

/* ── macOS Folder color palette ─────────────────────────── */

const FOLDER_COLORS = [
  { key: "default", color: "#56A4D9", label: "Default" },
  { key: "red",     color: "#FF453A", label: "Red" },
  { key: "orange",  color: "#FF9F0A", label: "Orange" },
  { key: "yellow",  color: "#FFD60A", label: "Yellow" },
  { key: "green",   color: "#30D158", label: "Green" },
  { key: "blue",    color: "#0A84FF", label: "Blue" },
  { key: "purple",  color: "#BF5AF2", label: "Purple" },
  { key: "gray",    color: "#8E8E93", label: "Gray" },
];

/* ── Avatar component (supports profile image) ────────── */

function DesignerAvatar({ designer, size = "md", className = "" }) {
  const sizes = {
    xs: "w-5 h-5 text-[8px]",
    sm: "w-8 h-8 text-[10px]",
    md: "w-12 h-12 text-base",
    header: "w-5 h-5 text-[7px]",
  };
  const s = sizes[size] || sizes.md;

  if (designer.profileImage) {
    return (
      <img
        src={designer.profileImage}
        alt={designer.name}
        className={`${s.split(" ").slice(0, 2).join(" ")} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }
  return (
    <div className={`${s} ${designer.avatarColor} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}>
      {designer.avatar}
    </div>
  );
}

/* ── Link thumbnail/preview ─────────────────────────────── */

function LinkPreview({ link, size = "sm" }) {
  const domain = getDomain(link.url);
  const brand = detectBrand(link.url);

  if (size === "sm") {
    const cls = "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0";
    if (link.thumbnail) {
      return (
        <div className={`${cls} overflow-hidden bg-[#F2F2F7]`}>
          <img src={link.thumbnail} alt="" className="w-full h-full object-cover" />
        </div>
      );
    }
    if (brand) {
      return (
        <div className={`${cls} bg-[#F8F8FA]`}>
          <BrandLogo url={link.url} className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className={cls} style={{ background: getGradient(link.url) }}>
        <Link2 className="w-3 h-3 text-[#AEAEB2]" />
      </div>
    );
  }

  // Large preview
  const cls = "w-full h-32 rounded-lg flex items-center justify-center overflow-hidden";
  if (link.thumbnail) {
    return (
      <div className={`${cls} bg-[#F2F2F7]`}>
        <img src={link.thumbnail} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  if (brand) {
    return (
      <div className={`${cls} bg-[#F8F8FA]`}>
        <div className="text-center">
          <BrandLogo url={link.url} className="w-8 h-8 mx-auto" />
          <p className="text-[10px] text-[#AEAEB2] mt-2">{domain}</p>
        </div>
      </div>
    );
  }
  return (
    <div className={cls} style={{ background: getGradient(link.url) }}>
      <div className="text-center">
        <Link2 className="w-4 h-4 text-[#AEAEB2] mx-auto" />
        <p className="text-[10px] text-[#AEAEB2] mt-1.5">{domain}</p>
      </div>
    </div>
  );
}

/* ── Link list item (detail panel) ──────────────────────── */

function LinkListItem({ link, onClick }) {
  const { copyLink } = useApp();
  const domain = getDomain(link.url);

  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F5F5F7] cursor-pointer transition-all duration-150"
    >
      <LinkPreview link={link} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-[#1D1D1F] truncate leading-tight">{link.title}</p>
        <p className="text-[11px] text-[#86868B] mt-0.5 truncate">{domain}</p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <a href={link.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
          className="p-1 text-[#AEAEB2] hover:text-[#1D1D1F] rounded-md hover:bg-[#E5E5EA] transition-colors">
          <ArrowUpRight className="w-3 h-3" />
        </a>
        <button onClick={(e) => { e.stopPropagation(); copyLink(link.url); }}
          className="p-1 text-[#AEAEB2] hover:text-[#1D1D1F] rounded-md hover:bg-[#E5E5EA] transition-colors">
          <Copy className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COLUMN 1 — Designer List
   ═══════════════════════════════════════════════════════════ */

function DesignerListItem({ designer, isSelected, isPinned, isCurrentUser, sortInfo, newCount, onClick }) {
  const { openModal, deleteDesigner, toggleFavDesigner } = useApp();
  const menuItems = isCurrentUser
    ? [
        { label: isPinned ? "Unpin" : "Pin to Top", icon: isPinned ? PinOff : Pin, onClick: () => toggleFavDesigner(designer.id) },
        { label: "Edit", icon: Edit2, onClick: () => openModal("editDesigner", { designer }) },
        "divider",
        { label: "Delete", icon: Trash2, danger: true, onClick: () => deleteDesigner(designer.id) },
      ]
    : [
        { label: isPinned ? "Unpin" : "Pin to Top", icon: isPinned ? PinOff : Pin, onClick: () => toggleFavDesigner(designer.id) },
      ];

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 relative ${
        isSelected ? "bg-[#E5E5EA]" : "hover:bg-[#F5F5F7]"
      }`}
    >
      {isSelected && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-[#1D1D1F] rounded-r-full" />
      )}
      <div className="relative flex-shrink-0">
        <DesignerAvatar designer={designer} size="sm" />
        {isPinned && (
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#E5E5EA]">
            <Pin className="w-2 h-2 text-[#636366]" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium truncate leading-tight ${isSelected ? "text-[#1D1D1F]" : "text-[#3A3A3C]"}`}>
          {designer.name}
        </p>
        <p className="text-[11px] text-[#86868B] truncate mt-0.5">
          {designer.role || "Designer"}
          {isCurrentUser && <span className="text-[#007AFF] font-medium"> · You</span>}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {newCount > 0 && !isCurrentUser && (
          <span className="min-w-[18px] h-[18px] rounded-full bg-[#007AFF] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 px-1 group-hover:hidden">
            {newCount > 99 ? "99+" : newCount}
          </span>
        )}
        <span className="text-[10px] text-[#AEAEB2] font-medium tabular-nums group-hover:hidden">
          {newCount > 0 && !isCurrentUser ? "" : sortInfo}
        </span>
        <div className="hidden group-hover:block">
          <DropdownMenu items={menuItems} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COLUMN 2 — Folder / File Explorer
   ═══════════════════════════════════════════════════════════ */

/* ── Tree Link Node ────────────────────────────────────── */

function TreeLinkNode({ link, depth, isSelected, onSelect, dragItem, onDragStart, onDragEnd, isViewingOwn }) {
  const { openModal, deleteLink } = useApp();
  const menuItems = isViewingOwn
    ? [
        { label: "Edit", icon: Edit2, onClick: () => openModal("editLink", { link }) },
        { label: "Share", icon: Share2, onClick: () => openModal("shareLink", { link }) },
        { label: "Move to", icon: FolderSymlink, onClick: () => openModal("moveItem", { type: "link", id: link.id, designerId: link.designerId, currentFolderId: link.folderId }) },
        "divider",
        { label: "Delete", icon: Trash2, danger: true, onClick: () => deleteLink(link.id) },
      ]
    : [
        { label: "Share", icon: Share2, onClick: () => openModal("shareLink", { link }) },
      ];

  const isDragging = dragItem?.id === link.id;
  const canDrag = isViewingOwn;

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => {
        if (!canDrag) { e.preventDefault(); return; }
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", link.id);
        onDragStart({ type: "link", id: link.id, designerId: link.designerId, currentFolderId: link.folderId });
      }}
      onDragEnd={onDragEnd}
      style={{ paddingLeft: `${depth * 16 + 12}px` }}
      onClick={() => onSelect({ type: "link", id: link.id })}
      className={`group flex items-center gap-1.5 pr-3 py-[7px] mx-1 rounded-lg transition-all duration-150 ${
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${
        isDragging ? "opacity-30" : ""
      } ${
        isSelected ? "bg-[#E8E8EC] text-[#1D1D1F]" : "text-[#636366] hover:bg-[#EBEBED]"
      }`}
    >
      <span className="w-4 h-4 flex-shrink-0" />
      <FileText className={`w-[14px] h-[14px] flex-shrink-0 ${isSelected ? "text-[#636366]" : "text-[#C7C7CC]"}`} />
      <span className="text-[12px] flex-1 truncate">{link.title}</span>
      {(link.sharedWith || []).length > 0 && (
        <Share2 className="w-2.5 h-2.5 text-[#007AFF]/50 flex-shrink-0 mr-0.5" />
      )}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <DropdownMenu items={menuItems} />
      </div>
    </div>
  );
}

/* ── Tree Folder Node ──────────────────────────────────── */

function TreeFolderNode({
  folder, depth, expandedIds, toggleExpand, selectedItem, onSelect,
  dragItem, dropTargetId, forbiddenDropIds, onDragStart, onDragEnd, onDragOver, onDrop,
  isViewingOwn,
}) {
  const { getSubFolders, getFolderLinks, openModal, deleteFolder, updateFolder } = useApp();
  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedItem?.type === "folder" && selectedItem?.id === folder.id;
  const subFolders = getSubFolders(folder.id);
  const folderLinks = getFolderLinks(folder.id);
  const hasChildren = subFolders.length > 0 || folderLinks.length > 0;
  const fColor = folder.color || "#56A4D9";
  const isDragging = dragItem?.id === folder.id;
  const atMaxDepth = depth >= MAX_FOLDER_DEPTH - 1; // depth is 0-indexed; max 4 levels = index 3

  // Can this folder accept the current drag item?
  const isValidDrop = dragItem &&
    dragItem.id !== folder.id &&
    !forbiddenDropIds.includes(folder.id) &&
    dragItem.designerId === folder.designerId;
  const isDropHighlight = dropTargetId === folder.id && isValidDrop;

  const menuItems = isViewingOwn
    ? [
        { type: "colors", colors: FOLDER_COLORS, activeColor: fColor, onSelect: (c) => updateFolder(folder.id, { color: c }) },
        "divider",
        ...(!atMaxDepth ? [{ label: "New Sub-folder", icon: FolderPlus, onClick: () => openModal("addFolder", { designerId: folder.designerId, parentFolderId: folder.id }) }] : []),
        { label: "Add Link", icon: Link2, onClick: () => openModal("addLink", { designerId: folder.designerId, folderId: folder.id }) },
        "divider",
        { label: "Move to", icon: FolderSymlink, onClick: () => openModal("moveItem", { type: "folder", id: folder.id, designerId: folder.designerId, currentFolderId: folder.parentFolderId }) },
        { label: "Rename", icon: Edit2, onClick: () => openModal("editFolder", { folder }) },
        { label: "Delete", icon: Trash2, danger: true, onClick: () => deleteFolder(folder.id) },
      ]
    : [];

  const canDrag = isViewingOwn;

  return (
    <div>
      <div
        draggable={canDrag}
        onDragStart={(e) => {
          if (!canDrag) { e.preventDefault(); return; }
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", folder.id);
          onDragStart({ type: "folder", id: folder.id, designerId: folder.designerId, currentFolderId: folder.parentFolderId });
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          if (isValidDrop) {
            e.preventDefault();
            e.stopPropagation();
            onDragOver(folder.id);
          }
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          if (dropTargetId === folder.id) onDragOver(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isValidDrop) onDrop(folder.id);
        }}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => {
          onSelect({ type: "folder", id: folder.id });
          if (hasChildren && !isExpanded) toggleExpand(folder.id);
        }}
        className={`group flex items-center gap-1.5 pr-3 py-[7px] mx-1 rounded-lg transition-all duration-150 ${
          canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
        } ${
          isDragging ? "opacity-30" : ""
        } ${
          isDropHighlight
            ? "bg-[#007AFF]/[0.07] ring-1 ring-[#007AFF]/30"
            : isSelected
              ? "bg-[#E8E8EC] text-[#1D1D1F]"
              : "text-[#3A3A3C] hover:bg-[#EBEBED]"
        }`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); if (hasChildren) toggleExpand(folder.id); }}
          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
        >
          {hasChildren ? (
            <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""} text-[#AEAEB2]`} />
          ) : (
            <span className="w-3 h-3" />
          )}
        </button>
        {isExpanded
          ? <FolderOpen className="w-[14px] h-[14px] flex-shrink-0" style={{ color: fColor }} />
          : <FolderIcon className="w-[14px] h-[14px] flex-shrink-0" style={{ color: fColor }} />}
        <span className={`text-[12px] flex-1 truncate ${isSelected ? "font-medium" : ""}`}>
          {folder.name}
        </span>
        {folder.isPersonal && (
          <Lock className="w-2.5 h-2.5 text-[#FF9500]/60 flex-shrink-0" />
        )}
        {folderLinks.length > 0 && (
          <span className="text-[9px] text-[#AEAEB2] font-medium tabular-nums flex-shrink-0 mr-1">
            {folderLinks.length}
          </span>
        )}
        {isViewingOwn && menuItems.length > 0 && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <DropdownMenu items={menuItems} />
          </div>
        )}
      </div>

      {isExpanded && (
        <div>
          {(() => {
            const children = [
              ...subFolders.map(f => ({ kind: "folder", data: f })),
              ...folderLinks.map(l => ({ kind: "link", data: l })),
            ].sort((a, b) => new Date(b.data.updatedAt || b.data.createdAt) - new Date(a.data.updatedAt || a.data.createdAt));

            if (children.length === 0) {
              return (
                <div style={{ paddingLeft: `${(depth + 1) * 16 + 28}px` }} className="py-1.5">
                  <p className="text-[11px] text-[#C7C7CC] italic">Empty</p>
                </div>
              );
            }
            return children.map(({ kind, data }) =>
              kind === "folder" ? (
                <TreeFolderNode
                  key={data.id} folder={data} depth={depth + 1}
                  expandedIds={expandedIds} toggleExpand={toggleExpand}
                  selectedItem={selectedItem} onSelect={onSelect}
                  dragItem={dragItem} dropTargetId={dropTargetId}
                  forbiddenDropIds={forbiddenDropIds}
                  onDragStart={onDragStart} onDragEnd={onDragEnd}
                  onDragOver={onDragOver} onDrop={onDrop}
                  isViewingOwn={isViewingOwn}
                />
              ) : (
                <TreeLinkNode
                  key={data.id} link={data} depth={depth + 1}
                  isSelected={selectedItem?.type === "link" && selectedItem?.id === data.id}
                  onSelect={onSelect}
                  dragItem={dragItem}
                  onDragStart={onDragStart} onDragEnd={onDragEnd}
                  isViewingOwn={isViewingOwn}
                />
              )
            );
          })()}
        </div>
      )}
    </div>
  );
}

/* ── Explorer Panel (Column 2 content) ─────────────────── */

function ExplorerPanel({
  designer, selectedItem, onSelect, expandedIds, toggleExpand,
  dragItem, dropTargetId, forbiddenDropIds,
  onDragStart, onDragEnd, onDragOver, onDrop,
  isViewingOwn,
}) {
  const { getDesignerTopFolders, getDesignerRootLinks, openModal, getPersonalFolderIds, getAllDesignerLinks, getAllDesignerFolders } = useApp();
  const allTopFolders = getDesignerTopFolders(designer.id);
  const allRootLinks = getDesignerRootLinks(designer.id);
  const [treeSearch, setTreeSearch] = useState("");

  // Filter out personal folders + their links when viewing someone else's files
  const personalIds = !isViewingOwn ? getPersonalFolderIds(designer.id) : [];
  const topFolders = isViewingOwn ? allTopFolders : allTopFolders.filter(f => !f.isPersonal);
  const rootLinks = isViewingOwn ? allRootLinks : allRootLinks.filter(l => !personalIds.includes(l.folderId));

  // Search: flatten all designer links + folders and filter by query
  const allLinks = getAllDesignerLinks(designer.id);
  const allFolders = getAllDesignerFolders(designer.id);

  const searchQuery = treeSearch.trim().toLowerCase();
  const isSearching = searchQuery.length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return null;
    const matchedLinks = allLinks.filter(l =>
      (!isViewingOwn ? !personalIds.includes(l.folderId) : true) &&
      (l.title.toLowerCase().includes(searchQuery) || (l.description || "").toLowerCase().includes(searchQuery))
    );
    const matchedFolders = allFolders.filter(f =>
      (!isViewingOwn ? !f.isPersonal : true) &&
      f.name.toLowerCase().includes(searchQuery)
    );
    return { links: matchedLinks, folders: matchedFolders };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, allLinks, allFolders, isViewingOwn]);

  const isRootDrop = dropTargetId === "__root__" && dragItem && dragItem.designerId === designer.id;

  return (
    <div className="flex flex-col h-full">
      {/* Name row */}
      <div className="px-4 py-2.5 flex items-center gap-2.5 flex-shrink-0">
        <DesignerAvatar designer={designer} size="header" />
        <span className="text-[13px] font-semibold text-[#1D1D1F] truncate flex-1">{designer.name}</span>
        {isViewingOwn && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => openModal("addFolder", { designerId: designer.id, parentFolderId: null })}
              className="p-1 text-[#AEAEB2] hover:text-[#636366] hover:bg-[#E5E5EA] rounded-md transition-all"
              title="New Folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                const fid = selectedItem?.type === "folder" ? selectedItem.id : null;
                openModal("addLink", { designerId: designer.id, folderId: fid });
              }}
              className="p-1 text-[#AEAEB2] hover:text-[#636366] hover:bg-[#E5E5EA] rounded-md transition-all"
              title="Add Link"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-[#E5E5EA] flex-shrink-0" />

      {/* Search row — full width */}
      <div className="border-b border-[#E5E5EA] flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2">
          <Search className="w-3.5 h-3.5 text-[#AEAEB2] flex-shrink-0" />
          <input
            type="text"
            value={treeSearch}
            onChange={e => setTreeSearch(e.target.value)}
            placeholder="Search files..."
            className="flex-1 bg-transparent text-[12px] text-[#1D1D1F] placeholder-[#AEAEB2] outline-none min-w-0"
          />
          {treeSearch && (
            <button onClick={() => setTreeSearch("")} className="flex-shrink-0 text-[#AEAEB2] hover:text-[#636366] transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Search results */}
      {isSearching && searchResults && (
        <div className="flex-1 overflow-y-auto py-1.5">
          {searchResults.links.length === 0 && searchResults.folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-5 h-5 text-[#C7C7CC] mb-2" />
              <p className="text-[12px] text-[#86868B]">No results for "{treeSearch}"</p>
            </div>
          ) : (
            <>
              {searchResults.folders.length > 0 && (
                <div className="px-2 mb-1">
                  <p className="px-2 py-1 text-[10px] font-semibold text-[#AEAEB2] uppercase tracking-wider">Folders</p>
                  {searchResults.folders.map(f => (
                    <button
                      key={f.id}
                      onClick={() => { onSelect({ type: "folder", id: f.id }); setTreeSearch(""); }}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#F5F5F7] text-left transition-colors"
                    >
                      <FolderIcon className="w-3.5 h-3.5 text-[#56A4D9] flex-shrink-0" />
                      <span className="text-[12px] font-medium text-[#1D1D1F] truncate">{f.name}</span>
                      {f.isPersonal && <Lock className="w-3 h-3 text-[#FF9500] flex-shrink-0 ml-auto" />}
                    </button>
                  ))}
                </div>
              )}
              {searchResults.links.length > 0 && (
                <div className="px-2">
                  <p className="px-2 py-1 text-[10px] font-semibold text-[#AEAEB2] uppercase tracking-wider">Links</p>
                  {searchResults.links.map(l => (
                    <button
                      key={l.id}
                      onClick={() => { onSelect({ type: "link", id: l.id }); setTreeSearch(""); }}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#F5F5F7] text-left transition-colors"
                    >
                      <Link2 className="w-3.5 h-3.5 text-[#AEAEB2] flex-shrink-0" />
                      <span className="text-[12px] font-medium text-[#1D1D1F] truncate flex-1">{l.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tree content — also acts as root drop zone */}
      {!isSearching && (
      <div
        className={`flex-1 overflow-y-auto py-1.5 transition-colors duration-150 ${
          isRootDrop ? "bg-[#007AFF]/[0.04]" : ""
        }`}
        onDragOver={(e) => {
          if (dragItem && dragItem.designerId === designer.id) {
            e.preventDefault();
            onDragOver("__root__");
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (dragItem && dragItem.designerId === designer.id) {
            onDrop("__root__");
          }
        }}
      >
        {/* Root drop indicator */}
        {isRootDrop && (
          <div className="mx-3 mb-1.5 px-3 py-2 rounded-lg border border-dashed border-[#007AFF]/30 bg-[#007AFF]/[0.04] flex items-center gap-2">
            <FolderIcon className="w-3 h-3 text-[#007AFF]/60" />
            <span className="text-[11px] text-[#007AFF]/80 font-medium">Drop here to move to root</span>
          </div>
        )}

        {topFolders.length === 0 && rootLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <FolderIcon className="w-5 h-5 text-[#C7C7CC] mb-2.5" />
            <p className="text-[12px] text-[#86868B] mb-3">
              {isViewingOwn ? "No content yet" : "No public content"}
            </p>
            {isViewingOwn && (
              <div className="flex gap-3">
                <button
                  onClick={() => openModal("addFolder", { designerId: designer.id, parentFolderId: null })}
                  className="text-[11px] text-[#636366] hover:text-[#1D1D1F] font-medium transition-colors"
                >
                  + Folder
                </button>
                <button
                  onClick={() => openModal("addLink", { designerId: designer.id, folderId: null })}
                  className="text-[11px] text-[#636366] hover:text-[#1D1D1F] font-medium transition-colors"
                >
                  + Link
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {[
              ...topFolders.map(f => ({ kind: "folder", data: f })),
              ...rootLinks.map(l => ({ kind: "link", data: l })),
            ]
              .sort((a, b) => new Date(b.data.updatedAt || b.data.createdAt) - new Date(a.data.updatedAt || a.data.createdAt))
              .map(({ kind, data }) =>
                kind === "folder" ? (
                  <TreeFolderNode
                    key={data.id} folder={data} depth={0}
                    expandedIds={expandedIds} toggleExpand={toggleExpand}
                    selectedItem={selectedItem} onSelect={onSelect}
                    dragItem={dragItem} dropTargetId={dropTargetId}
                    forbiddenDropIds={forbiddenDropIds}
                    onDragStart={onDragStart} onDragEnd={onDragEnd}
                    onDragOver={onDragOver} onDrop={onDrop}
                    isViewingOwn={isViewingOwn}
                  />
                ) : (
                  <TreeLinkNode
                    key={data.id} link={data} depth={0}
                    isSelected={selectedItem?.type === "link" && selectedItem?.id === data.id}
                    onSelect={onSelect}
                    dragItem={dragItem}
                    onDragStart={onDragStart} onDragEnd={onDragEnd}
                    isViewingOwn={isViewingOwn}
                  />
                )
              )}
          </>
        )}
      </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COLUMN 3 — Detail View
   ═══════════════════════════════════════════════════════════ */

function DetailPanel({ selectedItem, onSelect, expandedIds, toggleExpand, isViewingOwn }) {
  const {
    designers, folders, links,
    getAllDesignerLinks, getAllDesignerFolders, getDesignerTopFolders, getDesignerRootLinks,
    getSubFolders, getFolderLinks,
    openModal, deleteDesigner, deleteFolder, deleteLink, updateFolder, updateDesigner,
    copyLink, getFolderPath,
  } = useApp();

  const fileRef = useRef(null);

  /* ── Empty state ──── */
  if (!selectedItem) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-11 h-11 bg-[#F2F2F7] rounded-xl flex items-center justify-center mb-3">
          <FolderIcon className="w-[18px] h-[18px] text-[#C7C7CC]" />
        </div>
        <p className="text-[13px] font-medium text-[#86868B]">No selection</p>
        <p className="text-[12px] text-[#AEAEB2] mt-1 max-w-[200px] leading-relaxed">
          Select an item from the explorer to view details
        </p>
      </div>
    );
  }

  /* ── Designer overview ──── */
  if (selectedItem.type === "designer") {
    const d = designers.find((x) => x.id === selectedItem.id);
    if (!d) return null;
    const designerFolders = getDesignerTopFolders(d.id);
    const allLinks = getAllDesignerLinks(d.id);
    const rootLinks = getDesignerRootLinks(d.id);
    const folderCount = getAllDesignerFolders(d.id).length;
    const recentLinks = [...allLinks]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    const handleProfileImage = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = (ev) => updateDesigner(d.id, { name: d.name, profileImage: ev.target.result });
      reader.readAsDataURL(file);
    };

    return (
      <div className="p-6 space-y-6 max-w-xl">
        {/* Profile */}
        <div className="flex items-start gap-4">
          {isViewingOwn ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="relative flex-shrink-0 cursor-pointer group"
            >
              {d.profileImage ? (
                <img src={d.profileImage} alt={d.name} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
              ) : (
                <div className={`w-12 h-12 ${d.avatarColor} rounded-xl flex items-center justify-center text-white text-base font-bold shadow-sm`}>
                  {d.avatar}
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleProfileImage} />
            </div>
          ) : (
            <div className="flex-shrink-0">
              {d.profileImage ? (
                <img src={d.profileImage} alt={d.name} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
              ) : (
                <div className={`w-12 h-12 ${d.avatarColor} rounded-xl flex items-center justify-center text-white text-base font-bold shadow-sm`}>
                  {d.avatar}
                </div>
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] font-bold text-[#1D1D1F] leading-tight">{d.name}</h2>
            {d.role && <p className="text-[13px] text-[#636366] mt-0.5">{d.role}</p>}
            {d.email && <p className="text-[12px] text-[#86868B] mt-0.5">{d.email}</p>}
          </div>
          {isViewingOwn && (
            <DropdownMenu items={[
              { label: "Edit", icon: Edit2, onClick: () => openModal("editDesigner", { designer: d }) },
              "divider",
              { label: "Delete", icon: Trash2, danger: true, onClick: () => deleteDesigner(d.id) },
            ]} />
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <div className="flex-1 bg-[#F5F5F7] rounded-lg px-4 py-3 border border-[#E5E5EA]">
            <p className="text-[18px] font-bold text-[#1D1D1F] leading-none tabular-nums">{folderCount}</p>
            <p className="text-[11px] text-[#86868B] mt-1">Folders</p>
          </div>
          <div className="flex-1 bg-[#F5F5F7] rounded-lg px-4 py-3 border border-[#E5E5EA]">
            <p className="text-[18px] font-bold text-[#1D1D1F] leading-none tabular-nums">{allLinks.length}</p>
            <p className="text-[11px] text-[#86868B] mt-1">Links</p>
          </div>
        </div>

        {/* Folders grid */}
        {designerFolders.length > 0 && (
          <div>
            <p className="section-title mb-2.5">Folders</p>
            <div className="grid grid-cols-2 gap-2">
              {designerFolders.map((f) => (
                <div
                  key={f.id}
                  onClick={() => {
                    onSelect({ type: "folder", id: f.id });
                    if (!expandedIds.has(f.id)) toggleExpand(f.id);
                  }}
                  className="group p-3 rounded-lg border border-[#E5E5EA] hover:border-[#C7C7CC] hover:bg-[#FAFAFA] cursor-pointer transition-all duration-150"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <FolderIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: f.color || "#56A4D9" }} />
                    <span className="text-[12px] font-medium text-[#1D1D1F] truncate">{f.name}</span>
                  </div>
                  <p className="text-[11px] text-[#86868B]">
                    {getFolderLinks(f.id).length} link{getFolderLinks(f.id).length !== 1 ? "s" : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Root links */}
        {rootLinks.length > 0 && (
          <div>
            <p className="section-title mb-2">Root Links</p>
            <div className="space-y-0.5">
              {rootLinks.map((l) => (
                <LinkListItem key={l.id} link={l} onClick={() => onSelect({ type: "link", id: l.id })} />
              ))}
            </div>
          </div>
        )}

        {/* Recent */}
        {recentLinks.length > 0 && (
          <div>
            <p className="section-title mb-2">Recent</p>
            <div className="space-y-0.5">
              {recentLinks.map((l) => (
                <div
                  key={l.id}
                  onClick={() => onSelect({ type: "link", id: l.id })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F5F5F7] cursor-pointer transition-colors"
                >
                  <Clock className="w-3 h-3 text-[#C7C7CC] flex-shrink-0" />
                  <span className="text-[12px] text-[#636366] flex-1 truncate">{l.title}</span>
                  <span className="text-[10px] text-[#AEAEB2] flex-shrink-0 tabular-nums">
                    {format(new Date(l.createdAt), "d MMM")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Folder detail ──── */
  if (selectedItem.type === "folder") {
    const f = folders.find((x) => x.id === selectedItem.id);
    if (!f) return null;
    const d = designers.find((x) => x.id === f.designerId);
    const subFolders = getSubFolders(f.id);
    const folderLinks = getFolderLinks(f.id);
    const folderPath = getFolderPath(f.id);

    return (
      <div className="p-6 space-y-5 max-w-xl">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (f.color || "#56A4D9") + "18" }}>
            <FolderOpen className="w-[18px] h-[18px]" style={{ color: f.color || "#56A4D9" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-[#1D1D1F] leading-tight">{f.name}</h2>
              {f.isPersonal && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FF9500]/10 rounded text-[10px] font-semibold text-[#FF9500]">
                  <Lock className="w-2.5 h-2.5" />
                  Personal
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#86868B] mt-0.5">
              {d?.name}
              {folderPath.includes("/") ? ` · ${folderPath}` : ""}
            </p>
          </div>
          {isViewingOwn && (
            <DropdownMenu items={[
              { type: "colors", colors: FOLDER_COLORS, activeColor: f.color || "#56A4D9", onSelect: (c) => updateFolder(f.id, { color: c }) },
              "divider",
              { label: "Rename", icon: Edit2, onClick: () => openModal("editFolder", { folder: f }) },
              "divider",
              { label: "Delete", icon: Trash2, danger: true, onClick: () => deleteFolder(f.id) },
            ]} />
          )}
        </div>

        {/* Quick actions */}
        {isViewingOwn && (
          <div className="flex gap-2">
            <button
              onClick={() => openModal("addFolder", { designerId: f.designerId, parentFolderId: f.id })}
              className="btn-secondary text-[11px] py-1.5 px-3"
            >
              <FolderPlus className="w-3 h-3" /> Sub-folder
            </button>
            <button
              onClick={() => openModal("addLink", { designerId: f.designerId, folderId: f.id })}
              className="btn-secondary text-[11px] py-1.5 px-3"
            >
              <Plus className="w-3 h-3" /> Add Link
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-5 text-[12px] text-[#86868B] pb-4 border-b border-[#E5E5EA]">
          <span>
            <span className="font-semibold text-[#1D1D1F]">{subFolders.length}</span> sub-folders
          </span>
          <span>
            <span className="font-semibold text-[#1D1D1F]">{folderLinks.length}</span> links
          </span>
        </div>

        {/* Timestamps */}
        <div className="flex items-center gap-4 text-[11px] text-[#86868B]">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-[#C7C7CC]" />
            <span>Created {format(new Date(f.createdAt), "d MMM yyyy, h:mm a")}</span>
          </div>
          {f.updatedAt && f.updatedAt !== f.createdAt && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#C7C7CC]" />
              <span>Modified {format(new Date(f.updatedAt), "d MMM yyyy, h:mm a")}</span>
            </div>
          )}
        </div>

        {/* Sub-folders */}
        {subFolders.length > 0 && (
          <div>
            <p className="section-title mb-2">Sub-folders</p>
            <div className="grid grid-cols-2 gap-2">
              {subFolders.map((sf) => (
                <div
                  key={sf.id}
                  onClick={() => {
                    onSelect({ type: "folder", id: sf.id });
                    if (!expandedIds.has(sf.id)) toggleExpand(sf.id);
                  }}
                  className="group p-3 rounded-lg border border-[#E5E5EA] hover:border-[#C7C7CC] hover:bg-[#FAFAFA] cursor-pointer transition-all duration-150"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FolderIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: sf.color || "#56A4D9" }} />
                    <span className="text-[12px] font-medium text-[#1D1D1F] truncate">{sf.name}</span>
                  </div>
                  <p className="text-[11px] text-[#86868B]">{getFolderLinks(sf.id).length} links</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {folderLinks.length > 0 && (
          <div>
            <p className="section-title mb-2">Links</p>
            <div className="space-y-0.5">
              {folderLinks.map((l) => (
                <LinkListItem key={l.id} link={l} onClick={() => onSelect({ type: "link", id: l.id })} />
              ))}
            </div>
          </div>
        )}

        {folderLinks.length === 0 && subFolders.length === 0 && (
          <div className="text-center py-10">
            <FolderIcon className="w-5 h-5 text-[#C7C7CC] mx-auto mb-2" />
            <p className="text-[12px] text-[#86868B]">This folder is empty</p>
          </div>
        )}
      </div>
    );
  }

  /* ── Link detail ──── */
  if (selectedItem.type === "link") {
    const l = links.find((x) => x.id === selectedItem.id);
    if (!l) return null;
    const d = designers.find((x) => x.id === l.designerId);
    const folderPath = l.folderId ? getFolderPath(l.folderId) : null;

    return (
      <div className="p-6 space-y-5 max-w-xl">
        {/* Actions */}
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => copyLink(l.url)}
            title="Copy URL"
            className="p-1.5 text-[#AEAEB2] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-md transition-all"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openModal("shareLink", { link: l })}
            title="Share"
            className="p-1.5 text-[#AEAEB2] hover:text-[#007AFF] hover:bg-[#007AFF]/[0.06] rounded-md transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          {isViewingOwn && (
            <>
              <button
                onClick={() => openModal("editLink", { link: l })}
                title="Edit"
                className="p-1.5 text-[#AEAEB2] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-md transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteLink(l.id)}
                title="Delete"
                className="p-1.5 text-[#AEAEB2] hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Preview */}
        <LinkPreview link={l} size="lg" />

        {/* Title + breadcrumb */}
        <div>
          <h2 className="text-[16px] font-bold text-[#1D1D1F] leading-snug">{l.title}</h2>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
            <span className="text-[#86868B]">{d?.name}</span>
            {folderPath && (
              <>
                <span className="text-[#C7C7CC]">·</span>
                <span className="text-[#636366] bg-[#F2F2F7] px-1.5 py-0.5 rounded text-[10px]">
                  {folderPath}
                </span>
              </>
            )}
          </div>
        </div>

        {/* URL + Actions */}
        <div className="bg-[#F5F5F7] rounded-lg p-3.5 border border-[#E5E5EA]">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-3 h-3 text-[#AEAEB2] flex-shrink-0" />
            <span className="text-[11px] text-[#636366] flex-1 truncate font-mono">{l.url}</span>
          </div>
          <div className="flex gap-2">
            <a href={l.url} target="_blank" rel="noreferrer" className="btn-primary text-[11px] py-1.5 px-3">
              <ExternalLink className="w-3 h-3" /> Open Link
            </a>
            <button onClick={() => copyLink(l.url)} className="btn-secondary text-[11px] py-1.5 px-3">
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
        </div>

        {/* Description */}
        {l.description && (
          <div>
            <p className="section-title mb-1.5">Description</p>
            <p className="text-[13px] text-[#636366] leading-relaxed">{l.description}</p>
          </div>
        )}

        {/* Timestamps */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center gap-1.5 text-[11px] text-[#86868B]">
            <Calendar className="w-3 h-3 text-[#C7C7CC]" />
            <span>Created {format(new Date(l.createdAt), "d MMM yyyy, h:mm a")}</span>
          </div>
          {l.updatedAt && l.updatedAt !== l.createdAt && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#86868B]">
              <Clock className="w-3 h-3 text-[#C7C7CC]" />
              <span>Modified {format(new Date(l.updatedAt), "d MMM yyyy, h:mm a")}</span>
            </div>
          )}
        </div>

        {/* Shared with */}
        {(l.sharedWith || []).length > 0 && (() => {
          const sharedDesigners = l.sharedWith.map(id => designers.find(x => x.id === id)).filter(Boolean);
          return sharedDesigners.length > 0 ? (
            <div className="bg-[#F5F5F7] rounded-lg p-3 border border-[#E5E5EA]">
              <p className="text-[11px] text-[#86868B] font-medium mb-2">Shared with</p>
              <div className="flex flex-wrap gap-1.5">
                {sharedDesigners.map(sd => (
                  <div key={sd.id} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-full border border-[#E5E5EA]">
                    <DesignerAvatar designer={sd} size="xs" />
                    <span className="text-[11px] text-[#636366] font-medium">{sd.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}

        {/* Meta footer */}
        <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5EA]">
          {d && (
            <div className="flex items-center gap-2">
              <DesignerAvatar designer={d} size="xs" />
              <span className="text-[11px] text-[#636366]">{d.name}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════
   Resize Handle — drag to resize adjacent columns
   ═══════════════════════════════════════════════════════════ */

function ResizeHandle({ onMouseDown }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="w-[5px] flex-shrink-0 cursor-col-resize group relative z-10"
    >
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-[#E5E5EA] group-hover:bg-[#007AFF] group-active:bg-[#007AFF] transition-colors" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN — 3-Column Layout
   ═══════════════════════════════════════════════════════════ */

export function TreeExplorer() {
  const {
    designers, openModal, selectedItem, setSelectedItem,
    getAllDesignerLinks, favDesigners, currentUser,
    links, folders,
    moveLinkSilent, moveFolderSilent, showNotification,
    lastSeenDesigners, markDesignerSeen,
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();
  const lastNavPath = useRef("");

  const [selectedDesignerId, setSelectedDesignerId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [designerSearch, setDesignerSearch] = useState("");
  const [designerSort, setDesignerSort] = useState("name"); // "name" | "count" | "updated"
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);

  // Refs to avoid stale closures in URL sync effect
  const designersRef = useRef(designers);
  designersRef.current = designers;
  const foldersRef = useRef(folders);
  foldersRef.current = folders;

  // ── Drag & drop state ──────────────────────────────────
  const [dragItem, setDragItem] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);

  const forbiddenDropIds = useMemo(() => {
    if (!dragItem) return [];
    let forbidden = [];

    if (dragItem.type === "folder") {
      // Circular reference prevention
      forbidden = getDescendantIds(dragItem.id, folders);

      // Depth limit: target depth + subtree depth + 1 must be <= MAX_FOLDER_DEPTH
      const subtreeDepth = getSubtreeMaxDepth(dragItem.id, folders);
      folders.forEach(f => {
        if (forbidden.includes(f.id)) return;
        if (f.designerId !== dragItem.designerId) return;
        const targetDepth = getFolderNestingDepth(f.id, folders);
        if (targetDepth + 1 + subtreeDepth > MAX_FOLDER_DEPTH) {
          forbidden.push(f.id);
        }
      });
    }
    // Links have no depth restriction — they sit in any folder
    return forbidden;
  }, [dragItem, folders]);

  const handleDragStart = useCallback((item) => { setDragItem(item); }, []);
  const handleDragEnd = useCallback(() => { setDragItem(null); setDropTargetId(null); }, []);

  const handleDrop = useCallback((targetFolderId) => {
    if (!dragItem) return;
    const newId = targetFolderId === "__root__" ? null : targetFolderId;

    // Don't move if same location
    const currentFolderId = dragItem.currentFolderId || null;
    if (newId === currentFolderId) {
      setDragItem(null);
      setDropTargetId(null);
      return;
    }

    if (dragItem.type === "link") {
      moveLinkSilent(dragItem.id, { folderId: newId });
    } else {
      moveFolderSilent(dragItem.id, { parentFolderId: newId });
    }
    showNotification("Moved successfully");
    setDragItem(null);
    setDropTargetId(null);
  }, [dragItem, moveLinkSilent, moveFolderSilent, showNotification]);

  // ── Resizable column widths ────────────────────────────
  const [col1Width, setCol1Width] = useState(300);
  const [col2Width, setCol2Width] = useState(300);
  const col1Ref = useRef(300);
  const col2Ref = useRef(300);
  col1Ref.current = col1Width;
  col2Ref.current = col2Width;

  const startResize = useCallback((column) => (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = column === 1 ? col1Ref.current : col2Ref.current;
    const setW = column === 1 ? setCol1Width : setCol2Width;
    const min = column === 1 ? 200 : 240;
    const max = column === 1 ? 560 : 560;

    const onMove = (ev) => setW(Math.max(min, Math.min(max, startW + ev.clientX - startX)));
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const selectedDesigner = designers.find((d) => d.id === selectedDesignerId);

  const isCurrentUserDesigner = useCallback((d) =>
    !!(d.email && currentUser?.email && d.email.toLowerCase() === currentUser.email.toLowerCase()),
    [currentUser]
  );

  // ── Activity badge counts ─────────────────────────────
  const getNewCount = useCallback((designerId) => {
    const lastSeen = lastSeenDesigners[designerId];
    if (!lastSeen) return 0;
    const seenTime = new Date(lastSeen).getTime();
    const newLinks = links.filter(l => l.designerId === designerId && new Date(l.createdAt).getTime() > seenTime).length;
    const newFolders = folders.filter(f => f.designerId === designerId && new Date(f.createdAt).getTime() > seenTime).length;
    return newLinks + newFolders;
  }, [links, folders, lastSeenDesigners]);

  const filteredDesigners = useMemo(() => {
    const sorted = [...designers].sort((a, b) => {
      // 1) Current (logged-in) user always first
      const aMe = isCurrentUserDesigner(a);
      const bMe = isCurrentUserDesigner(b);
      if (aMe !== bMe) return aMe ? -1 : 1;

      // 2) Pinned designers next
      const aPin = favDesigners.includes(a.id);
      const bPin = favDesigners.includes(b.id);
      if (aPin !== bPin) return aPin ? -1 : 1;

      // 3) Sort by chosen criterion
      switch (designerSort) {
        case "count": {
          const aCount = links.filter(l => l.designerId === a.id).length
                       + folders.filter(f => f.designerId === a.id).length;
          const bCount = links.filter(l => l.designerId === b.id).length
                       + folders.filter(f => f.designerId === b.id).length;
          return bCount - aCount; // highest first
        }
        case "updated": {
          const latest = (id) => {
            let max = 0;
            links.forEach(l => { if (l.designerId === id) { const t = new Date(l.updatedAt || l.createdAt).getTime(); if (t > max) max = t; } });
            folders.forEach(f => { if (f.designerId === id) { const t = new Date(f.updatedAt || f.createdAt).getTime(); if (t > max) max = t; } });
            return max;
          };
          return latest(b.id) - latest(a.id); // most recent first
        }
        default:
          return a.name.localeCompare(b.name);
      }
    });
    if (!designerSearch.trim()) return sorted;
    const q = designerSearch.toLowerCase();
    return sorted.filter(
      (d) => d.name.toLowerCase().includes(q) || (d.role || "").toLowerCase().includes(q)
    );
  }, [designers, designerSearch, favDesigners, designerSort, isCurrentUserDesigner, links, folders]);

  // ── URL helpers ──────────────────────────────────────────
  const buildUrlPath = useCallback((designerId, folderId = null) => {
    const designer = designers.find(d => d.id === designerId);
    if (!designer) return "/designers";
    let path = `/designers/${slugify(designer.name)}`;
    if (folderId) {
      const parts = [];
      let cur = folders.find(f => f.id === folderId);
      while (cur) {
        parts.unshift(slugify(cur.name));
        cur = cur.parentFolderId ? folders.find(f => f.id === cur.parentFolderId) : null;
      }
      if (parts.length) path += "/" + parts.join("/");
    }
    return path;
  }, [designers, folders]);

  // ── Sync URL → state (mount + back/forward) ───────────
  useEffect(() => {
    if (location.pathname === lastNavPath.current) {
      lastNavPath.current = "";
      return;
    }

    const path = location.pathname;
    if (!path.startsWith("/designers")) return;

    const segments = path.replace(/^\/designers\/?/, "").split("/").filter(Boolean);
    const allDesigners = designersRef.current;
    const allFolders = foldersRef.current;

    if (segments.length === 0) {
      // /designers — default to first designer
      if (allDesigners.length > 0) {
        const first = allDesigners[0];
        setSelectedDesignerId(first.id);
        setSelectedItem({ type: "designer", id: first.id });
        markDesignerSeen(first.id);
        const newPath = `/designers/${slugify(first.name)}`;
        lastNavPath.current = newPath;
        navigate(newPath, { replace: true });
      }
      return;
    }

    // Find designer by slug
    const designer = allDesigners.find(d => slugify(d.name) === segments[0]);
    if (!designer) {
      if (allDesigners.length > 0) {
        setSelectedDesignerId(allDesigners[0].id);
        setSelectedItem({ type: "designer", id: allDesigners[0].id });
      }
      return;
    }

    setSelectedDesignerId(designer.id);
    markDesignerSeen(designer.id);

    if (segments.length === 1) {
      setSelectedItem({ type: "designer", id: designer.id });
      return;
    }

    // Walk folder path
    let parentId = null;
    let lastFolderId = null;
    const newExpandIds = [];
    for (let i = 1; i < segments.length; i++) {
      const folder = allFolders.find(f =>
        f.designerId === designer.id &&
        (parentId === null ? !f.parentFolderId : f.parentFolderId === parentId) &&
        slugify(f.name) === segments[i]
      );
      if (folder) {
        newExpandIds.push(folder.id);
        lastFolderId = folder.id;
        parentId = folder.id;
      } else break;
    }

    if (lastFolderId) {
      setSelectedItem({ type: "folder", id: lastFolderId });
      setExpandedIds(prev => {
        const next = new Set(prev);
        newExpandIds.forEach(id => next.add(id));
        return next;
      });
    } else {
      setSelectedItem({ type: "designer", id: designer.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    if (sortOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortOpen]);

  const toggleExpand = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectDesigner = useCallback(
    (designerId) => {
      setSelectedDesignerId(designerId);
      setSelectedItem({ type: "designer", id: designerId });
      markDesignerSeen(designerId);
      const path = buildUrlPath(designerId);
      lastNavPath.current = path;
      navigate(path);
    },
    [setSelectedItem, markDesignerSeen, buildUrlPath, navigate]
  );

  const handleSelectItem = useCallback(
    (item) => {
      setSelectedItem(item);
      if (item.type === "folder") {
        const folder = folders.find(f => f.id === item.id);
        if (folder) {
          const path = buildUrlPath(folder.designerId, folder.id);
          lastNavPath.current = path;
          navigate(path);
        }
      }
      // Links: don't change URL — stay at current folder/designer path
    },
    [setSelectedItem, folders, buildUrlPath, navigate]
  );

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ── Column 1: Designers ── */}
      <div style={{ width: col1Width }} className="bg-white flex flex-col overflow-hidden flex-shrink-0">
        <div className="px-3 py-2.5 border-b border-[#E5E5EA] flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center gap-1.5 px-2.5 py-[6px] rounded-lg bg-[#F5F5F7] border border-transparent focus-within:bg-white focus-within:border-[#007AFF] focus-within:ring-2 focus-within:ring-[#007AFF]/12 transition-all">
              <Search className="w-3.5 h-3.5 text-[#AEAEB2] flex-shrink-0" />
              <input
                type="text"
                placeholder="Designers"
                value={designerSearch}
                onChange={(e) => setDesignerSearch(e.target.value)}
                className="flex-1 bg-transparent text-[13px] text-[#1D1D1F] placeholder-[#86868B] outline-none min-w-0"
              />
            </div>
            {/* Sort dropdown */}
            <div ref={sortRef} className="relative flex-shrink-0">
              <button
                onClick={() => setSortOpen(o => !o)}
                className={`p-1.5 rounded-md transition-all flex-shrink-0 ${
                  sortOpen ? "text-[#1D1D1F] bg-[#E5E5EA]" : "text-[#AEAEB2] hover:text-[#636366] hover:bg-[#E5E5EA]"
                }`}
                title="Sort"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
              {sortOpen && (
                <div className="absolute top-8 right-0 z-50 min-w-[148px] bg-white rounded-lg border border-[#D1D1D6] shadow-[0_6px_20px_rgba(0,0,0,0.06)] py-1.5">
                  {[
                    { key: "name", icon: ArrowDownAZ, label: "Name" },
                    { key: "count", icon: Layers, label: "File count" },
                    { key: "updated", icon: Clock, label: "Last updated" },
                  ].map((s) => (
                    <button
                      key={s.key}
                      onClick={() => { setDesignerSort(s.key); setSortOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-[7px] text-[12px] text-left transition-all duration-100 ${
                        designerSort === s.key
                          ? "text-[#1D1D1F] bg-[#F5F5F7]"
                          : "text-[#636366] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
                      }`}
                    >
                      <s.icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="font-medium flex-1">{s.label}</span>
                      {designerSort === s.key && <Check className="w-3 h-3 text-[#007AFF] flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => openModal("addDesigner")}
              className="p-1.5 text-[#AEAEB2] hover:text-[#636366] hover:bg-[#E5E5EA] rounded-md transition-all flex-shrink-0"
              title="Add Designer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {designers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Users className="w-5 h-5 text-[#C7C7CC] mb-2.5" />
              <p className="text-[12px] text-[#86868B]">No designers yet</p>
              <button
                onClick={() => openModal("addDesigner")}
                className="mt-2 text-[11px] text-[#636366] hover:text-[#1D1D1F] font-medium transition-colors"
              >
                + Add Designer
              </button>
            </div>
          ) : filteredDesigners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <p className="text-[12px] text-[#86868B]">No matches</p>
            </div>
          ) : (
            <div className="py-1">
              {filteredDesigners.map((designer, idx) => {
                const isMe = isCurrentUserDesigner(designer);
                const isPinned = favDesigners.includes(designer.id);
                const next = filteredDesigners[idx + 1];
                // Group: 0 = you, 1 = pinned, 2 = rest
                const group = isMe ? 0 : isPinned ? 1 : 2;
                const nextGroup = next
                  ? (isCurrentUserDesigner(next) ? 0 : favDesigners.includes(next.id) ? 1 : 2)
                  : group;
                const showSep = next && group !== nextGroup;

                // Dynamic meta based on sort mode
                let info;
                if (designerSort === "count") {
                  info = String(
                    links.filter(l => l.designerId === designer.id).length +
                    folders.filter(f => f.designerId === designer.id).length
                  );
                } else if (designerSort === "updated") {
                  let mx = 0;
                  links.forEach(l => { if (l.designerId === designer.id) { const t = new Date(l.updatedAt || l.createdAt).getTime(); if (t > mx) mx = t; } });
                  folders.forEach(f => { if (f.designerId === designer.id) { const t = new Date(f.updatedAt || f.createdAt).getTime(); if (t > mx) mx = t; } });
                  info = mx ? format(new Date(mx), "d MMM") : "—";
                } else {
                  info = String(getAllDesignerLinks(designer.id).length);
                }

                const newCount = getNewCount(designer.id);

                return (
                  <React.Fragment key={designer.id}>
                    <DesignerListItem
                      designer={designer}
                      isSelected={selectedDesignerId === designer.id}
                      isPinned={isPinned}
                      isCurrentUser={isMe}
                      sortInfo={info}
                      newCount={newCount}
                      onClick={() => handleSelectDesigner(designer.id)}
                    />
                    {showSep && <div className="mx-4 my-1 border-t border-[#E5E5EA]" />}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Resize handle 1 ── */}
      <ResizeHandle onMouseDown={startResize(1)} />

      {/* ── Column 2: Explorer ── */}
      <div style={{ width: col2Width }} className="bg-[#FAFAFA] flex flex-col overflow-hidden flex-shrink-0">
        {selectedDesigner ? (
          <ExplorerPanel
            key={selectedDesigner.id}
            designer={selectedDesigner}
            selectedItem={selectedItem}
            onSelect={handleSelectItem}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
            dragItem={dragItem}
            dropTargetId={dropTargetId}
            forbiddenDropIds={forbiddenDropIds}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={setDropTargetId}
            onDrop={handleDrop}
            isViewingOwn={!!(selectedDesigner.email && currentUser?.email && selectedDesigner.email.toLowerCase() === currentUser.email.toLowerCase())}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <FolderIcon className="w-5 h-5 text-[#C7C7CC] mb-2.5" />
            <p className="text-[12px] text-[#86868B]">Select a designer</p>
          </div>
        )}
      </div>

      {/* ── Resize handle 2 ── */}
      <ResizeHandle onMouseDown={startResize(2)} />

      {/* ── Column 3: Detail ── */}
      <div className="flex-1 overflow-y-auto bg-white">
        <DetailPanel
          selectedItem={selectedItem}
          onSelect={handleSelectItem}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
          isViewingOwn={selectedDesigner ? !!(selectedDesigner.email && currentUser?.email && selectedDesigner.email.toLowerCase() === currentUser.email.toLowerCase()) : true}
        />
      </div>
    </div>
  );
}
