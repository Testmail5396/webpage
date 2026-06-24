import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  LayoutGrid,
  List,
} from "lucide-react";
import { Header } from "../components/layout/Header";
import { LinkCard } from "../components/features/LinkCard";
import { LinkTable } from "../components/features/LinkTable";
import { RoleBadge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { EmptyState } from "../components/ui/EmptyState";
import { useApp } from "../contexts/AppContext";
import { users, getFeatureById } from "../data/mockData";

export function DesignerProfile() {
  const { id } = useParams();
  const { links } = useApp();
  const [view, setView] = useState("grid");
  const [selectedFeature, setSelectedFeature] = useState("");

  const user = users.find((u) => u.id === id);
  if (!user) {
    return (
      <div className="p-6">
        <Link to="/designers" className="btn-ghost text-sm mb-4 inline-flex">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="bg-white rounded-xl border border-gray-100">
          <EmptyState title="Designer not found" description="This profile doesn't exist." />
        </div>
      </div>
    );
  }

  const userLinks = links.filter((l) => l.designerId === id);
  const featureIds = [...new Set(userLinks.map((l) => l.featureId))];
  const userFeatures = featureIds.map(getFeatureById).filter(Boolean);

  const filtered = selectedFeature
    ? userLinks.filter((l) => l.featureId === selectedFeature)
    : userLinks;

  const finalCount = userLinks.filter((l) => l.status === "final").length;
  const reviewCount = userLinks.filter((l) => l.status === "review").length;
  const draftCount = userLinks.filter((l) => l.status === "draft").length;

  return (
    <div className="page-enter">
      <Header
        title={user.name}
        subtitle={user.title}
        actions={
          <Link to="/designers" className="btn-ghost text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
            All Designers
          </Link>
        }
      />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <Avatar user={user} size="2xl" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
                <RoleBadge role={user.role} />
              </div>
              <p className="text-sm text-gray-500 mb-2">{user.title}</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Links", value: userLinks.length, color: "text-indigo-600 bg-indigo-50" },
                  { label: "Final", value: finalCount, color: "text-emerald-600 bg-emerald-50" },
                  { label: "In Review", value: reviewCount, color: "text-blue-600 bg-blue-50" },
                  { label: "Draft", value: draftCount, color: "text-amber-600 bg-amber-50" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl p-3 ${s.color.split(" ")[1]}`}>
                    <div className={`text-xl font-bold ${s.color.split(" ")[0]}`}>{s.value}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features worked on */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Features</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFeature("")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                !selectedFeature
                  ? "bg-indigo-600 text-white border-transparent"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              All ({userLinks.length})
            </button>
            {userFeatures.map((feature) => {
              const count = userLinks.filter(
                (l) => l.featureId === feature.id
              ).length;
              return (
                <button
                  key={feature.id}
                  onClick={() => setSelectedFeature(feature.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    selectedFeature === feature.id
                      ? "bg-indigo-600 text-white border-transparent"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${feature.color}`} />
                  {feature.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Links */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">
              {selectedFeature
                ? getFeatureById(selectedFeature)?.name
                : "All Links"}{" "}
              <span className="text-gray-400 font-normal">
                ({filtered.length})
              </span>
            </h2>
            <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setView("grid")}
                className={`px-2.5 py-1.5 ${view === "grid" ? "bg-indigo-50 text-indigo-600" : "text-gray-400"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`px-2.5 py-1.5 ${view === "list" ? "bg-indigo-50 text-indigo-600" : "text-gray-400"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100">
              <EmptyState
                type="links"
                title="No links yet"
                description="This designer hasn't added any links to this feature yet."
              />
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((link) => (
                <LinkCard key={link.id} link={link} />
              ))}
            </div>
          ) : (
            <LinkTable links={filtered} />
          )}
        </div>
      </div>
    </div>
  );
}
