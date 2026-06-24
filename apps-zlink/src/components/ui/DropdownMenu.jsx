import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";

export function DropdownMenu({ items, align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="w-6 h-6 flex items-center justify-center rounded-md text-[#AEAEB2] hover:text-[#636366] hover:bg-[#F2F2F7] transition-all duration-150"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className={`absolute top-7 ${align === "right" ? "right-0" : "left-0"} z-50 min-w-[160px] bg-white rounded-lg border border-[#D1D1D6] shadow-[0_6px_20px_rgba(0,0,0,0.06)] py-1.5 overflow-hidden`}>
          {items.map((item, i) =>
            item === "divider" ? (
              <div key={i} className="my-1 mx-2.5 border-t border-[#E5E5EA]" />
            ) : item.type === "colors" ? (
              <div key="colors" className="flex items-center gap-[6px] px-3 py-[6px]">
                {item.colors.map((c) => {
                  const isActive = item.activeColor === c.color || (!item.activeColor && c.key === "default");
                  return (
                    <button
                      key={c.key}
                      onClick={() => { item.onSelect(c.key === "default" ? null : c.color); setOpen(false); }}
                      title={c.label}
                      className={`w-[16px] h-[16px] rounded-full transition-all duration-150 hover:scale-125 ${
                        isActive ? "ring-2 ring-offset-1 ring-[#1D1D1F] scale-110" : "ring-1 ring-black/10"
                      }`}
                      style={{ backgroundColor: c.color }}
                    />
                  );
                })}
              </div>
            ) : (
              <button
                key={item.label}
                onClick={() => { item.onClick(); setOpen(false); }}
                disabled={item.disabled}
                className={`w-full flex items-center gap-2.5 px-3 py-[7px] text-[12px] text-left transition-all duration-100 ${
                  item.danger
                    ? "text-red-500 hover:bg-red-50"
                    : "text-[#636366] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
                } ${item.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {item.icon && <item.icon className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className="font-medium">{item.label}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
