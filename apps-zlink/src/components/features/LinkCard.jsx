import React, { useState } from "react";
import { format } from "date-fns";
import {
  ExternalLink,
  Copy,
  Eye,
  MoreHorizontal,
  Trash2,
  GitBranch,
} from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { getUserById, getFeatureById } from "../../data/mockData";
import { StatusBadge } from "../ui/Badge";
import { Avatar, AvatarStack } from "../ui/Avatar";

export function LinkCard({ link }) {
  const { previewLink, copyLink, deleteLink } = useApp();
  const [showMenu, setShowMenu] = useState(false);
  const designer = getUserById(link.designerId);
  const feature = getFeatureById(link.featureId);

  const sharedUsers = (link.sharedWith || [])
    .map(getUserById)
    .filter(Boolean);

  return (
    <div className="link-card group">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {feature && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${feature.color}`}
            >
              {feature.name}
            </span>
          )}
          <StatusBadge status={link.status} size="xs" />
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 w-40 bg-white rounded-xl border border-gray-200 shadow-xl z-10 py-1 animate-slide-up">
              <button
                onClick={() => { previewLink(link); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
              <button
                onClick={() => { copyLink(link.url); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
              >
                <Copy className="w-3.5 h-3.5" /> Copy link
              </button>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                onClick={() => setShowMenu(false)}
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in Figma
              </a>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => { deleteLink(link.id); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Iteration badge */}
      <div className="flex items-center gap-1.5 mb-2">
        <GitBranch className="w-3 h-3 text-gray-300" />
        <span className="text-[10px] text-gray-400 font-medium">
          Iteration {link.iterationNumber}
        </span>
      </div>

      {/* Title + description */}
      <button
        onClick={() => previewLink(link)}
        className="text-left w-full"
      >
        <h3 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {link.title}
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
          {link.description}
        </p>
      </button>

      {/* Tags */}
      {link.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {link.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded-full border border-gray-100"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-2">
          <Avatar user={designer} size="xs" />
          <span className="text-[10px] text-gray-500">{designer?.name}</span>
        </div>
        <div className="flex items-center gap-3">
          {sharedUsers.length > 0 && (
            <AvatarStack users={sharedUsers} size="xs" />
          )}
          <span className="text-[10px] text-gray-400">
            {format(new Date(link.publishedAt), "d MMM")}
          </span>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => copyLink(link.url)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy link"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => previewLink(link)}
              className="text-gray-400 hover:text-indigo-500 transition-colors"
              title="Preview"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Open in Figma"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
