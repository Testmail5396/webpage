import React from "react";
import { format } from "date-fns";
import { ExternalLink, Copy, Eye, GitBranch, ArrowUpDown } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { getUserById, getFeatureById } from "../../data/mockData";
import { StatusBadge } from "../ui/Badge";
import { Avatar, AvatarStack } from "../ui/Avatar";

export function LinkTable({ links }) {
  const { previewLink, copyLink } = useApp();

  if (!links.length) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {["Title", "Feature", "Designer", "Status", "Shared With", "Date", ""].map(
              (col) => (
                <th
                  key={col}
                  className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    {col}
                    {col && col !== "" && col !== "Shared With" && col !== "Status" && (
                      <ArrowUpDown className="w-3 h-3 opacity-0 hover:opacity-100" />
                    )}
                  </div>
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {links.map((link) => {
            const designer = getUserById(link.designerId);
            const feature = getFeatureById(link.featureId);
            const sharedUsers = (link.sharedWith || [])
              .map(getUserById)
              .filter(Boolean);

            return (
              <tr
                key={link.id}
                className="hover:bg-gray-50 transition-colors group"
              >
                {/* Title */}
                <td className="px-4 py-3 max-w-xs">
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <GitBranch className="w-3 h-3 text-gray-300 flex-shrink-0" />
                      <span className="text-[10px] text-gray-400">
                        Iter. {link.iterationNumber}
                      </span>
                    </div>
                    <button
                      onClick={() => previewLink(link)}
                      className="text-sm font-medium text-gray-800 hover:text-indigo-600 transition-colors text-left line-clamp-1"
                    >
                      {link.title}
                    </button>
                    <p className="text-[11px] text-gray-400 truncate max-w-[200px]">
                      {link.description}
                    </p>
                  </div>
                </td>

                {/* Feature */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {feature && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${feature.color}`}
                    >
                      {feature.name}
                    </span>
                  )}
                </td>

                {/* Designer */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Avatar user={designer} size="xs" />
                    <span className="text-xs text-gray-600">
                      {designer?.name}
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={link.status} size="xs" />
                </td>

                {/* Shared With */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {sharedUsers.length > 0 ? (
                    <AvatarStack users={sharedUsers} size="xs" />
                  ) : (
                    <span className="text-[11px] text-gray-300">—</span>
                  )}
                </td>

                {/* Date */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs text-gray-400">
                    {format(new Date(link.publishedAt), "d MMM, yy")}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => previewLink(link)}
                      className="btn-ghost py-1 px-2 text-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => copyLink(link.url)}
                      className="btn-ghost py-1 px-2 text-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost py-1 px-2 text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
