import React from "react";
import { ChevronRight } from "lucide-react";

/**
 * macOS Finder-style column navigator.
 *
 * Props:
 *   columns: Array<{
 *     label: string,
 *     items: Array<{ id, label, meta?, count? }>,
 *     selectedId: string | null,
 *     onSelect: (item) => void,
 *     emptyText: string,
 *   }>
 *
 *   rightPanel: ReactNode — shown on the right when an item is selected
 */
export function ColumnNavigator({ columns, rightPanel }) {
  // Only render columns up to the last one that has items
  // (or all if all have items)
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {columns.map((col, idx) => (
        <Column key={idx} column={col} isLast={idx === columns.length - 1} />
      ))}

      {/* Right detail panel */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-white border-l border-gray-100">
        {rightPanel || (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">Select an item to view details</p>
            <p className="text-xs text-gray-300 mt-1">Use the columns on the left to navigate</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Column({ column, isLast }) {
  const { label, items, selectedId, onSelect, emptyText } = column;

  return (
    <div
      className="flex flex-col border-r border-gray-100 bg-white flex-shrink-0 overflow-hidden"
      style={{ width: "196px" }}
    >
      {/* Column header */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-gray-300">{emptyText || "Nothing here"}</p>
          </div>
        ) : (
          items.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left border-l-2 transition-colors group ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-transparent hover:bg-gray-50"
                }`}
              >
                {/* Color dot if available */}
                {item.color && (
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.color}`} />
                )}

                {/* Avatar if available */}
                {item.avatar && (
                  <div
                    className={`w-6 h-6 ${item.avatarColor || "bg-gray-400"} rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0`}
                  >
                    {item.avatar}
                  </div>
                )}

                {/* Status dot if available */}
                {item.statusDot && (
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.statusDot}`} />
                )}

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs truncate font-medium ${
                      isSelected ? "text-indigo-700" : "text-gray-700"
                    }`}
                  >
                    {item.label}
                  </p>
                  {item.meta && (
                    <p className="text-[10px] text-gray-400 truncate">{item.meta}</p>
                  )}
                </div>

                {/* Count or chevron */}
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      isSelected
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
                {isSelected && (
                  <ChevronRight
                    className={`w-3 h-3 flex-shrink-0 ${
                      isSelected ? "text-indigo-400" : "text-gray-300"
                    }`}
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
