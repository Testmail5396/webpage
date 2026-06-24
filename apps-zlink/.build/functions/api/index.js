const catalyst = require('zcatalyst-sdk-node');

const ALLOWED_DOMAIN = 'zohocorp.com';

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-rose-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500',
];

function initials(name) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function mapProfile(row) {
  return {
    id: String(row.ROWID),
    name: row.Name || '',
    email: row.Email || '',
    role: row.Role || 'Designer',
    avatar: row.Avatar || '',
    avatarColor: row.AvatarColor || AVATAR_COLORS[0],
    profileImage: row.ProfileImage || null,
    createdAt: row.CREATEDTIME || null,
  };
}

function mapFolder(row) {
  return {
    id: String(row.ROWID),
    designerId: row.DesignerId || '',
    parentFolderId: row.ParentFolderId || null,
    name: row.Name || '',
    isPersonal: row.IsPersonal === 'true',
    createdAt: row.CREATEDTIME || null,
    updatedAt: row.MODIFIEDTIME || null,
  };
}

function mapLink(row) {
  let modules = [];
  try { modules = JSON.parse(row.Modules || '[]'); } catch {}
  let sharedWith = [];
  try { sharedWith = JSON.parse(row.SharedWith || '[]'); } catch {}

  return {
    id: String(row.ROWID),
    designerId: row.DesignerId || '',
    folderId: row.FolderId || null,
    title: row.Title || '',
    url: row.Url || '',
    description: row.Description || '',
    thumbnail: row.Thumbnail || null,
    modules,
    sharedWith,
    createdAt: row.CREATEDTIME || null,
    updatedAt: row.MODIFIEDTIME || null,
  };
}

function respond(basicIO, context, data) {
  basicIO.write(JSON.stringify(data));
  context.close();
}

function ok(data) { return { ok: true, data }; }
function fail(error) { return { ok: false, error }; }

async function getRows(table) {
  try {
    const rows = await table.getAllRows();
    return rows || [];
  } catch {
    return [];
  }
}

