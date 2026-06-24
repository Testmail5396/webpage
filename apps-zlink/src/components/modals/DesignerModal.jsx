import React, { useState, useRef } from "react";
import { Modal } from "../ui/Modal";
import { useApp } from "../../contexts/AppContext";
import { Camera } from "lucide-react";

function initials(name) {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export function DesignerModal({ mode, designer, onClose }) {
  const { addDesigner, updateDesigner } = useApp();
  const [form, setForm] = useState({
    name: designer?.name || "",
    email: designer?.email || "",
    role: designer?.role || "",
    profileImage: designer?.profileImage || null,
  });
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const isEdit = mode === "edit";

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setForm(f => ({ ...f, profileImage: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (isEdit) {
      updateDesigner(designer.id, form);
    } else {
      addDesigner(form);
    }
    onClose();
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Edit Designer" : "Add Designer"}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary">{isEdit ? "Save Changes" : "Add Designer"}</button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Profile image upload */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="relative w-14 h-14 rounded-2xl cursor-pointer group overflow-hidden flex-shrink-0"
          >
            {form.profileImage ? (
              <img src={form.profileImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full ${designer?.avatarColor || "bg-violet-500"} flex items-center justify-center text-white text-base font-bold`}>
                {initials(form.name || "?")}
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[#1D1D1F]">Profile Photo</p>
            <p className="text-[11px] text-[#86868B] mt-0.5">Click to upload · Max 2MB</p>
            {form.profileImage && (
              <button
                onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, profileImage: null })); }}
                className="text-[11px] text-red-500 hover:text-red-600 font-medium mt-1 transition-colors"
              >
                Remove photo
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>

        <div className="border-t border-[#E5E5EA]" />

        <div>
          <label className="label">Name *</label>
          <input
            className="input-field"
            placeholder="e.g. Vikash M"
            value={form.name}
            onChange={set("name")}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
          {error && <p className="text-[11px] text-red-500 mt-1.5 font-medium">{error}</p>}
        </div>
        <div>
          <label className="label">Email <span className="text-[#AEAEB2] font-normal normal-case tracking-normal">(optional)</span></label>
          <input className="input-field" type="email" placeholder="e.g. vikash@company.com" value={form.email} onChange={set("email")} />
        </div>
        <div>
          <label className="label">Role <span className="text-[#AEAEB2] font-normal normal-case tracking-normal">(optional)</span></label>
          <input className="input-field" placeholder="e.g. Senior Visual Designer" value={form.role} onChange={set("role")} />
        </div>
      </div>
    </Modal>
  );
}
