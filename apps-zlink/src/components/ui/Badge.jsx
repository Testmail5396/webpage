import React from "react";
import { statusConfig } from "../../data/mockData";

export function StatusBadge({ status, size = "sm" }) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <span
      className={`badge ${config.className} ${
        size === "xs" ? "text-[10px] px-1.5 py-0.5" : ""
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} inline-block`} />
      {config.label}
    </span>
  );
}

export function TagBadge({ tag, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`badge border transition-colors duration-150 ${
        active
          ? "bg-indigo-100 text-indigo-700 border-indigo-200"
          : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700"
      }`}
    >
      #{tag}
    </button>
  );
}

export function RoleBadge({ role }) {
  const config = {
    designer: "bg-violet-50 text-violet-700 border-violet-200",
    pm: "bg-amber-50 text-amber-700 border-amber-200",
    engineer: "bg-sky-50 text-sky-700 border-sky-200",
    lead: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const labels = {
    designer: "Designer",
    pm: "PM",
    engineer: "Engineer",
    lead: "Design Lead",
  };
  return (
    <span className={`badge border ${config[role] || config.designer}`}>
      {labels[role] || role}
    </span>
  );
}
