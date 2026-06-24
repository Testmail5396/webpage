import React from "react";
import { TopBar } from "./TopBar";
import { useApp } from "../../contexts/AppContext";
import { DesignerModal } from "../modals/DesignerModal";
import { FolderModal } from "../modals/FolderModal";
import { LinkModal } from "../modals/LinkModal";
import { MoveModal } from "../modals/MoveModal";
import { ShareModal } from "../modals/ShareModal";
import { InviteModal } from "../modals/InviteModal";
import { CheckCircle, AlertCircle } from "lucide-react";

export function Layout({ children }) {
  const { modal, closeModal, notification } = useApp();

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F7] overflow-hidden">
      <TopBar />
      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {children}
      </main>

      {modal?.type === "addDesigner" && <DesignerModal mode="add" onClose={closeModal} />}
      {modal?.type === "editDesigner" && <DesignerModal mode="edit" designer={modal.data.designer} onClose={closeModal} />}
      {modal?.type === "addFolder" && <FolderModal mode="add" designerId={modal.data.designerId} parentFolderId={modal.data.parentFolderId} onClose={closeModal} />}
      {modal?.type === "editFolder" && <FolderModal mode="edit" folder={modal.data.folder} onClose={closeModal} />}
      {modal?.type === "addLink" && <LinkModal mode="add" designerId={modal.data.designerId} folderId={modal.data.folderId} onClose={closeModal} />}
      {modal?.type === "editLink" && <LinkModal mode="edit" link={modal.data.link} onClose={closeModal} />}
      {modal?.type === "moveItem" && <MoveModal itemType={modal.data.type} itemId={modal.data.id} designerId={modal.data.designerId} currentFolderId={modal.data.currentFolderId} onClose={closeModal} />}
      {modal?.type === "shareLink" && <ShareModal link={modal.data.link} onClose={closeModal} />}
      {modal?.type === "invite" && <InviteModal onClose={closeModal} />}

      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-lg border backdrop-blur-sm ${
              notification.type === "error"
                ? "bg-red-950/95 text-red-100 border-red-900/50"
                : "bg-[#1D1D1F]/95 text-white border-[#3A3A3C]/50"
            }`}
          >
            {notification.type === "error" ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            )}
            <span className="text-[12px] font-medium">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
