import React from "react";
import { Filter, X, SlidersHorizontal } from "lucide-react";
import { users, features, statusConfig } from "../../data/mockData";

export function FilterBar({ filters, onChange, onClear }) {
  const designers = users.filter((u) => u.role === "designer");
  const hasActiveFilters = Object.values(filters).some((v) => v);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Filter
      </div>

      {/* Status */}
      <select
        value={filters.status || ""}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent cursor-pointer"
      >
        <option value="">All Statuses</option>
        {Object.entries(statusConfig).map(([key, val]) => (
          <option key={key} value={key}>
            {val.label}
          </option>
        ))}
      </select>

      {/* Designer */}
      <select
        value={filters.designerId || ""}
        onChange={(e) => onChange({ ...filters, designerId: e.target.value })}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent cursor-pointer"
      >
        <option value="">All Designers</option>
        {designers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      {/* Feature */}
      <select
        value={filters.featureId || ""}
        onChange={(e) => onChange({ ...filters, featureId: e.target.value })}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent cursor-pointer"
      >
        <option value="">All Features</option>
        {features.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}

      {hasActiveFilters && (
        <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-medium">
          <Filter className="w-3 h-3" />
          Filtered
        </div>
      )}
    </div>
  );
}
