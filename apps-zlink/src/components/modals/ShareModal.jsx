import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { useApp } from "../../contexts/AppContext";
import { X, Share2, AlertTriangle, Lock } from "lucide-react";

export function ShareModal({ link, onClose }) {
  const { designers, updateLink, showNotification, isFolderPersonal } = useApp();
  const [selected, setSelected] = useState(link.sharedWith || []);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  // Check if this link is inside a personal folder
  const isInPersonalFolder = link.folderId ? isFolderPersonal(link.folderId) : false;

  // All designers except the link owner
  const shareableDesigners = designers.filter(d => d.id !== link.designerId);
  const owner = designers.find(d => d.id === link.designerId);

  const toggle = (dId) => {
    setSelected(prev =>
      prev.includes(dId) ? prev.filter(id => id !== dId) : [...prev, dId]
    );
  };

  const hasChanged =
    selected.length !== (link.sharedWith || []).length ||
    selected.some(id => !(link.sharedWith || []).includes(id));

  const doSave = () => {
    updateLink(link.id, { sharedWith: selected });
    const count = selected.length;
    if (count === 0) {
      showNotification("Sharing removed");
    } else {
      const names = selected
        .map(id => designers.find(d => d.id === id)?.name?.split(" ")[0])
        .filter(Boolean)
        .join(", ");
      showNotification(`Shared with ${names}`);
    }
    onClose();
  };

  const handleSave = () => {
    // If link is in a personal folder and user is adding new shares, show warning first
    if (isInPersonalFolder && selected.length > 0 && !pendingSave) {
      setShowWarning(true);
      return;
    }
    doSave();
  };

  const handleConfirmWarning = () => {
    setPendingSave(true);
    setShowWarning(false);
    doSave();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Share link"
      size="sm"
      footer={
        showWarning ? null : (
          <>
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={handleSave}
              disabled={!hasChanged}
              className={`btn-primary ${!hasChanged ? "opacity-40 pointer-events-none" : ""}`}
            >
              {selected.length > 0 ? `Share with ${selected.length}` : "Save"}
            </button>
          </>
        )
      }
    >
      {showWarning ? (
        /* ── Personal folder warning ── */
        <div className="space-y-4">
          <div className="bg-[#FF9500]/[0.06] rounded-xl p-4 border border-[#FF9500]/15">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-[#FF9500]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-[#FF9500]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#1D1D1F]">
                  This link is in a personal folder
                </p>
                <p className="text-[12px] text-[#636366] mt-1 leading-relaxed">
                  Personal folders are only visible to you. If you share this link, the selected people will see it in their <span className="font-medium">Shared</span> section even though the folder is private.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#F5F5F7] rounded-lg px-3.5 py-3 border border-[#E5E5EA]">
            <div className="flex items-center gap-2">
              <Lock className="w-3 h-3 text-[#FF9500]" />
              <p className="text-[12px] text-[#636366]">
                Sharing with{" "}
                <span className="font-semibold text-[#1D1D1F]">
                  {selected.map(id => designers.find(d => d.id === id)?.name?.split(" ")[0]).filter(Boolean).join(", ")}
                </span>
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowWarning(false)} className="btn-secondary">
              Go Back
            </button>
            <button onClick={handleConfirmWarning} className="btn-primary bg-[#FF9500] hover:bg-[#E68900]">
              Share Anyway
            </button>
          </div>
        </div>
      ) : (
        /* ── Normal share UI ── */
        <div className="space-y-4">
          {/* Link preview */}
          <div className="bg-[#F5F5F7] rounded-lg px-3.5 py-3 border border-[#E5E5EA]">
            <p className="text-[13px] font-medium text-[#1D1D1F] truncate">{link.title}</p>
            <p className="text-[11px] text-[#86868B] truncate mt-0.5">{link.url}</p>
            <div className="flex items-center gap-2 mt-1">
              {owner && (
                <p className="text-[10px] text-[#AEAEB2]">by {owner.name}</p>
              )}
              {isInPersonalFolder && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FF9500]/10 rounded text-[9px] font-semibold text-[#FF9500]">
                  <Lock className="w-2 h-2" />
                  Personal
                </span>
              )}
            </div>
          </div>

          {/* Designer list */}
          {shareableDesigners.length === 0 ? (
            <p className="text-[12px] text-[#86868B] text-center py-4">No other designers to share with</p>
          ) : (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">
                Share with
              </p>
              {shareableDesigners.map(d => {
                const isActive = selected.includes(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => toggle(d.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                      isActive
                        ? "bg-[#007AFF]/[0.06] ring-1 ring-[#007AFF]/20"
                        : "hover:bg-[#F5F5F7]"
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isActive
                        ? "bg-[#007AFF] border-[#007AFF]"
                        : "border-[#C7C7CC]"
                    }`}>
                      {isActive && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>

                    {/* Avatar */}
                    {d.profileImage ? (
                      <img src={d.profileImage} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className={`w-7 h-7 ${d.avatarColor} rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0`}>
                        {d.avatar}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#1D1D1F] truncate">{d.name}</p>
                      <p className="text-[11px] text-[#86868B] truncate">{d.role || "Designer"}</p>
                    </div>

                    {/* Remove X when active */}
                    {isActive && (
                      <X className="w-3.5 h-3.5 text-[#AEAEB2] flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Currently shared summary */}
          {selected.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <Share2 className="w-3 h-3 text-[#007AFF]" />
              <span className="text-[11px] text-[#636366]">
                Sharing with {selected.map(id => designers.find(d => d.id === id)?.name?.split(" ")[0]).filter(Boolean).join(", ")}
              </span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
