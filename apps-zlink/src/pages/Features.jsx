import React, { useState } from "react";
import { Header } from "../components/layout/Header";
import { ColumnNavigator } from "../components/features/ColumnNavigator";
import { LinkDetail } from "../components/features/LinkDetail";
import { useApp } from "../contexts/AppContext";
import { getUserById, statusConfig } from "../data/mockData";

export function Features() {
  const { featureList, getLinksByFeature, setShowAddLinkModal, myPermission } = useApp();

  const [selectedFeature, setSelectedFeature] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);

  // Column 1: Features
  const featureItems = featureList.map((f) => ({
    id: f.id,
    label: f.name,
    color: f.color,
    count: getLinksByFeature(f.id).length,
    _raw: f,
  }));

  // Column 2: Links for selected feature
  const linkItems = selectedFeature
    ? getLinksByFeature(selectedFeature.id).map((l) => {
        const designer = getUserById(l.designerId);
        const cfg = statusConfig[l.status] || statusConfig.draft;
        return {
          id: l.id,
          label: l.title,
          meta: designer ? `${designer.name} · Iter ${l.iterationNumber}` : `Iter ${l.iterationNumber}`,
          statusDot: cfg.dot,
          _raw: l,
        };
      })
    : [];

  const handleSelectFeature = (item) => {
    setSelectedFeature(item._raw);
    setSelectedLink(null);
  };

  const handleSelectLink = (item) => {
    setSelectedLink(item._raw);
  };

  const columns = [
    {
      label: "Features",
      items: featureItems,
      selectedId: selectedFeature?.id ?? null,
      onSelect: handleSelectFeature,
      emptyText: "No features yet",
    },
    {
      label: "Links",
      items: linkItems,
      selectedId: selectedLink?.id ?? null,
      onSelect: handleSelectLink,
      emptyText: selectedFeature ? "No links for this feature" : "Select a feature",
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Features"
        subtitle={
          selectedFeature ? selectedFeature.name : `${featureList.length} features`
        }
        actions={
          myPermission.canAdd && (
            <button onClick={() => setShowAddLinkModal(true)} className="btn-primary text-xs">
              + Add Link
            </button>
          )
        }
      />
      <ColumnNavigator
        columns={columns}
        rightPanel={
          selectedLink ? (
            <LinkDetail
              link={selectedLink}
              onDeleted={() => setSelectedLink(null)}
            />
          ) : null
        }
      />
    </div>
  );
}