module.exports = async (context, basicIO) => {
  const action = basicIO.getArgument('action');
  if (!action) {
    return respond(basicIO, context, fail('Missing action parameter'));
  }

  let payload = {};
  try {
    const raw = basicIO.getArgument('payload');
    if (raw) payload = JSON.parse(raw);
  } catch {
    return respond(basicIO, context, fail('Invalid payload JSON'));
  }

  try {
    const app = catalyst.initialize(context);
    const ds = app.datastore();
    let result;

    switch (action) {

      /* ── Auth ──────────────────────────────────────── */
      case 'getMe': {
        const user = await app.userManagement().getCurrentUser();
        const email = (user.email_id || '').toLowerCase();
        if (!email.endsWith('@' + ALLOWED_DOMAIN)) {
          result = fail('Only @' + ALLOWED_DOMAIN + ' accounts are allowed');
          break;
        }
        const name = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || email;

        const table = ds.table('Profiles');
        const rows = await getRows(table);
        let profile = rows.find(r => (r.Email || '').toLowerCase() === email);

        if (!profile) {
          const idx = rows.length % AVATAR_COLORS.length;
          profile = await table.insertRow({
            Name: name,
            Email: email,
            Role: 'Designer',
            Avatar: initials(name),
            AvatarColor: AVATAR_COLORS[idx],
          });
        }
        result = ok(mapProfile(profile));
        break;
      }

      /* ── Profiles ─────────────────────────────────── */
      case 'getProfiles': {
        const rows = await getRows(ds.table('Profiles'));
        result = ok(rows.map(mapProfile));
        break;
      }

      case 'createProfile': {
        const { name, email, role, avatar, avatarColor } = payload;
        if (!name || !email) { result = fail('Name and email are required'); break; }
        if (!email.toLowerCase().endsWith('@' + ALLOWED_DOMAIN)) {
          result = fail('Only @' + ALLOWED_DOMAIN + ' emails are allowed');
          break;
        }
        const row = await ds.table('Profiles').insertRow({
          Name: name,
          Email: email.toLowerCase(),
          Role: role || 'Designer',
          Avatar: avatar || initials(name),
          AvatarColor: avatarColor || AVATAR_COLORS[0],
        });
        result = ok(mapProfile(row));
        break;
      }

      case 'updateProfile': {
        const { id, ...fields } = payload;
        if (!id) { result = fail('Profile ID is required'); break; }
        const updateData = { ROWID: id };
        if (fields.name !== undefined) updateData.Name = fields.name;
        if (fields.role !== undefined) updateData.Role = fields.role;
        if (fields.profileImage !== undefined) updateData.ProfileImage = fields.profileImage || '';
        if (fields.avatar !== undefined) updateData.Avatar = fields.avatar;
        if (fields.avatarColor !== undefined) updateData.AvatarColor = fields.avatarColor;
        const row = await ds.table('Profiles').updateRow(updateData);
        result = ok(mapProfile(row));
        break;
      }

      case 'deleteProfile': {
        const { id } = payload;
        if (!id) { result = fail('Profile ID is required'); break; }
        const allFolders = await getRows(ds.table('Folders'));
        const allLinks = await getRows(ds.table('Links'));
        for (const l of allLinks.filter(l => l.DesignerId === id)) {
          await ds.table('Links').deleteRow(l.ROWID);
        }
        for (const f of allFolders.filter(f => f.DesignerId === id)) {
          await ds.table('Folders').deleteRow(f.ROWID);
        }
        await ds.table('Profiles').deleteRow(id);
        result = ok({ deleted: true });
        break;
      }

      /* ── Folders ──────────────────────────────────── */
      case 'getFolders': {
        const rows = await getRows(ds.table('Folders'));
        result = ok(rows.map(mapFolder));
        break;
      }

      case 'createFolder': {
        const { designerId, parentFolderId, name, isPersonal } = payload;
        if (!designerId || !name) { result = fail('designerId and name are required'); break; }
        const row = await ds.table('Folders').insertRow({
          DesignerId: designerId,
          ParentFolderId: parentFolderId || '',
          Name: name,
          IsPersonal: String(!!isPersonal),
        });
        result = ok(mapFolder(row));
        break;
      }

      case 'updateFolder': {
        const { id, ...fields } = payload;
        if (!id) { result = fail('Folder ID is required'); break; }
        const updateData = { ROWID: id };
        if (fields.name !== undefined) updateData.Name = fields.name;
        if (fields.isPersonal !== undefined) updateData.IsPersonal = String(!!fields.isPersonal);
        if (fields.parentFolderId !== undefined) updateData.ParentFolderId = fields.parentFolderId || '';
        const row = await ds.table('Folders').updateRow(updateData);
        result = ok(mapFolder(row));
        break;
      }

      case 'deleteFolder': {
        const { id } = payload;
        if (!id) { result = fail('Folder ID is required'); break; }
        const allFolders = await getRows(ds.table('Folders'));
        const allLinks = await getRows(ds.table('Links'));

        function collectIds(folderId) {
          const children = allFolders.filter(f => f.ParentFolderId === folderId).map(f => String(f.ROWID));
          return [folderId, ...children.flatMap(collectIds)];
        }
        const idsToDelete = collectIds(id);

        for (const l of allLinks.filter(l => idsToDelete.includes(l.FolderId))) {
          await ds.table('Links').deleteRow(l.ROWID);
        }
        for (const fid of idsToDelete.reverse()) {
          await ds.table('Folders').deleteRow(fid);
        }
        result = ok({ deleted: true });
        break;
      }

      /* ── Links ────────────────────────────────────── */
      case 'getLinks': {
        const rows = await getRows(ds.table('Links'));
        result = ok(rows.map(mapLink));
        break;
      }

      case 'createLink': {
        const { designerId, folderId, title, url, description, thumbnail, modules, sharedWith } = payload;
        if (!designerId || !title || !url) { result = fail('designerId, title, and url are required'); break; }
        const row = await ds.table('Links').insertRow({
          DesignerId: designerId,
          FolderId: folderId || '',
          Title: title,
          Url: url,
          Description: description || '',
          Thumbnail: thumbnail || '',
          Modules: JSON.stringify(modules || []),
          SharedWith: JSON.stringify(sharedWith || []),
        });
        result = ok(mapLink(row));
        break;
      }

      case 'updateLink': {
        const { id, ...fields } = payload;
        if (!id) { result = fail('Link ID is required'); break; }
        const updateData = { ROWID: id };
        if (fields.title !== undefined) updateData.Title = fields.title;
        if (fields.url !== undefined) updateData.Url = fields.url;
        if (fields.description !== undefined) updateData.Description = fields.description;
        if (fields.folderId !== undefined) updateData.FolderId = fields.folderId || '';
        if (fields.thumbnail !== undefined) updateData.Thumbnail = fields.thumbnail || '';
        if (fields.modules !== undefined) updateData.Modules = JSON.stringify(fields.modules);
        if (fields.sharedWith !== undefined) updateData.SharedWith = JSON.stringify(fields.sharedWith);
        const row = await ds.table('Links').updateRow(updateData);
        result = ok(mapLink(row));
        break;
      }

      case 'deleteLink': {
        const { id } = payload;
        if (!id) { result = fail('Link ID is required'); break; }
        await ds.table('Links').deleteRow(id);
        result = ok({ deleted: true });
        break;
      }

      /* ── Modules ──────────────────────────────────── */
      case 'getModules': {
        const rows = await getRows(ds.table('AppModules'));
        result = ok(rows.map(r => r.Name));
        break;
      }

      case 'createModule': {
        const { name } = payload;
        if (!name) { result = fail('Module name is required'); break; }
        await ds.table('AppModules').insertRow({ Name: name });
        result = ok({ created: true });
        break;
      }

      default:
        result = fail('Unknown action: ' + action);
    }

    respond(basicIO, context, result);
  } catch (err) {
    respond(basicIO, context, fail(err.message || 'Internal server error'));
  }
};
