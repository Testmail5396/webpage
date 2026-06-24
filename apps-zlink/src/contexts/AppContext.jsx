import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { api } from "../lib/catalyst";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export const MAX_FOLDER_DEPTH = 10;

/* ── localStorage (UI preferences only) ──────────────── */
const FAV_KEY  = "designfolio_fav_designers";
const SEEN_KEY = "designfolio_seen";

function loadFavs() {
  try { const r = localStorage.getItem(FAV_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveFavs(ids) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(ids)); } catch {}
}
function loadSeen() {
  try { const r = localStorage.getItem(SEEN_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function saveSeen(seen) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch {}
}

/* ── Avatar helpers ───────────────────────────────────── */
function initials(name) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
const AVATAR_COLORS = [
  "bg-violet-500","bg-rose-500","bg-blue-500","bg-emerald-500",
  "bg-amber-500","bg-cyan-500","bg-pink-500","bg-indigo-500",
];

export function AppProvider({ children }) {
  const { authUser } = useAuth();

  /* ── State — always starts empty, loaded from Catalyst ── */
  const [designers, setDesigners] = useState([]);
  const [folders, setFolders]     = useState([]);
  const [links, setLinks]         = useState([]);
  const [modules, setModules]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  const foldersRef = useRef(folders);
  foldersRef.current = folders;

  /* ── Load all data from Catalyst API + 20s polling ── */
  useEffect(() => {
    async function loadAll() {
      try {
        const [profiles, flds, lnks, mods] = await Promise.all([
          api.getProfiles(),
          api.getFolders(),
          api.getLinks(),
          api.getModules(),
        ]);
        setDesigners(profiles);
        setFolders(flds);
        setLinks(lnks);
        setModules(mods);
      } catch (e) {
        console.error("Catalyst load error:", e);
      } finally {
        setLoading(false);
      }
    }

    loadAll();
    const interval = setInterval(loadAll, 20000);
    return () => clearInterval(interval);
  }, []);

  /* ── currentUser ── */
  const currentUser = useMemo(() => {
    if (!authUser) return null;
    const designer = designers.find(d => d.id === authUser.designerId);
    return {
      id: authUser.designerId,
      name: authUser.name,
      email: authUser.email,
      role: designer?.role || authUser.role || "",
      avatar: designer?.avatar || initials(authUser.name || "U"),
      avatarColor: designer?.avatarColor || authUser.avatarColor || AVATAR_COLORS[0],
      userId: authUser.id,
    };
  }, [authUser, designers]);

  const [modal, setModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState(null);
  const [favDesigners, setFavDesigners] = useState(loadFavs);
  const [lastSeenDesigners, setLastSeenDesigners] = useState(() => {
    const saved = loadSeen();
    if (saved) return saved;
    const initial = {};
    designers.forEach(d => { initial[d.id] = new Date().toISOString(); });
    return initial;
  });

  useEffect(() => { saveFavs(favDesigners); }, [favDesigners]);
  useEffect(() => { saveSeen(lastSeenDesigners); }, [lastSeenDesigners]);

  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2500);
  }, []);

  const openModal  = useCallback((type, data = {}) => setModal({ type, data }), []);
  const closeModal = useCallback(() => setModal(null), []);

  const markDesignerSeen = useCallback((designerId) => {
    setLastSeenDesigners(prev => ({ ...prev, [designerId]: new Date().toISOString() }));
  }, []);

  /* ── Designers / Profiles ─────────────────────────────── */
  const addDesigner = useCallback(async (fields) => {
    try {
      const profile = await api.createProfile({
        name: fields.name.trim(),
        email: fields.email?.trim() || "",
        role: fields.role?.trim() || "Designer",
        avatar: initials(fields.name),
        avatarColor: AVATAR_COLORS[designers.length % AVATAR_COLORS.length],
      });
      setDesigners(prev => prev.some(d => d.id === profile.id) ? prev : [...prev, profile]);
      setLastSeenDesigners(s => ({ ...s, [profile.id]: new Date().toISOString() }));
      showNotification(`${profile.name} added`);
    } catch (e) { showNotification(e.message, "error"); }
  }, [designers.length, showNotification]);

  const updateDesigner = useCallback(async (id, fields) => {
    try {
      await api.updateProfile(id, fields);
      setDesigners(prev => prev.map(d =>
        d.id === id ? { ...d, ...fields, avatar: initials(fields.name || d.name) } : d
      ));
      showNotification("Profile updated");
    } catch (e) { showNotification(e.message, "error"); }
  }, [showNotification]);

  const deleteDesigner = useCallback(async (id) => {
    try {
      await api.deleteProfile(id);
      setDesigners(prev => prev.filter(d => d.id !== id));
      setFolders(prev => prev.filter(f => f.designerId !== id));
      setLinks(prev => prev.filter(l => l.designerId !== id));
      setFavDesigners(prev => prev.filter(fid => fid !== id));
      setSelectedItem(prev => prev?.id === id ? null : prev);
      setLastSeenDesigners(prev => { const next = { ...prev }; delete next[id]; return next; });
      showNotification("Designer deleted");
    } catch (e) { showNotification(e.message, "error"); }
  }, [showNotification]);

  const toggleFavDesigner = useCallback((id) => {
    setFavDesigners(prev => {
      if (prev.includes(id)) return prev.filter(fid => fid !== id);
      if (prev.length >= 5) { showNotification("Maximum 5 pinned designers", "error"); return prev; }
      return [...prev, id];
    });
  }, [showNotification]);

  /* ── Folders ─────────────────────────────────────────── */
  const addFolder = useCallback(async (fields) => {
    if (fields.parentFolderId) {
      let depth = 0, currentId = fields.parentFolderId;
      const cur = foldersRef.current;
      while (currentId) {
        depth++;
        const f = cur.find(fo => fo.id === currentId);
        currentId = f?.parentFolderId || null;
      }
      if (depth >= MAX_FOLDER_DEPTH) {
        showNotification(`Maximum folder depth is ${MAX_FOLDER_DEPTH} levels`, "error");
        return null;
      }
    }

    try {
      const newFolder = await api.createFolder({
        designerId: fields.designerId,
        parentFolderId: fields.parentFolderId || null,
        name: fields.name.trim(),
        isPersonal: fields.isPersonal || false,
      });
      setFolders(prev => prev.some(f => f.id === newFolder.id) ? prev : [...prev, newFolder]);
      showNotification(`"${newFolder.name}" created`);
      return newFolder;
    } catch (e) { showNotification(e.message, "error"); return null; }
  }, [showNotification]);

  const updateFolder = useCallback(async (id, fields) => {
    try {
      await api.updateFolder(id, { name: fields.name, isPersonal: fields.isPersonal });
      setFolders(prev => prev.map(f => f.id === id ? { ...f, ...fields, updatedAt: new Date().toISOString() } : f));
      showNotification("Folder updated");
    } catch (e) { showNotification(e.message, "error"); }
  }, [showNotification]);

  const deleteFolder = useCallback(async (id) => {
    const collectIds = (folderId, allFolders) => {
      const children = allFolders.filter(f => f.parentFolderId === folderId).map(f => f.id);
      return [folderId, ...children.flatMap(cid => collectIds(cid, allFolders))];
    };
    const idsToDelete = collectIds(id, foldersRef.current);

    try {
      await api.deleteFolder(id);
      setFolders(prev => prev.filter(f => !idsToDelete.includes(f.id)));
      setLinks(prev => prev.filter(l => !l.folderId || !idsToDelete.includes(l.folderId)));
      setSelectedItem(prev => idsToDelete.includes(prev?.id) ? null : prev);
      showNotification("Folder deleted");
    } catch (e) { showNotification(e.message, "error"); }
  }, [showNotification]);

  /* ── Links ───────────────────────────────────────────── */
  const addLink = useCallback(async (fields) => {
    try {
      const newLink = await api.createLink({
        designerId: fields.designerId,
        folderId: fields.folderId || null,
        title: fields.title.trim(),
        url: fields.url.trim(),
        description: fields.description?.trim() || "",
        thumbnail: fields.thumbnail?.trim() || null,
        modules: fields.modules || [],
        sharedWith: fields.sharedWith || [],
      });
      setLinks(prev => prev.some(l => l.id === newLink.id) ? prev : [...prev, newLink]);
      showNotification("Link added");
      return newLink;
    } catch (e) { showNotification(e.message, "error"); return null; }
  }, [showNotification]);

  const updateLink = useCallback(async (id, fields) => {
    try {
      await api.updateLink(id, fields);
      setLinks(prev => prev.map(l => l.id === id ? { ...l, ...fields, updatedAt: new Date().toISOString() } : l));
      showNotification("Link updated");
    } catch (e) { showNotification(e.message, "error"); }
  }, [showNotification]);

  const deleteLink = useCallback(async (id) => {
    try {
      await api.deleteLink(id);
      setLinks(prev => prev.filter(l => l.id !== id));
      setSelectedItem(prev => prev?.id === id ? null : prev);
      showNotification("Link deleted");
    } catch (e) { showNotification(e.message, "error"); }
  }, [showNotification]);

  const moveLinkSilent = useCallback(async (id, fields) => {
    try { await api.updateLink(id, { folderId: fields.folderId ?? null }); } catch {}
    setLinks(prev => prev.map(l => l.id === id ? { ...l, ...fields, updatedAt: new Date().toISOString() } : l));
  }, []);

  const moveFolderSilent = useCallback(async (id, fields) => {
    try { await api.updateFolder(id, { parentFolderId: fields.parentFolderId ?? null }); } catch {}
    setFolders(prev => prev.map(f => f.id === id ? { ...f, ...fields, updatedAt: new Date().toISOString() } : f));
  }, []);

  /* ── Modules ─────────────────────────────────────────── */
  const addModule = useCallback(async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (modules.some(m => m.toLowerCase() === trimmed.toLowerCase())) return false;

    try {
      await api.createModule({ name: trimmed });
      setModules(prev => prev.includes(trimmed) ? prev : [...prev, trimmed].sort());
      showNotification(`"${trimmed}" module added`);
      return true;
    } catch { return false; }
  }, [modules, showNotification]);

  /* ── Helpers ─────────────────────────────────────────── */
  const getDesignerTopFolders  = useCallback((id) => folders.filter(f => f.designerId === id && !f.parentFolderId), [folders]);
  const getSubFolders          = useCallback((id) => folders.filter(f => f.parentFolderId === id), [folders]);
  const getFolderLinks         = useCallback((id) => links.filter(l => l.folderId === id), [links]);
  const getAllDesignerLinks     = useCallback((id) => links.filter(l => l.designerId === id), [links]);
  const getAllDesignerFolders   = useCallback((id) => folders.filter(f => f.designerId === id), [folders]);
  const getDesignerRootLinks   = useCallback((id) => links.filter(l => l.designerId === id && !l.folderId), [links]);

  const copyLink = useCallback((url) => {
    navigator.clipboard?.writeText(url).catch(() => {});
    showNotification("Link copied!");
  }, [showNotification]);

  const getPersonalFolderIds = useCallback((designerId) => {
    const personalRoots = folders.filter(f => f.designerId === designerId && f.isPersonal);
    const collectDescendants = (fid) => {
      const children = folders.filter(f => f.parentFolderId === fid);
      return [fid, ...children.flatMap(c => collectDescendants(c.id))];
    };
    return personalRoots.flatMap(f => collectDescendants(f.id));
  }, [folders]);

  const isFolderPersonal = useCallback((folderId) => {
    let currentId = folderId;
    while (currentId) {
      const f = folders.find(fo => fo.id === currentId);
      if (!f) return false;
      if (f.isPersonal) return true;
      currentId = f.parentFolderId;
    }
    return false;
  }, [folders]);

  const getFolderPath = useCallback((folderId) => {
    const path = [];
    let current = folders.find(f => f.id === folderId);
    while (current) {
      path.unshift(current.name);
      const parentId = current.parentFolderId;
      current = parentId ? folders.find(f => f.id === parentId) : null; // eslint-disable-line no-loop-func
    }
    return path.join(" / ");
  }, [folders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-5 h-5 border-2 border-[#C7C7CC] border-t-[#1D1D1F] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[13px] text-[#86868B]">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const value = {
    designers, folders, links, modules,
    selectedItem, setSelectedItem,
    modal, openModal, closeModal,
    searchQuery, setSearchQuery,
    notification,
    currentUser,
    favDesigners,
    lastSeenDesigners,
    addDesigner, updateDesigner, deleteDesigner, toggleFavDesigner,
    addFolder, updateFolder, deleteFolder,
    addLink, updateLink, deleteLink,
    moveLinkSilent, moveFolderSilent, addModule,
    copyLink, showNotification,
    markDesignerSeen,
    getDesignerTopFolders, getSubFolders, getFolderLinks,
    getAllDesignerLinks, getAllDesignerFolders, getDesignerRootLinks, getFolderPath,
    getPersonalFolderIds, isFolderPersonal,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
