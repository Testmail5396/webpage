import React from "react";
import { Link2, Layers, Users, Search, FolderOpen } from "lucide-react";

const icons = {
  links: Link2,
  features: Layers,
  designers: Users,
  search: Search,
  default: FolderOpen,
};

export function EmptyState({
  type = "default",
  title,
  description,
  action,
  onAction,
}) {
  const Icon = icons[type] || icons.default;
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-800 mb-1.5">
        {title || "Nothing here yet"}
      </h3>
      <p className="text-sm text-gray-400 max-w-xs leading-relaxed mb-5">
        {description || "Get started by adding your first item."}
      </p>
      {action && onAction && (
        <button onClick={onAction} className="btn-primary">
          {action}
        </button>
      )}
    </div>
  );
}
