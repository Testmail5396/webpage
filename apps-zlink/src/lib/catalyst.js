export const isCatalystConfigured = false;

const STORE_KEY = "designfolio_store_v1";

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { profiles: [], folders: [], links: [], modules: [] };
}

function saveStore(store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {}
}

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO() {
  return new Date().toISOString();
}

function mutate(fn) {
  const store = loadStore();
  const result = fn(store);
  saveStore(store);
  return result;
}

export const api = {
  getMe: async () => {
    throw new Error("Open mode: no remote session");
  },

  getProfiles: async () => loadStore().profiles,
  createProfile: async (data) =>
    mutate((s) => {
      const item = { id: genId("p"), createdAt: nowISO(), updatedAt: nowISO(), ...data };
      s.profiles.push(item);
      return item;
    }),
  updateProfile: async (id, data) =>
    mutate((s) => {
      const idx = s.profiles.findIndex((p) => p.id === id);
      if (idx >= 0) {
        s.profiles[idx] = { ...s.profiles[idx], ...data, updatedAt: nowISO() };
        return s.profiles[idx];
      }
      return null;
    }),
  deleteProfile: async (id) =>
    mutate((s) => {
      s.profiles = s.profiles.filter((p) => p.id !== id);
      s.folders = s.folders.filter((f) => f.designerId !== id);
      s.links = s.links.filter((l) => l.designerId !== id);
      return { id };
    }),

  getFolders: async () => loadStore().folders,
  createFolder: async (data) =>
    mutate((s) => {
      const item = { id: genId("f"), createdAt: nowISO(), updatedAt: nowISO(), ...data };
      s.folders.push(item);
      return item;
    }),
  updateFolder: async (id, data) =>
    mutate((s) => {
      const idx = s.folders.findIndex((f) => f.id === id);
      if (idx >= 0) {
        s.folders[idx] = { ...s.folders[idx], ...data, updatedAt: nowISO() };
        return s.folders[idx];
      }
      return null;
    }),
  deleteFolder: async (id) =>
    mutate((s) => {
      const toDelete = new Set([id]);
      let added = true;
      while (added) {
        added = false;
        for (const f of s.folders) {
          if (f.parentFolderId && toDelete.has(f.parentFolderId) && !toDelete.has(f.id)) {
            toDelete.add(f.id);
            added = true;
          }
        }
      }
      s.folders = s.folders.filter((f) => !toDelete.has(f.id));
      s.links = s.links.filter((l) => !toDelete.has(l.folderId));
      return { id };
    }),

  getLinks: async () => loadStore().links,
  createLink: async (data) =>
    mutate((s) => {
      const item = { id: genId("l"), createdAt: nowISO(), updatedAt: nowISO(), ...data };
      s.links.push(item);
      return item;
    }),
  updateLink: async (id, data) =>
    mutate((s) => {
      const idx = s.links.findIndex((l) => l.id === id);
      if (idx >= 0) {
        s.links[idx] = { ...s.links[idx], ...data, updatedAt: nowISO() };
        return s.links[idx];
      }
      return null;
    }),
  deleteLink: async (id) =>
    mutate((s) => {
      s.links = s.links.filter((l) => l.id !== id);
      return { id };
    }),

  getModules: async () => loadStore().modules,
  createModule: async (data) =>
    mutate((s) => {
      const item = { id: genId("m"), createdAt: nowISO(), ...data };
      s.modules.push(item);
      return item;
    }),
};
