import React, { useState } from "react";
import { useApp } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { Save } from "lucide-react";

export function Settings() {
  const { currentUser, updateDesigner, showNotification } = useApp();
  const { updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: currentUser.name,
    email: currentUser.email,
    role: currentUser.role,
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    // Update user record in AuthContext
    updateProfile({ name: form.name, role: form.role });
    // Update designer profile in AppContext (updates sidebar role + avatar initials)
    updateDesigner(currentUser.id, { name: form.name, role: form.role });
    showNotification("Profile saved!");
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-lg space-y-6 mx-auto w-full">
        <div>
          <h1 className="text-[15px] font-semibold text-[#1D1D1F] tracking-tight">Settings</h1>
          <p className="text-[12px] text-[#86868B] mt-0.5">Manage your account</p>
        </div>

        {/* Profile */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E5EA]">
            <p className="text-[14px] font-semibold text-[#1D1D1F]">Profile</p>
            <p className="text-[12px] text-[#86868B] mt-0.5">Your personal information</p>
          </div>
          <div className="px-6 py-5 space-y-5">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 ${currentUser.avatarColor} rounded-xl flex items-center justify-center text-white text-lg font-bold`}>
                {currentUser.avatar}
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#1D1D1F]">{currentUser.name}</p>
                <p className="text-[12px] text-[#86868B] mt-0.5">{currentUser.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name</label>
                <input className="input-field" value={form.name} onChange={set("name")} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input-field" value={form.email} onChange={set("email")} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Role</label>
                <input className="input-field" value={form.role} onChange={set("role")} />
              </div>
            </div>

            <button onClick={handleSave} className="btn-primary">
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
          </div>
        </div>

        {/* About */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E5EA]">
            <p className="text-[14px] font-semibold text-[#1D1D1F]">About</p>
          </div>
          <div className="px-6 py-4 space-y-3">
            <div className="flex justify-between items-center py-1">
              <span className="text-[12px] text-[#636366]">Version</span>
              <span className="text-[12px] text-[#86868B] font-medium bg-[#F5F5F7] px-2.5 py-0.5 rounded-md">2.0.0</span>
            </div>
            <div className="border-t border-[#E5E5EA]" />
            <div className="flex justify-between items-center py-1">
              <span className="text-[12px] text-[#636366]">Built with</span>
              <span className="text-[12px] text-[#86868B] font-medium">React + Tailwind</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
