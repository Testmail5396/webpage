import React, { useState } from "react";
import { UsersRound, Link2, Plus, Crown, UserPlus } from "lucide-react";
import { Header } from "../components/layout/Header";
import { Avatar } from "../components/ui/Avatar";
import { useApp } from "../contexts/AppContext";
import { users, getUserById } from "../data/mockData";

function TeamCard({ team, memberUsers, linksCount }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 ${team.color} rounded-xl flex items-center justify-center shadow-sm`}>
          <UsersRound className="w-5 h-5 text-white" />
        </div>
        <span className="text-xs text-gray-400">{linksCount} links</span>
      </div>

      <h3 className="text-sm font-bold text-gray-900 mb-1">{team.name}</h3>
      <p className="text-xs text-gray-400 mb-4 leading-relaxed">
        {team.description}
      </p>

      {/* Members */}
      <div className="mb-4">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Members
        </div>
        <div className="space-y-2">
          {memberUsers.map((user, i) => (
            <div key={user.id} className="flex items-center gap-2">
              <Avatar user={user} size="xs" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-gray-700 truncate block">
                  {user.name}
                </span>
                <span className="text-[10px] text-gray-400">{user.title}</span>
              </div>
              {i === 0 && (
                <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-50">
        <button className="btn-ghost text-xs flex-1 justify-center py-1.5">
          <UserPlus className="w-3.5 h-3.5" />
          Invite
        </button>
        <button className="btn-ghost text-xs flex-1 justify-center py-1.5">
          <Link2 className="w-3.5 h-3.5" />
          Links
        </button>
      </div>
    </div>
  );
}

export function Teams() {
  const { teams, links } = useApp();
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="page-enter">
      <Header
        title="Teams"
        subtitle={`${teams.length} workspace teams`}
        actions={
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="btn-secondary text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Team
          </button>
        }
      />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Teams grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => {
            const memberUsers = team.memberIds
              .map(getUserById)
              .filter(Boolean);
            const teamLinks = links.filter((l) => l.teamId === team.id);
            return (
              <TeamCard
                key={team.id}
                team={team}
                memberUsers={memberUsers}
                linksCount={teamLinks.length}
              />
            );
          })}

          {/* Create team card */}
          <button className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all duration-200 group min-h-[200px]">
            <div className="w-10 h-10 bg-gray-100 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            </div>
            <div className="text-sm font-medium text-gray-400 group-hover:text-indigo-600 transition-colors">
              Create Team
            </div>
          </button>
        </div>

        {/* All members */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-800">All Members</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {users.map((user) => {
              const userTeam = teams.find((t) => t.id === user.teamId);
              return (
                <div key={user.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <Avatar user={user} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{user.name}</span>
                      {user.id === "u1" && (
                        <Crown className="w-3 h-3 text-amber-400" />
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{user.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {userTeam && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${userTeam.color}`}>
                        {userTeam.name}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${
                      user.role === "designer" ? "bg-violet-50 text-violet-700 border-violet-200" :
                      user.role === "pm" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-sky-50 text-sky-700 border-sky-200"
                    }`}>
                      {user.role}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:block">{user.email}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
