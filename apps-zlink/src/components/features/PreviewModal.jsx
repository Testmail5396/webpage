import React from "react";
import { format } from "date-fns";
import { ExternalLink, Copy, GitBranch, Calendar, Users, AlertCircle } from "lucide-react";
import { Modal } from "../ui/Modal";
import { StatusBadge } from "../ui/Badge";
import { Avatar, AvatarStack } from "../ui/Avatar";
import { useApp } from "../../contexts/AppContext";
import { getUserById, getFeatureById } from "../../data/mockData";

export function PreviewModal({ open, onClose, link }) {
  const { copyLink } = useApp();

  if (!link) return null;

  const designer = getUserById(link.designerId);
  const feature = getFeatureById(link.featureId);
  const sharedUsers = (link.sharedWith || []).map(getUserById).filter(Boolean);

  return (
    <Modal open={open} onClose={onClose} title="Preview" size="2xl">
      <div className="flex flex-col lg:flex-row gap-5">

        {/* Embed Area */}
        <div className="flex-1 min-h-[300px] lg:min-h-[480px]">
          <div className="w-full h-full min-h-[300px] bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            {/* Browser bar */}
            <div className="bg-gray-100 px-3 py-2 flex items-center gap-2 border-b border-gray-200 flex-shrink-0">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 bg-white rounded px-2 py-0.5 text-[10px] text-gray-400 truncate border border-gray-200">
                {link.url}
              </div>
            </div>
            {/* Preview body */}
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-indigo-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600 mb-1">Figma requires sign-in to embed</p>
                <p className="text-xs text-gray-400">Open the link directly to view the interactive prototype.</p>
              </div>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in Figma
              </a>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="lg:w-64 flex-shrink-0 space-y-4">
          {/* Feature + Status */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {feature && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${feature.color}`}>
                  {feature.name}
                </span>
              )}
              <StatusBadge status={link.status} />
            </div>
            <div className="flex items-center gap-1 mb-1">
              <GitBranch className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-400">Iteration {link.iterationNumber}</span>
            </div>
            <h2 className="text-sm font-semibold text-gray-900">{link.title}</h2>
            {link.description && (
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">{link.description}</p>
            )}
          </div>

          {/* Meta */}
          <div className="space-y-2.5 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Avatar user={designer} size="sm" />
              <div>
                <p className="text-xs font-medium text-gray-800">{designer?.name}</p>
                <p className="text-[10px] text-gray-400">{designer?.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-[11px]">{format(new Date(link.publishedAt), "dd MMM yyyy, h:mm a")}</span>
            </div>
            {sharedUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <AvatarStack users={sharedUsers} size="xs" />
                <span className="text-[10px] text-gray-400 truncate">{sharedUsers.map((u) => u.name).join(", ")}</span>
              </div>
            )}
          </div>

          {/* URL */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Link</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
              <p className="text-[10px] text-gray-500 truncate flex-1">{link.url}</p>
              <button onClick={() => copyLink(link.url)} className="text-gray-400 hover:text-indigo-500 flex-shrink-0">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Open
            </a>
            <button
              onClick={() => copyLink(link.url)}
              className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50 transition-colors"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
