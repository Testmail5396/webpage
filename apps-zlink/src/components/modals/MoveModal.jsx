import React, { useState, useMemo } from "react";
import { Modal } from "../ui/Modal";
import { useApp, MAX_FOLDER_DEPTH } from "../../contexts/AppContext";
import { Folder as FolderIcon } from "lucide-react";

/* Build a flat list with depth info for indented rendering */
function buildFlatTree(folders, parentId = null, depth = 0) {
  return folders
    .filter(f => f.parentFolderId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(f => [
      { ...f, depth },
      ...buildFlatTree(folders, f.id, depth + 1),
    ]);
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

/* Get max depth of subtree below a folder (0 = leaf) */
function getSubtreeMaxDepth(folderId, allFolders) {
  const children = allFolders.filter(f => f.parentFolderId === folderId);
  if (children.length === 0) return 0;
  return 1 + Math.max(...children.map(c => getSubtreeMaxDepth(c.id, allFolders)));
}

export function MoveModal({ itemType, itemId, designerId, currentFolderId, onClose }) {
  const { folders, updateLink, updateFolder, showNotification } = useApp();
  const [selected, setSelected] = useState(currentFolderId || "__root__");

  const designerFolders = folders.filter(f => f.designerId === designerId);

  // For folder moves, exclude self + descendants + depth-violating targets
  const excludeIds = useMemo(() => {
    if (itemType !== "folder") return [];

    // Circular reference prevention
    const circularIds = getDescendantIds(itemId, folders);

    // Depth limit: target depth + subtree depth + 1 must be <= MAX_FOLDER_DEPTH
    const subtreeDepth = getSubtreeMaxDepth(itemId, folders);
    const depthViolations = designerFolders
      .filter(f => !circularIds.includes(f.id))
      .filter(f => {
        const targetDepth = getFolderNestingDepth(f.id, folders);
        return targetDepth + 1 + subtreeDepth > MAX_FOLDER_DEPTH;
      })
      .map(f => f.id);

    return [...circularIds, ...depthViolations];
  }, [itemType, itemId, folders, designerFolders]);

  const tree = useMemo(() => {
    const available = designerFolders.filter(f => !excludeIds.includes(f.id));
    return buildFlatTree(available);
  }, [designerFolders, excludeIds]);

  const isSameLocation =
    (selected === "__root__" && !currentFolderId) || selected === currentFolderId;

  const handleMove = () => {
    if (isSameLocation) { onClose(); return; }
    const newId = selected === "__root__" ? null : selected;

    if (itemType === "link") {
      updateLink(itemId, { folderId: newId });
    } else {
      updateFolder(itemId, { parentFolderId: newId });
    }
    showNotification("Moved successfully");
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Move to"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleMove} disabled={isSameLocation} className={`btn-primary ${isSameLocation ? "opacity-40 pointer-events-none" : ""}`}>
            Move
          </button>
        </>
      }
    >
      <div className="space-y-0.5">
        {/* Root option */}
        <button
          onClick={() => setSelected("__root__")}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${
            selected === "__root__"
              ? "bg-[#007AFF]/[0.06] ring-1 ring-[#007AFF]/20"
              : "hover:bg-[#F5F5F7]"
          }`}
        >
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            selected === "__root__" ? "border-[#007AFF]" : "border-[#C7C7CC]"
          }`}>
            {selected === "__root__" && <div className="w-2 h-2 rounded-full bg-[#007AFF]" />}
          </div>
          <FolderIcon className="w-3.5 h-3.5 text-[#86868B] flex-shrink-0" />
          <span className="text-[13px] text-[#1D1D1F] font-medium">Root</span>
          {!currentFolderId && (
            <span className="text-[10px] text-[#86868B] ml-auto">Current</span>
          )}
        </button>

        {tree.length > 0 && <div className="my-1.5 mx-2 border-t border-[#E5E5EA]" />}

        {/* Folder tree */}
        {tree.map(f => {
          const isCurrent = f.id === currentFolderId;
          const isSelected = selected === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setSelected(f.id)}
              style={{ paddingLeft: `${f.depth * 20 + 12}px` }}
              className={`w-full flex items-center gap-2.5 pr-3 py-2.5 rounded-lg text-left transition-all ${
                isSelected
                  ? "bg-[#007AFF]/[0.06] ring-1 ring-[#007AFF]/20"
                  : "hover:bg-[#F5F5F7]"
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                isSelected ? "border-[#007AFF]" : "border-[#C7C7CC]"
              }`}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-[#007AFF]" />}
              </div>
              <FolderIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: f.color || "#56A4D9" }} />
              <span className="text-[13px] text-[#1D1D1F] truncate">{f.name}</span>
              {isCurrent && (
                <span className="text-[10px] text-[#86868B] ml-auto flex-shrink-0">Current</span>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
