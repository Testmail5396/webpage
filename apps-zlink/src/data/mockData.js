// Hierarchy: Users → Designers → Folders → Sub-folders → Links
// Each user has exactly one designer profile (1:1 mapping)

/* ── Password hashing (simple demo hash — not for production) ── */
export function hashPassword(password) {
  let h = 0;
  for (let i = 0; i < password.length; i++) {
    h = ((h << 5) - h) + password.charCodeAt(i);
    h = h & h;
  }
  return 'dh_' + Math.abs(h).toString(36) + '_' + password.length;
}

// Default password for all seed accounts: design@123
const DEFAULT_HASH = "dh_hxe8g_10";

/* ── Users (auth accounts) ── */
export const users = [
  { id: "u1", email: "vikash.m@zohocorp.com",  passwordHash: DEFAULT_HASH, name: "Vikash M", role: "Senior Visual Designer", designerId: "d1", createdAt: "2026-01-10T09:00:00Z" },
  { id: "u2", email: "karthiban.ns@zohocorp.com", passwordHash: DEFAULT_HASH, name: "Karthiban K", role: "UX Designer",          designerId: "d2", createdAt: "2026-01-12T10:00:00Z" },
  { id: "u3", email: "vijay.v@zohocorp.com",    passwordHash: DEFAULT_HASH, name: "Vijay V",    role: "Product Designer",      designerId: "d3", createdAt: "2026-01-15T11:00:00Z" },
  { id: "u4", email: "wilson.w@zohocorp.com",   passwordHash: DEFAULT_HASH, name: "Wilson W",   role: "Visual Designer",       designerId: "d4", createdAt: "2026-01-18T12:00:00Z" },
  { id: "u5", email: "bala.b@zohocorp.com",     passwordHash: DEFAULT_HASH, name: "Bala B",     role: "Interaction Designer",  designerId: "d5", createdAt: "2026-01-20T09:00:00Z" },
];

/* ── Invites ── */
export const invites = [];

/* ── Modules (product feature areas — like Zoho Desk modules) ── */
export const DEFAULT_MODULES = ["Tickets", "Analytics", "IM", "KB", "Reports", "Setup"];

/* ── Designers (1:1 with users) ── */
export let designers = [
  { id: "d1", name: "Vikash M", email: "vikash.m@zohocorp.com", role: "Senior Visual Designer", avatar: "VM", avatarColor: "bg-violet-500", profileImage: null, createdAt: "2026-01-10T09:00:00Z" },
  { id: "d2", name: "Karthiban K", email: "karthiban.ns@zohocorp.com", role: "UX Designer",           avatar: "KK", avatarColor: "bg-rose-500",   profileImage: null, createdAt: "2026-01-12T10:00:00Z" },
  { id: "d3", name: "Vijay V",    email: "vijay.v@zohocorp.com",    role: "Product Designer",      avatar: "VV", avatarColor: "bg-blue-500",   profileImage: null, createdAt: "2026-01-15T11:00:00Z" },
  { id: "d4", name: "Wilson W",   email: "wilson.w@zohocorp.com",   role: "Visual Designer",       avatar: "WW", avatarColor: "bg-emerald-500", profileImage: null, createdAt: "2026-01-18T12:00:00Z" },
  { id: "d5", name: "Bala B",     email: "bala.b@zohocorp.com",     role: "Interaction Designer",  avatar: "BB", avatarColor: "bg-amber-500",  profileImage: null, createdAt: "2026-01-20T09:00:00Z" },
];

