import React from "react";
import { Shield, Check } from "lucide-react";
import { Header } from "../components/layout/Header";
import { useApp } from "../contexts/AppContext";
import { designers } from "../data/mockData";

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
        checked ? "bg-indigo-500" : "bg-gray-200"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function Permissions() {
  const { permissions, updatePermission } = useApp();

  const getPermission = (userId) =>
    permissions.find((p) => p.userId === userId) || {
      canAdd: false, canEdit: false, canDelete: false,
    };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header
        title="Permissions"
        subtitle="Control what each designer can do"
      />

      <div className="p-5 max-w-3xl">
        {/* Info banner */}
        <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-6">
          <Shield className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-indigo-800">Admin-only setting</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Only team admins can change permissions. Designers with no permissions enabled are View Only.
            </p>
          </div>
        </div>

        {/* Permission Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_120px_120px] px-5 py-3 bg-gray-50 border-b border-gray-100">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Designer</div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">Add Link</div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">Edit Link</div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">Delete Link</div>
          </div>

          {designers.map((designer, idx) => {
            const perm = getPermission(designer.id);
            const isViewOnly = !perm.canAdd && !perm.canEdit && !perm.canDelete;

            return (
              <div
                key={designer.id}
                className={`grid grid-cols-[1fr_120px_120px_120px] px-5 py-4 items-center ${
                  idx < designers.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                {/* Designer info */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 ${designer.avatarColor} rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}
                  >
                    {designer.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{designer.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-gray-400">{designer.title}</p>
                      {isViewOnly && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                          View only
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Link */}
                <div className="flex justify-center">
                  <Toggle
                    checked={perm.canAdd}
                    onChange={(val) => updatePermission(designer.id, "canAdd", val)}
                  />
                </div>

                {/* Edit Link */}
                <div className="flex justify-center">
                  <Toggle
                    checked={perm.canEdit}
                    onChange={(val) => updatePermission(designer.id, "canEdit", val)}
                  />
                </div>

                {/* Delete Link */}
                <div className="flex justify-center">
                  <Toggle
                    checked={perm.canDelete}
                    onChange={(val) => updatePermission(designer.id, "canDelete", val)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-5 space-y-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Permission Levels</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: "Add Link", desc: "Can add new design links to any feature" },
              { label: "Edit Link", desc: "Can edit title, URL, description, status of any link" },
              { label: "Delete Link", desc: "Can permanently delete links" },
              { label: "View Only", desc: "All toggles off — can only view and preview links" },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-start gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5">
                <div className="w-4 h-4 bg-indigo-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700">{label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PM / Engineer note */}
        <div className="mt-4 bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
          <p className="text-xs font-medium text-gray-700 mb-1">PMs &amp; Engineers</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            PMs and Engineers always have View Only access. They can preview links and copy URLs but cannot add, edit, or delete design links.
          </p>
        </div>
      </div>
    </div>
  );
}
