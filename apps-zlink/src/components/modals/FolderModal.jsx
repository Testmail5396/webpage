import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { useApp } from "../../contexts/AppContext";
import { Lock, Globe } from "lucide-react";

export function FolderModal({ mode, folder, designerId, parentFolderId, onClose }) {
  const { addFolder, updateFolder, isFolderPersonal } = useApp();
  const [name, setName] = useState(folder?.name || "");
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  // If creating a sub-folder inside a personal parent, inherit personal by default
  const parentIsPersonal = parentFolderId ? isFolderPersonal(parentFolderId) : false;
  const [isPersonal, setIsPersonal] = useState(
    isEdit ? (folder?.isPersonal || false) : parentIsPersonal
  );

  const handleSubmit = () => {
    if (!name.trim()) { setError("Folder name is required"); return; }
    if (isEdit) {
      updateFolder(folder.id, { name, isPersonal });
    } else {
      addFolder({ name, designerId: designerId || folder?.designerId, parentFolderId, isPersonal });
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Rename Folder" : parentFolderId ? "New Sub-folder" : "New Folder"}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary">{isEdit ? "Save" : "Create Folder"}</button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Folder name *</label>
          <input
            className="input-field"
            placeholder="e.g. Mobile Explorations"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
          {error && <p className="text-[11px] text-red-500 mt-1.5 font-medium">{error}</p>}
        </div>

        {/* Visibility toggle */}
        {!parentIsPersonal && (
          <div>
            <label className="label">Visibility</label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsPersonal(false)}
                className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all duration-150 ${
                  !isPersonal
                    ? "border-[#007AFF] bg-[#007AFF]/[0.04] ring-1 ring-[#007AFF]/20"
                    : "border-[#D1D1D6] hover:border-[#C7C7CC] hover:bg-[#F5F5F7]"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  !isPersonal ? "bg-[#007AFF]/10" : "bg-[#F2F2F7]"
                }`}>
                  <Globe className={`w-3.5 h-3.5 ${!isPersonal ? "text-[#007AFF]" : "text-[#AEAEB2]"}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-[12px] font-semibold ${!isPersonal ? "text-[#007AFF]" : "text-[#636366]"}`}>
                    Team
                  </p>
                  <p className="text-[10px] text-[#86868B] leading-snug">
                    Visible to everyone
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPersonal(true)}
                className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all duration-150 ${
                  isPersonal
                    ? "border-[#FF9500] bg-[#FF9500]/[0.04] ring-1 ring-[#FF9500]/20"
                    : "border-[#D1D1D6] hover:border-[#C7C7CC] hover:bg-[#F5F5F7]"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isPersonal ? "bg-[#FF9500]/10" : "bg-[#F2F2F7]"
                }`}>
                  <Lock className={`w-3.5 h-3.5 ${isPersonal ? "text-[#FF9500]" : "text-[#AEAEB2]"}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-[12px] font-semibold ${isPersonal ? "text-[#FF9500]" : "text-[#636366]"}`}>
                    Personal
                  </p>
                  <p className="text-[10px] text-[#86868B] leading-snug">
                    Only you can see this
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {parentIsPersonal && (
          <div className="flex items-center gap-2 px-3 py-2 bg-[#FF9500]/[0.06] rounded-lg border border-[#FF9500]/15">
            <Lock className="w-3 h-3 text-[#FF9500] flex-shrink-0" />
            <p className="text-[11px] text-[#636366]">
              This sub-folder inherits <span className="font-semibold text-[#FF9500]">Personal</span> visibility from its parent
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