// parentFolderId = null means top-level folder under a designer
export let folders = [
  { id: "fo1",  designerId: "d1", parentFolderId: null,  name: "Translation",       isPersonal: false, createdAt: "2026-02-01T09:00:00Z", updatedAt: "2026-02-01T09:00:00Z" },
  { id: "fo1a", designerId: "d1", parentFolderId: "fo1", name: "Mobile",            isPersonal: false, createdAt: "2026-02-05T09:00:00Z", updatedAt: "2026-02-05T09:00:00Z" },
  { id: "fo1b", designerId: "d1", parentFolderId: "fo1", name: "Desktop",           isPersonal: false, createdAt: "2026-02-06T09:00:00Z", updatedAt: "2026-02-06T09:00:00Z" },
  { id: "fo2",  designerId: "d1", parentFolderId: null,  name: "Dashboard Redesign",isPersonal: false, createdAt: "2026-02-10T09:00:00Z", updatedAt: "2026-02-10T09:00:00Z" },
  { id: "fo2a", designerId: "d1", parentFolderId: "fo2", name: "Dark Mode",         isPersonal: false, createdAt: "2026-02-12T09:00:00Z", updatedAt: "2026-02-12T09:00:00Z" },
  { id: "fo3",  designerId: "d1", parentFolderId: null,  name: "Onboarding",        isPersonal: true,  createdAt: "2026-02-15T09:00:00Z", updatedAt: "2026-02-15T09:00:00Z" },
  { id: "fo4",  designerId: "d2", parentFolderId: null,  name: "Payment Flow",      isPersonal: false, createdAt: "2026-02-01T09:00:00Z", updatedAt: "2026-02-01T09:00:00Z" },
  { id: "fo4a", designerId: "d2", parentFolderId: "fo4", name: "Checkout",          isPersonal: false, createdAt: "2026-02-03T09:00:00Z", updatedAt: "2026-02-03T09:00:00Z" },
  { id: "fo5",  designerId: "d2", parentFolderId: null,  name: "Mobile Navigation", isPersonal: true,  createdAt: "2026-02-08T09:00:00Z", updatedAt: "2026-02-08T09:00:00Z" },
  { id: "fo6",  designerId: "d3", parentFolderId: null,  name: "Search & Discovery",isPersonal: false, createdAt: "2026-02-01T09:00:00Z", updatedAt: "2026-02-01T09:00:00Z" },
  { id: "fo6a", designerId: "d3", parentFolderId: "fo6", name: "Filters",           isPersonal: false, createdAt: "2026-02-04T09:00:00Z", updatedAt: "2026-02-04T09:00:00Z" },
  { id: "fo7",  designerId: "d3", parentFolderId: null,  name: "Settings Page",     isPersonal: false, createdAt: "2026-02-10T09:00:00Z", updatedAt: "2026-02-10T09:00:00Z" },
  { id: "fo8",  designerId: "d4", parentFolderId: null,  name: "Profile",           isPersonal: false, createdAt: "2026-02-01T09:00:00Z", updatedAt: "2026-02-01T09:00:00Z" },
  { id: "fo9",  designerId: "d4", parentFolderId: null,  name: "Notifications",     isPersonal: true,  createdAt: "2026-02-05T09:00:00Z", updatedAt: "2026-02-05T09:00:00Z" },
  { id: "fo10", designerId: "d5", parentFolderId: null,  name: "Design System",     isPersonal: false, createdAt: "2026-02-02T09:00:00Z", updatedAt: "2026-02-02T09:00:00Z" },
  { id: "fo11", designerId: "d5", parentFolderId: null,  name: "Micro Interactions",isPersonal: false, createdAt: "2026-02-08T09:00:00Z", updatedAt: "2026-02-08T09:00:00Z" },
];

