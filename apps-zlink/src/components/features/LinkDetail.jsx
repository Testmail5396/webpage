import React from "react";
import { format } from "date-fns";
import {
  ExternalLink,
  Copy,
  Eye,
  Trash2,
  Pencil,
  Calendar,
  Users,
  GitBranch,
  Link2,
} from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { getUserById, getFeatureById, statusConfig } from "../../data/mockData";
import { Avatar, AvatarStack } from "../ui/Avatar";

export function LinkDetail({ link, onEdit, onDeleted }) {
  const { copyLink, previewLink, deleteLink, myPermission, getUserPermission } = useApp();

  if (!link) return null;

  const designer = getUserById(link.designerId);
  const feature = getFeatureById(link.featureId);
  const sharedUsers = (link.sharedWith || []).map(getUserById).filter(Boolean);
  const status = statusConfig[link.status] || statusConfig.draft;

  const designerPerm = getUserPermission(link.designerId);
  const canEdit = myPermission.canEdit || designerPerm.canEdit;
  const canDelete = myPermission.canDelete || designerPerm.canDelete;

  const handleDelete = () => {
    if (window.confirm("Delete this link?")) {
      deleteLink(link.id);
      onDeleted?.();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            {feature && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${feature.color}`}>
                {feature.name}
              </span>
            )}
            <span className={`badge text-[10px] ${status.className}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-1">
          <GitBranch className="w-3 h-3 text-gray-400" />
          <span className="text-[10px] text-gray-400">Iteration {link.iterationNumber}</span>
        </div>

        <h2 className="text-sm font-semibold text-gray-900 leading-snug">{link.title}</h2>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Description */}
        {link.description && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Description</p>
            <p className="text-xs text-gray-600 leading-relaxed">{link.description}</p>
          </div>
        )}

        {/* URL */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Link</p>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <Link2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <p className="text-[10px] text-gray-500 truncate flex-1">{link.url}</p>
            <button
              onClick={() => copyLink(link.url)}
              className="text-gray-400 hover:text-indigo-500 transition-colors flex-shrink-0"
              title="Copy link"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-3">
          {/* Designer */}
          <div className="flex items-center gap-3">
            <Avatar user={designer} size="sm" />
            <div>
              <p className="text-xs font-medium text-gray-800">{designer?.name}</p>
              <p className="text-[10px] text-gray-400">{designer?.title}</p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px]">{format(new Date(link.publishedAt), "dd MMM yyyy, h:mm a")}</span>
          </div>

          {/* Shared with */}
          {sharedUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <AvatarStack users={sharedUsers} size="xs" />
              <span className="text-[10px] text-gray-400 truncate">
                {sharedUsers.map((u) => u.name).join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-4 border-t border-gray-100 space-y-2">
        {/* Primary: Preview + Open */}
        <div className="flex gap-2">
          <button
            onClick={() => previewLink(link)}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open
          </a>
        </div>

        {/* Secondary: Edit + Delete */}
        {(canEdit || canDelete) && (
          <div className="flex gap-2">
            {canEdit && (
              <button
                onClick={() => onEdit?.(link)}
                className="flex-1 flex items-center justify-center gap-2 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg text-xs transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-2 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          </div>
        )}

        {/* Copy */}
        <button
          onClick={() => copyLink(link.url)}
          className="w-full flex items-center justify-center gap-2 py-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy link
        </button>
      </div>
    </div>
  );
}
