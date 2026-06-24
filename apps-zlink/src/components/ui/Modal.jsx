import React, { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({ open, onClose, title, children, size = "md", footer }) {
  const sizes = { sm: "max-w-[400px]", md: "max-w-md", lg: "max-w-2xl" };

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 p-4">
      <div className="absolute inset-0 bg-black/[0.18] backdrop-blur-[3px]" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.06)] flex flex-col max-h-[90vh] border border-[#E0E0E5]`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EBEBEE]">
          <h2 className="text-[13.5px] font-semibold text-[#1D1D1F] tracking-[-0.01em]">{title}</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 -mr-0.5 rounded-md flex items-center justify-center text-[#AEAEB2] hover:text-[#636366] hover:bg-[#F2F2F5] transition-all duration-150"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#EBEBEE] bg-[#FAFAFA] rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
