import React, { useState, useMemo, useRef, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { useApp } from "../../contexts/AppContext";
import { ChevronDown, Check, X, Users, Tag, Plus } from "lucide-react";

/* Build a flat folder list sorted by full path for dropdown display */
function buildFolderOptions(allFolders, designerId) {
  const designerFolders = allFolders.filter(f => f.designerId === designerId);

  const getPath = (folderId) => {
    const parts = [];
    let cur = designerFolders.find(f => f.id === folderId);
    while (cur) {
      parts.unshift(cur.name);
      cur = cur.parentFolderId ? designerFolders.find(f => f.id === cur.parentFolderId) : null;
    }
    return parts.join(" / ");
  };

  return designerFolders
    .map(f => ({ id: f.id, path: getPath(f.id) }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/* ── Multi-select dropdown for sharing ── */
function ShareDropdown({ designers, selected, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(o => !o);
  };

  const selectedDesigners = selected
    .map(id => designers.find(d => d.id === id))
    .filter(Boolean);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all duration-150 ${
          open
            ? "border-[#007AFF] ring-2 ring-[#007AFF]/12 bg-white"
            : "border-[#D1D1D6] bg-[#F5F5F7] hover:bg-white hover:border-[#C7C7CC]"
        }`}
      >
        <Users className="w-3.5 h-3.5 text-[#AEAEB2] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {selectedDesigners.length === 0 ? (
            <span className="text-[12px] text-[#AEAEB2]">Select people to share with…</span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              {selectedDesigners.map(d => (
                <span
                  key={d.id}
                  className="inline-flex items-center gap-1 bg-[#007AFF]/10 text-[#007AFF] px-2 py-0.5 rounded-md text-[11px] font-medium"
                >
                  {d.name.split(" ")[0]}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggle(d.id); }}
                    className="hover:bg-[#007AFF]/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#AEAEB2] flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          className="fixed bg-white rounded-lg border border-[#D1D1D6] shadow-lg py-1 max-h-[200px] overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
        >
          {designers.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-[#86868B] text-center">No other designers</p>
          ) : (
            designers.map(d => {
              const isActive = selected.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onToggle(d.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    isActive ? "bg-[#007AFF]/[0.04]" : "hover:bg-[#F5F5F7]"
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-[16px] h-[16px] rounded flex items-center justify-center flex-shrink-0 border transition-all ${
                    isActive
                      ? "bg-[#007AFF] border-[#007AFF]"
                      : "border-[#C7C7CC]"
                  }`}>
                    {isActive && (
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    )}
                  </div>

                  {/* Avatar */}
                  {d.profileImage ? (
                    <img src={d.profileImage} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className={`w-5 h-5 ${d.avatarColor} rounded-full flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0`}>
                      {d.avatar}
                    </div>
                  )}

                  {/* Name + role */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] font-medium text-[#1D1D1F]">{d.name}</span>
                  </div>
                  <span className="text-[10px] text-[#AEAEB2] flex-shrink-0">{d.role || "Designer"}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ── Multi-select module dropdown with custom add ── */
function ModuleDropdown({ allModules, selected, onToggle, onAddModule }) {
  const [open, setOpen] = useState(false);
  const [newModule, setNewModule] = useState("");
  const [addError, setAddError] = useState("");
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(o => !o);
  };

  const MODULE_COLORS = [
    "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
    "bg-violet-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500",
  ];

  const getColor = (name) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return MODULE_COLORS[Math.abs(h) % MODULE_COLORS.length];
  };

  const handleAdd = () => {
    setAddError("");
    const trimmed = newModule.trim();
    if (!trimmed) return;
    if (allModules.some(m => m.toLowerCase() === trimmed.toLowerCase())) {
      setAddError("Module already exists");
      return;
    }
    const ok = onAddModule(trimmed);
    if (ok) {
      onToggle(trimmed); // auto-select the new module
      setNewModule("");
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all duration-150 ${
          open
            ? "border-[#007AFF] ring-2 ring-[#007AFF]/12 bg-white"
            : "border-[#D1D1D6] bg-[#F5F5F7] hover:bg-white hover:border-[#C7C7CC]"
        }`}
      >
        <Tag className="w-3.5 h-3.5 text-[#AEAEB2] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {selected.length === 0 ? (
            <span className="text-[12px] text-[#AEAEB2]">Select modules...</span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              {selected.map(name => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 bg-[#F2F2F7] text-[#1D1D1F] px-2 py-0.5 rounded-md text-[11px] font-medium"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${getColor(name)} flex-shrink-0`} />
                  {name}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggle(name); }}
                    className="hover:bg-[#E5E5EA] rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-2.5 h-2.5 text-[#86868B]" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#AEAEB2] flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="fixed bg-white rounded-lg border border-[#D1D1D6] shadow-lg overflow-hidden"
          style={{ top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
        >
          <div className="max-h-[180px] overflow-y-auto py-1">
            {allModules.map(name => {
              const isActive = selected.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onToggle(name)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    isActive ? "bg-[#007AFF]/[0.04]" : "hover:bg-[#F5F5F7]"
                  }`}
                >
                  <div className={`w-[16px] h-[16px] rounded flex items-center justify-center flex-shrink-0 border transition-all ${
                    isActive ? "bg-[#007AFF] border-[#007AFF]" : "border-[#C7C7CC]"
                  }`}>
                    {isActive && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </div>
                  <span className={`w-2 h-2 rounded-full ${getColor(name)} flex-shrink-0`} />
                  <span className="text-[12px] font-medium text-[#1D1D1F]">{name}</span>
                </button>
              );
            })}
          </div>

          {/* Add new module */}
          <div className="border-t border-[#E5E5EA] px-3 py-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newModule}
                onChange={(e) => { setNewModule(e.target.value); setAddError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Add new module..."
                className="flex-1 text-[12px] bg-[#F5F5F7] border border-[#D1D1D6] rounded-md px-2.5 py-1.5 text-[#1D1D1F] placeholder-[#AEAEB2] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]/12"
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newModule.trim()}
                className="p-1.5 rounded-md bg-[#007AFF] text-white disabled:opacity-40 hover:bg-[#0066D6] transition-all flex-shrink-0"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            {addError && <p className="text-[10px] text-red-500 mt-1 font-medium">{addError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function LinkModal({ mode, link, designerId, folderId, onClose }) {
  const { designers, folders, modules, addLink, updateLink, addModule } = useApp();
  const isEdit = mode === "edit";

  // For add mode, designerId is always passed from the tree explorer (the selected designer)
  // For edit mode, use the link's existing designerId
  const ownerDesignerId = isEdit ? link.designerId : (designerId || designers[0]?.id || "");

  const [form, setForm] = useState({
    designerId:  ownerDesignerId,
    folderId:    link?.folderId    || folderId    || "",
    title:       link?.title       || "",
    url:         link?.url         || "",
    description: link?.description || "",
    sharedWith:  link?.sharedWith  || [],
    modules:     link?.modules     || [],
  });
  const [errors, setErrors] = useState({});

  const folderOptions = useMemo(
    () => buildFolderOptions(folders, form.designerId),
    [folders, form.designerId]
  );

  const hasFolders = folderOptions.length > 0;

  // Designers to share with (exclude the link's owner)
  const shareableDesigners = designers.filter(d => d.id !== form.designerId);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const toggleModule = (name) => {
    setForm(f => ({
      ...f,
      modules: f.modules.includes(name)
        ? f.modules.filter(m => m !== name)
        : [...f.modules, name],
    }));
  };

  const toggleShare = (dId) => {
    setForm(f => ({
      ...f,
      sharedWith: f.sharedWith.includes(dId)
        ? f.sharedWith.filter(id => id !== dId)
        : [...f.sharedWith, dId],
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.url.trim()) e.url = "URL is required";
    if (form.modules.length === 0) e.modules = "At least one module is required";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (isEdit) {
      updateLink(link.id, form);
    } else {
      addLink(form);
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? "Edit Link" : "Add Link"} size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary">{isEdit ? "Save Changes" : "Add Link"}</button>
        </>
      }
    >
      <div className="space-y-4">
        {/* 1. Title */}
        <div>
          <label className="label">Title *</label>
          <input className="input-field" placeholder="e.g. Dashboard v2" value={form.title} onChange={set("title")} autoFocus />
          {errors.title && <p className="text-[11px] text-red-500 mt-1.5 font-medium">{errors.title}</p>}
        </div>

        {/* 2. URL */}
        <div>
          <label className="label">URL *</label>
          <input className="input-field" type="url" placeholder="https://figma.com/proto/..." value={form.url} onChange={set("url")} />
          {errors.url && <p className="text-[11px] text-red-500 mt-1.5 font-medium">{errors.url}</p>}
        </div>

        {/* 3. Description */}
        <div>
          <label className="label">Description <span className="text-[#AEAEB2] font-normal normal-case tracking-normal">(optional)</span></label>
          <textarea className="input-field resize-none" rows={2} placeholder="Brief description…" value={form.description} onChange={set("description")} />
        </div>

        {/* 4. Modules — multi-select with add new */}
        <div>
          <label className="label">Modules *</label>
          <ModuleDropdown
            allModules={modules}
            selected={form.modules}
            onToggle={toggleModule}
            onAddModule={addModule}
          />
          {errors.modules && <p className="text-[11px] text-red-500 mt-1.5 font-medium">{errors.modules}</p>}
        </div>

        {/* 5. Folder — only shown if designer has folders */}
        {hasFolders && (
          <div>
            <label className="label">Folder <span className="text-[#AEAEB2] font-normal normal-case tracking-normal">(optional)</span></label>
            <select className="input-field" value={form.folderId} onChange={set("folderId")}>
              <option value="">No folder (root level)</option>
              {folderOptions.map(fo => (
                <option key={fo.id} value={fo.id}>{fo.path}</option>
              ))}
            </select>
          </div>
        )}

        {/* 5. Share with — multiselect dropdown */}
        {shareableDesigners.length > 0 && (
          <div>
            <label className="label">Share with <span className="text-[#AEAEB2] font-normal normal-case tracking-normal">(optional)</span></label>
            <ShareDropdown
              designers={shareableDesigners}
              selected={form.sharedWith}
              onToggle={toggleShare}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
