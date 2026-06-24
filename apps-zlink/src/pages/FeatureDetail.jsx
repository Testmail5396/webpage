import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Link2,
  GitBranch,
  Users,
  Calendar,
  Plus,
  LayoutGrid,
  List,
  Clock,
} from "lucide-react";
import { Header } from "../components/layout/Header";
import { LinkCard } from "../components/features/LinkCard";
import { LinkTable } from "../components/features/LinkTable";
import { StatusBadge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { EmptyState } from "../components/ui/EmptyState";
import { useApp } from "../contexts/AppContext";
import { getUserById } from "../data/mockData";

export function FeatureDetail() {
  const { id } = useParams();
  const { features, links, setShowAddLinkModal } = useApp();
  const [view, setView] = useState("grid");
  const [statusFilter, setStatusFilter] = useState("");

  const feature = features.find((f) => f.id === id);
  if (!feature) {
    return (
      <div className="p-6">
        <Link to="/features" className="btn-ghost text-sm mb-4 inline-flex">
          <ArrowLeft className="w-4 h-4" /> Back to Features
        </Link>
        <div className="bg-white rounded-xl border border-gray-100">
          <EmptyState title="Feature not found" description="This feature may have been deleted." />
        </div>
      </div>
    );
  }

  const featureLinks = links
    .filter((l) => l.featureId === id)
    .filter((l) => !statusFilter || l.status === statusFilter)
    .sort((a, b) => a.iterationNumber - b.iterationNumber);

  const allFeatureLinks = links.filter((l) => l.featureId === id);
  const owner = getUserById(feature.ownerId);
  const maxIteration = Math.max(...allFeatureLinks.map((l) => l.iterationNumber), 0);

  // Group by iteration
  const byIteration = allFeatureLinks.reduce((acc, link) => {
    const key = link.iterationNumber;
    if (!acc[key]) acc[key] = [];
    acc[key].push(link);
    return acc;
  }, {});

  // Unique designers
  const designerIds = [...new Set(allFeatureLinks.map((l) => l.designerId))];
  const designers = designerIds.map(getUserById).filter(Boolean);

  return (
    <div className="page-enter">
      <Header
        title={feature.name}
        subtitle={`${allFeatureLinks.length} design links · ${maxIteration} iterations`}
        actions={
          <Link to="/features" className="btn-ghost text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
        }
      />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Feature Hero */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div
              className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm`}
            >
              <GitBranch className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-xl font-bold text-gray-900">{feature.name}</h1>
                <StatusBadge status={feature.status} />
              </div>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                {feature.description}
              </p>
              {/* Tags */}
              {feature.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {feature.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-5 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <Avatar user={owner} size="xs" />
                  <span>Owned by <span className="font-medium text-gray-700">{owner?.name}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>{allFeatureLinks.length} links</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>{maxIteration} iterations</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <div className="flex items-center gap-1">
                    {designers.map((d) => (
                      <Avatar key={d.id} user={d} size="xs" />
                    ))}
                    <span>{designers.length} designer{designers.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Updated {format(new Date(feature.updatedAt), "d MMM yyyy")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Iteration Timeline (mini) */}
        {maxIteration > 1 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-800">Iteration Timeline</h2>
            </div>
            <div className="flex items-center gap-0 overflow-x-auto pb-2">
              {Object.keys(byIteration)
                .sort((a, b) => Number(a) - Number(b))
                .map((iterNum, idx, arr) => {
                  const iterLinks = byIteration[iterNum];
                  const latestStatus = iterLinks.sort(
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                  )[0]?.status;
                  const dotColor =
                    latestStatus === "final"
                      ? "bg-emerald-500"
                      : latestStatus === "review"
                      ? "bg-blue-500"
                      : "bg-amber-400";
                  return (
                    <div key={iterNum} className="flex items-center gap-0 flex-shrink-0">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 ${dotColor} rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm`}
                        >
                          {iterNum}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1 text-center">
                          {iterLinks.length} link{iterLinks.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      {idx < arr.length - 1 && (
                        <div className="w-10 h-0.5 bg-gray-200 mx-1" />
                      )}
                    </div>
                  );
                })}
              <div className="flex items-center gap-0 flex-shrink-0 ml-1">
                <div className="w-10 h-0.5 bg-dashed bg-gray-100 mx-1" />
                <div className="w-8 h-8 bg-gray-100 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Links section */}
        <div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {["", "draft", "review", "final"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === s
                      ? "bg-indigo-600 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {s === "" ? "All" : s === "draft" ? "Draft" : s === "review" ? "Review" : "Final"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setView("grid")}
                  className={`px-2.5 py-1.5 ${view === "grid" ? "bg-indigo-50 text-indigo-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`px-2.5 py-1.5 ${view === "list" ? "bg-indigo-50 text-indigo-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setShowAddLinkModal(true)}
                className="btn-primary text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Link
              </button>
            </div>
          </div>

          {featureLinks.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100">
              <EmptyState
                type="links"
                title="No links match your filter"
                description="Try a different status filter, or add a new design link to this feature."
                action="Add Design Link"
                onAction={() => setShowAddLinkModal(true)}
              />
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {featureLinks.map((link) => (
                <LinkCard key={link.id} link={link} />
              ))}
            </div>
          ) : (
            <LinkTable links={featureLinks} />
          )}
        </div>
      </div>
    </div>
  );
}
