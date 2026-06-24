import React, { useState } from "react";
import { Plus, Link2, X } from "lucide-react";
import { Modal } from "../ui/Modal";
import { useApp } from "../../contexts/AppContext";
import { designers, nonDesigners, currentUser } from "../../data/mockData";

const today = new Date().toISOString().slice(0, 16);

const emptyForm = {
  title: "",
  url: "",
  description: "",
  featureId: "",
  designerId: currentUser.id,
  iterationNumber: 1,
  status: "draft",
  sharedWith: [],
  publishedAt: today,
};

export function AddLinkModal({ open, onClose }) {
  const { featureList, addLink, addFeature } = useApp();
  const [form, setForm] = useState(emptyForm);
  const [newFeatureName, setNewFeatureName] = useState("");
  const [showNewFeature, setShowNewFeature] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Required";
    if (!form.url.trim()) e.url = "Required";
    if (!form.featureId) e.featureId = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    addLink({
      ...form,
      publishedAt: new Date(form.publishedAt),
    });
    setForm(emptyForm);
    setErrors({});
  };

  const handleCreateFeature = () => {
    if (!newFeatureName.trim()) return;
    const newFeat = addFeature({
      name: newFeatureName.trim(),
      description: "",
      color: "bg-indigo-500",
    });
    setForm((f) => ({ ...f, featureId: newFeat.id }));
    setNewFeatureName("");
    setShowNewFeature(false);
  };

  const toggleSharedWith = (userId) => {
    setForm((f) => ({
      ...f,
      sharedWith: f.sharedWith.includes(userId)
        ? f.sharedWith.filter((id) => id !== userId)
        : [...f.sharedWith, userId],
    }));
  };

  const handleClose = () => {
    setForm(emptyForm);
    setErrors({});
    setShowNewFeature(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Design Link"
      size="md"
      footer={
        <>
          <button onClick={handleClose} className="btn-secondary text-xs">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" />
            Add Link
          </button>
        </>
      }
    >
      <div className="space-y-4">

        {/* Designer */}
        <div>
          <label className="label">Designer</label>
          <select
            className="select-field"
            value={form.designerId}
            onChange={(e) => setForm((f) => ({ ...f, designerId: e.target.value }))}
          >
            {designers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Feature */}
        <div>
          <label className="label">Feature *</label>
          {showNewFeature ? (
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                placeholder="Feature name…"
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFeature()}
                autoFocus
              />
              <button onClick={handleCreateFeature} className="btn-primary text-xs px-3">Create</button>
              <button onClick={() => setShowNewFeature(false)} className="btn-secondary text-xs px-2">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                className={`select-field flex-1 ${errors.featureId ? "border-red-300" : ""}`}
                value={form.featureId}
                onChange={(e) => { setForm((f) => ({ ...f, featureId: e.target.value })); setErrors((e2) => ({ ...e2, featureId: "" })); }}
              >
                <option value="">Select feature…</option>
                {featureList.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <button onClick={() => setShowNewFeature(true)} className="btn-secondary text-xs px-3 whitespace-nowrap">
                + New
              </button>
            </div>
          )}
          {errors.featureId && <p className="text-[10px] text-red-500 mt-1">{errors.featureId}</p>}
        </div>

        {/* Iteration name + number */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="label">Iteration Name *</label>
            <input
              className={`input-field ${errors.title ? "border-red-300" : ""}`}
              placeholder="e.g. Translation Iteration 3"
              value={form.title}
              onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setErrors((e2) => ({ ...e2, title: "" })); }}
            />
            {errors.title && <p className="text-[10px] text-red-500 mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="label">Iteration #</label>
            <input
              type="number"
              min="1"
              className="input-field"
              value={form.iterationNumber}
              onChange={(e) => setForm((f) => ({ ...f, iterationNumber: parseInt(e.target.value) || 1 }))}
            />
          </div>
        </div>

        {/* Figma URL */}
        <div>
          <label className="label">Figma / Live URL *</label>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              className={`input-field pl-9 ${errors.url ? "border-red-300" : ""}`}
              placeholder="https://figma.com/proto/…"
              value={form.url}
              onChange={(e) => { setForm((f) => ({ ...f, url: e.target.value })); setErrors((e2) => ({ ...e2, url: "" })); }}
            />
          </div>
          {errors.url && <p className="text-[10px] text-red-500 mt-1">{errors.url}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea
            rows={3}
            className="input-field resize-none"
            placeholder="What does this design cover? What changed?"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        {/* Status */}
        <div>
          <label className="label">Status</label>
          <div className="flex gap-2">
            {[
              { value: "draft", label: "Draft", active: "bg-amber-50 border-amber-300 text-amber-700" },
              { value: "review", label: "In Review", active: "bg-blue-50 border-blue-300 text-blue-700" },
              { value: "final", label: "Final", active: "bg-emerald-50 border-emerald-300 text-emerald-700" },
            ].map((s) => (
              <button
                key={s.value}
                onClick={() => setForm((f) => ({ ...f, status: s.value }))}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  form.status === s.value ? s.active : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Published Date */}
        <div>
          <label className="label">Published Date</label>
          <input
            type="datetime-local"
            className="input-field"
            value={form.publishedAt}
            onChange={(e) => setForm((f) => ({ ...f, publishedAt: e.target.value }))}
          />
        </div>

        {/* Shared With */}
        <div>
          <label className="label">Shared With</label>
          <div className="flex flex-wrap gap-2">
            {nonDesigners.map((user) => (
              <button
                key={user.id}
                onClick={() => toggleSharedWith(user.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                  form.sharedWith.includes(user.id)
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                <span className={`w-4 h-4 ${user.avatarColor} rounded-full flex items-center justify-center text-white text-[8px] font-semibold`}>
                  {user.avatar}
                </span>
                {user.name}
                {form.sharedWith.includes(user.id) && <span className="text-indigo-400 text-[10px]">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
