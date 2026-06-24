import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Link2, Layers, Eye, Pencil, Plus } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { getUserById } from "../../data/mockData";
import { Avatar } from "../ui/Avatar";

const typeConfig = {
  link_added: { icon: Plus, color: "text-emerald-500 bg-emerald-50" },
  status_changed: { icon: Pencil, color: "text-amber-500 bg-amber-50" },
  link_viewed: { icon: Eye, color: "text-sky-500 bg-sky-50" },
  feature_created: { icon: Layers, color: "text-indigo-500 bg-indigo-50" },
  link_shared: { icon: Link2, color: "text-violet-500 bg-violet-50" },
};

export function ActivityFeed({ limit = 10 }) {
  const { activities } = useApp();
  const shown = activities.slice(0, limit);

  return (
    <div className="space-y-1">
      {shown.map((activity) => {
        const user = getUserById(activity.userId);
        const config = typeConfig[activity.type] || typeConfig.link_added;
        const Icon = config.icon;

        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="flex-shrink-0 relative">
              <Avatar user={user} size="sm" />
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${config.color}`}
              >
                <Icon className="w-2.5 h-2.5" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700 leading-relaxed">
                <span className="font-medium text-gray-900">{user?.name}</span>{" "}
                {activity.message
                  .replace(user?.name || "", "")
                  .trim()
                  .replace(/^[A-Z]/, (c) => c.toLowerCase())}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