export let links = [
  { id: "l1",  designerId: "d1", folderId: "fo1a", title: "Translation Mobile v1",      url: "https://www.figma.com/proto/translation-mobile-v1",  description: "First mobile pass for translation UI",       thumbnail: null, sharedWith: ["d2", "d3"], createdAt: "2026-02-10T09:00:00Z", updatedAt: "2026-02-10T09:00:00Z" },
  { id: "l2",  designerId: "d1", folderId: "fo1a", title: "Translation Mobile v2",      url: "https://www.figma.com/proto/translation-mobile-v2",  description: "Revised with new language selector",         thumbnail: null, sharedWith: [],           createdAt: "2026-02-15T09:00:00Z", updatedAt: "2026-02-15T09:00:00Z" },
  { id: "l3",  designerId: "d1", folderId: "fo1b", title: "Translation Desktop v1",     url: "https://www.figma.com/proto/translation-desktop-v1", description: "Desktop layout exploration",                 thumbnail: null, sharedWith: [],           createdAt: "2026-02-16T09:00:00Z", updatedAt: "2026-02-16T09:00:00Z" },
  { id: "l4",  designerId: "d1", folderId: "fo1",  title: "Translation Kickoff",        url: "https://www.figma.com/proto/translation-kickoff",    description: "Initial concept and direction",              thumbnail: null, sharedWith: [],           createdAt: "2026-02-01T09:00:00Z", updatedAt: "2026-02-01T09:00:00Z" },
  { id: "l5",  designerId: "d1", folderId: "fo2",  title: "Dashboard v1",               url: "https://www.figma.com/proto/dashboard-v1",           description: "Clean redesign of main dashboard",           thumbnail: null, sharedWith: ["d3"],       createdAt: "2026-02-11T09:00:00Z", updatedAt: "2026-02-11T09:00:00Z" },
  { id: "l6",  designerId: "d1", folderId: "fo2",  title: "Dashboard v2 — Quick Actions",url: "https://www.figma.com/proto/dashboard-v2",          description: "Added quick action bar",                     thumbnail: null, sharedWith: [],           createdAt: "2026-02-14T09:00:00Z", updatedAt: "2026-02-14T09:00:00Z" },
  { id: "l7",  designerId: "d1", folderId: "fo2a", title: "Dark Mode Prototype",        url: "https://www.figma.com/proto/dashboard-dark",         description: "Full dark mode variant",                     thumbnail: null, sharedWith: [],           createdAt: "2026-02-18T09:00:00Z", updatedAt: "2026-02-18T09:00:00Z" },
  { id: "l8",  designerId: "d1", folderId: "fo3",  title: "Onboarding Flow v1",         url: "https://www.figma.com/proto/onboarding-v1",          description: "Step-by-step onboarding",                    thumbnail: null, sharedWith: [],           createdAt: "2026-02-20T09:00:00Z", updatedAt: "2026-02-20T09:00:00Z" },
  { id: "l9",  designerId: "d2", folderId: "fo4",  title: "Payment Flow Overview",      url: "https://www.figma.com/proto/payment-overview",       description: "Main payment user journey",                  thumbnail: null, sharedWith: ["d1"],       createdAt: "2026-02-05T09:00:00Z", updatedAt: "2026-02-05T09:00:00Z" },
  { id: "l10", designerId: "d2", folderId: "fo4a", title: "Checkout Step 1",            url: "https://www.figma.com/proto/checkout-1",             description: "Cart review step",                           thumbnail: null, sharedWith: [],           createdAt: "2026-02-07T09:00:00Z", updatedAt: "2026-02-07T09:00:00Z" },
  { id: "l11", designerId: "d2", folderId: "fo4a", title: "Checkout Step 2",            url: "https://www.figma.com/proto/checkout-2",             description: "Payment entry step",                         thumbnail: null, sharedWith: [],           createdAt: "2026-02-08T09:00:00Z", updatedAt: "2026-02-08T09:00:00Z" },
  { id: "l12", designerId: "d2", folderId: "fo5",  title: "Tab Bar Navigation",         url: "https://www.figma.com/proto/tab-bar",                description: "Bottom tab bar for mobile",                  thumbnail: null, sharedWith: [],           createdAt: "2026-02-12T09:00:00Z", updatedAt: "2026-02-12T09:00:00Z" },
  { id: "l13", designerId: "d3", folderId: "fo6",  title: "Search Overview",            url: "https://www.figma.com/proto/search-overview",        description: "Search experience exploration",              thumbnail: null, sharedWith: ["d1", "d4"], createdAt: "2026-02-03T09:00:00Z", updatedAt: "2026-02-03T09:00:00Z" },
  { id: "l14", designerId: "d3", folderId: "fo6a", title: "Filter Panel",               url: "https://www.figma.com/proto/filter-panel",           description: "Advanced filter options",                    thumbnail: null, sharedWith: [],           createdAt: "2026-02-06T09:00:00Z", updatedAt: "2026-02-06T09:00:00Z" },
  { id: "l15", designerId: "d3", folderId: "fo7",  title: "Settings Redesign",          url: "https://www.figma.com/proto/settings-redesign",      description: "Simplified settings page",                   thumbnail: null, sharedWith: ["d1"],       createdAt: "2026-02-14T09:00:00Z", updatedAt: "2026-02-14T09:00:00Z" },
  { id: "l16", designerId: "d4", folderId: "fo8",  title: "Profile Page v1",            url: "https://www.figma.com/proto/profile-v1",             description: "User profile layout",                        thumbnail: null, sharedWith: [],           createdAt: "2026-02-04T09:00:00Z", updatedAt: "2026-02-04T09:00:00Z" },
  { id: "l17", designerId: "d4", folderId: "fo8",  title: "Profile Edit State",         url: "https://www.figma.com/proto/profile-edit",           description: "Editing state for profile",                  thumbnail: null, sharedWith: [],           createdAt: "2026-02-09T09:00:00Z", updatedAt: "2026-02-09T09:00:00Z" },
  { id: "l18", designerId: "d4", folderId: "fo9",  title: "Notification Center",        url: "https://www.figma.com/proto/notifications",          description: "Notification hub design",                    thumbnail: null, sharedWith: [],           createdAt: "2026-02-11T09:00:00Z", updatedAt: "2026-02-11T09:00:00Z" },
  // Root links (directly under designer, no folder)
  { id: "l19", designerId: "d1", folderId: null,   title: "Brand Guidelines v2",        url: "https://www.figma.com/proto/brand-guidelines",       description: "Updated brand guideline explorations",       thumbnail: null, sharedWith: [],           createdAt: "2026-02-22T09:00:00Z", updatedAt: "2026-02-22T09:00:00Z" },
  { id: "l20", designerId: "d2", folderId: null,   title: "Quick Wireframe Sketch",     url: "https://www.figma.com/proto/wireframe-sketch",       description: "Rough wireframe for new feature",            thumbnail: null, sharedWith: ["d1"],       createdAt: "2026-02-18T09:00:00Z", updatedAt: "2026-02-18T09:00:00Z" },
  { id: "l21", designerId: "d5", folderId: "fo10", title: "Component Library v1",       url: "https://www.figma.com/proto/component-library",      description: "Core component library for design system",   thumbnail: null, sharedWith: ["d1"],       createdAt: "2026-02-06T09:00:00Z", updatedAt: "2026-02-06T09:00:00Z" },
  { id: "l22", designerId: "d5", folderId: "fo11", title: "Button Hover States",        url: "https://www.figma.com/proto/button-hover",           description: "Micro interaction for hover states",         thumbnail: null, sharedWith: [],           createdAt: "2026-02-12T09:00:00Z", updatedAt: "2026-02-12T09:00:00Z" },
  { id: "l23", designerId: "d5", folderId: null,   title: "Tooltip Animation",          url: "https://www.figma.com/proto/tooltip-anim",           description: "Tooltip show/hide animations",               thumbnail: null, sharedWith: ["d1", "d3"], createdAt: "2026-02-16T09:00:00Z", updatedAt: "2026-02-16T09:00:00Z" },
];

// Pre-assign modules to seed links for demo
[
  ["l1",  ["Tickets"]],   ["l2",  ["Tickets"]],   ["l4",  ["Tickets"]],
  ["l5",  ["Analytics"]],  ["l6",  ["Analytics"]],  ["l7",  ["Analytics"]],
  ["l8",  ["Setup"]],
  ["l9",  ["Tickets"]],   ["l10", ["Tickets"]],
  ["l12", ["IM"]],        ["l18", ["IM"]],
  ["l13", ["KB"]],        ["l14", ["KB"]],
  ["l15", ["Setup"]],     ["l16", ["Setup"]],
  ["l19", ["Reports"]],   ["l20", ["Analytics"]],
  ["l21", ["Setup"]],    ["l22", ["IM"]],        ["l23", ["IM"]],
].forEach(([id, mods]) => { const l = links.find(x => x.id === id); if (l) l.modules = mods; });

export function getDesignerById(id) { return designers.find(d => d.id === id) || null; }
export function getFolderById(id) { return folders.find(f => f.id === id) || null; }
export function getLinkById(id) { return links.find(l => l.id === id) || null; }
