/**
 * Sidebar UI Controller
 * Manages collection list and nested detail view with schema/entry management
 */

// Real-world SQLite schemas from popular open source apps
const SCHEMA_PRESETS = {
    buku: `-- buku: command-line bookmark manager
-- https://github.com/jarun/buku
CREATE TABLE bookmarks (
  id        INTEGER PRIMARY KEY,
  URL       TEXT NOT NULL UNIQUE,
  metadata  TEXT DEFAULT '',
  tags      TEXT DEFAULT ',',
  desc      TEXT DEFAULT '',
  flags     INTEGER DEFAULT 0
);

CREATE TABLE tag (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE COLLATE NOCASE
);`,

    newsboat: `-- newsboat: terminal RSS/Atom feed reader
-- https://github.com/newsboat/newsboat
CREATE TABLE rss_feed (
  rssurl       TEXT NOT NULL PRIMARY KEY,
  url          TEXT NOT NULL,
  title        TEXT NOT NULL DEFAULT '',
  lastmodified INTEGER NOT NULL DEFAULT 0,
  is_rtl       INTEGER NOT NULL DEFAULT 0,
  etag         TEXT NOT NULL DEFAULT ''
);

CREATE TABLE rss_item (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  guid        TEXT NOT NULL,
  title       TEXT NOT NULL,
  author      TEXT NOT NULL,
  url         TEXT NOT NULL,
  feedurl     TEXT NOT NULL,
  pubdate     INTEGER NOT NULL,
  content     TEXT NOT NULL,
  unread      INTEGER NOT NULL DEFAULT 1,
  enclosure_url  TEXT,
  enclosure_type TEXT,
  enqueued    INTEGER NOT NULL DEFAULT 0,
  flags       TEXT,
  deleted     INTEGER NOT NULL DEFAULT 0,
  base        TEXT DEFAULT NULL
);`,

    zotero: `-- zotero: reference manager (simplified core tables)
-- https://github.com/zotero/zotero
CREATE TABLE items (
  itemID        INTEGER PRIMARY KEY,
  itemTypeID    INTEGER NOT NULL,
  dateAdded     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dateModified  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  clientDateModified TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  libraryID     INTEGER NOT NULL,
  key           TEXT NOT NULL,
  version       INTEGER NOT NULL DEFAULT 0,
  synced        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE creators (
  creatorID   INTEGER PRIMARY KEY,
  firstName   TEXT DEFAULT '',
  lastName    TEXT DEFAULT '',
  fieldMode   INTEGER DEFAULT 0
);

CREATE TABLE itemCreators (
  itemID      INTEGER NOT NULL,
  creatorID   INTEGER NOT NULL,
  creatorTypeID INTEGER NOT NULL DEFAULT 1,
  orderIndex  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (itemID, creatorID, creatorTypeID)
);

CREATE TABLE tags (
  tagID   INTEGER PRIMARY KEY,
  name    TEXT NOT NULL COLLATE NOCASE
);

CREATE TABLE itemTags (
  itemID  INTEGER NOT NULL,
  tagID   INTEGER NOT NULL,
  type    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (itemID, tagID)
);`,

    taskwarrior: `-- taskwarrior: command-line task manager (export schema)
-- https://github.com/GothenburgBitFactory/taskwarrior
CREATE TABLE tasks (
  uuid        TEXT PRIMARY KEY,
  status      TEXT NOT NULL DEFAULT 'pending',
  description TEXT NOT NULL,
  entry       TEXT,
  modified    TEXT,
  due         TEXT,
  until       TEXT,
  wait        TEXT,
  scheduled   TEXT,
  start       TEXT,
  end         TEXT,
  priority    TEXT,
  project     TEXT,
  recur       TEXT,
  mask        TEXT,
  imask       INTEGER,
  parent      TEXT,
  urgency     REAL DEFAULT 0.0
);

CREATE TABLE task_tags (
  task_uuid  TEXT NOT NULL,
  tag        TEXT NOT NULL,
  PRIMARY KEY (task_uuid, tag)
);

CREATE TABLE task_annotations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_uuid  TEXT NOT NULL,
  entry      TEXT NOT NULL,
  description TEXT NOT NULL
);`,

    miniflux: `-- miniflux: minimalist feed reader (simplified)
-- https://github.com/miniflux/v2
CREATE TABLE feeds (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL,
  feed_url           TEXT NOT NULL,
  site_url           TEXT NOT NULL DEFAULT '',
  title              TEXT NOT NULL DEFAULT '',
  checked_at         TEXT,
  next_check_at      TEXT,
  etag_header        TEXT NOT NULL DEFAULT '',
  last_modified_header TEXT NOT NULL DEFAULT '',
  parsing_error_msg  TEXT NOT NULL DEFAULT '',
  parsing_error_count INTEGER NOT NULL DEFAULT 0,
  scraper_rules      TEXT NOT NULL DEFAULT '',
  rewrite_rules      TEXT NOT NULL DEFAULT '',
  crawler            INTEGER NOT NULL DEFAULT 0,
  category_id        INTEGER,
  username           TEXT NOT NULL DEFAULT '',
  password           TEXT NOT NULL DEFAULT '',
  disabled           INTEGER NOT NULL DEFAULT 0,
  hide_globally      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  feed_id     INTEGER NOT NULL,
  hash        TEXT NOT NULL,
  published_at TEXT NOT NULL,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  comments_url TEXT NOT NULL DEFAULT '',
  author      TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'unread',
  starred     INTEGER NOT NULL DEFAULT 0,
  reading_time INTEGER NOT NULL DEFAULT 0
);`
};

class SidebarUI {
    constructor() {
        // Views
        this.listView = document.getElementById('listView');
        this.detailView = document.getElementById('detailView');

        // List view elements
        this.collectionsList = document.getElementById('collectionsList');
        this.template = document.getElementById('collectionTemplate');

        // Detail view elements
        this.detailTitle = document.getElementById('detailTitle');
        this.schemaContent = document.getElementById('schemaContent');
        this.entriesContent = document.getElementById('entriesContent');
        this.entryCount = document.getElementById('entryCount');

        // Modal elements
        this.schemaModal = document.getElementById('schemaModal');
        this.schemaTextarea = document.getElementById('schemaTextarea');

        // State
        this.currentCollection = null;
        this.currentSchema = [];

        this.setupEventListeners();
        this.loadCollections();
    }

    setupEventListeners() {
        // List view
        document.getElementById('createBtn').addEventListener('click', () => this.createCollection());
        document.getElementById('importBtn').addEventListener('click', () => this.importDatabase());

        // Detail view
        document.getElementById('backBtn').addEventListener('click', () => this.showListView());
        document.getElementById('editSchemaBtn').addEventListener('click', () => this.openSchemaModal());
        document.getElementById('detailExportBtn').addEventListener('click', () => this.exportCollection(this.currentCollection));
        document.getElementById('detailSaveBtn').addEventListener('click', () => this.saveCheckpoint(this.currentCollection));
        document.getElementById('detailDeleteBtn').addEventListener('click', () => this.deleteCollection(this.currentCollection));

        // Modal
        document.getElementById('modalSaveBtn').addEventListener('click', () => this.saveSchema());
        document.getElementById('modalCancelBtn').addEventListener('click', () => this.closeSchemaModal());
        document.getElementById('modalCloseBtn').addEventListener('click', () => this.closeSchemaModal());
        this.schemaModal.addEventListener('click', (e) => {
            if (e.target === this.schemaModal) this.closeSchemaModal();
        });

        // Preset schema buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = SCHEMA_PRESETS[btn.dataset.preset];
                if (preset) {
                    this.schemaTextarea.value = preset;
                    this.schemaTextarea.focus();
                }
            });
        });
    }

    // ===== NAVIGATION =====

    showListView() {
        this.detailView.classList.remove('active');
        this.listView.classList.add('active');
        this.currentCollection = null;
        this.loadCollections();
    }

    showDetailView(collectionName) {
        this.currentCollection = collectionName;
        this.detailTitle.textContent = collectionName;
        this.listView.classList.remove('active');
        this.detailView.classList.add('active');
        this.loadCollectionDetail(collectionName);
    }

    // ===== COLLECTION LIST =====

    async loadCollections() {
        try {
            const response = await this.sendMessage({ action: 'listCollections' });
            if (response.success) {
                this.renderCollections(response.collections);
            }
        } catch (error) {
            console.error('Failed to load collections:', error);
        }
    }

    renderCollections(collections) {
        if (collections.length === 0) {
            this.collectionsList.innerHTML = `
              <div class="empty-state">
                <div class="empty-icon">🗄️</div>
                <p>No collections yet</p>
                <p class="hint">Create a new collection or import an existing database</p>
              </div>`;
            return;
        }

        this.collectionsList.innerHTML = '';
        collections.forEach(name => {
            const item = this.createCollectionItem(name);
            this.collectionsList.appendChild(item);
        });
    }

    createCollectionItem(name) {
        const clone = this.template.content.cloneNode(true);

        clone.querySelector('.collection-name').textContent = name;

        // Click on header/name area → navigate to detail
        const item = clone.querySelector('.collection-item');
        const header = clone.querySelector('.collection-header');
        header.addEventListener('click', (e) => {
            // Don't navigate if delete button was clicked
            if (!e.target.closest('.delete-btn')) {
                this.showDetailView(name);
            }
        });

        clone.querySelector('.export-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.exportCollection(name);
        });
        clone.querySelector('.save-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.saveCheckpoint(name);
        });
        clone.querySelector('.restore-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.restoreCheckpoint(name);
        });
        clone.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteCollection(name);
        });

        return clone;
    }

    // ===== DETAIL VIEW =====

    async loadCollectionDetail(name) {
        this.schemaContent.innerHTML = '<p class="hint">Loading…</p>';
        this.entriesContent.innerHTML = '<p class="hint">Loading…</p>';
        this.entryCount.textContent = '0';

        try {
            const schemaResp = await this.sendMessage({ action: 'getSchema', name });
            if (schemaResp.success) {
                this.currentSchema = schemaResp.schema;
                this.renderSchema(schemaResp.schema);

                // Load entries for each table
                await this.loadEntries(name, schemaResp.schema);
            }
        } catch (error) {
            console.error('Failed to load collection detail:', error);
            this.schemaContent.innerHTML = '<p class="hint">Failed to load schema.</p>';
        }
    }

    renderSchema(schema) {
        if (!schema.length) {
            this.schemaContent.innerHTML = '<p class="hint">No tables defined yet. Click ✏️ Edit to add a schema.</p>';
            return;
        }

        this.schemaContent.innerHTML = schema.map(({ name, sql }) => `
          <div class="schema-table">
            <div class="schema-table-name">📋 ${name}</div>
            <pre class="schema-sql">${this.escapeHtml(sql)}</pre>
          </div>
        `).join('');
    }

    async loadEntries(collectionName, schema) {
        if (!schema.length) {
            this.entriesContent.innerHTML = '<p class="hint">Define a schema first to see entries.</p>';
            this.entryCount.textContent = '0';
            return;
        }

        try {
            // Load entries for all tables
            let totalCount = 0;
            let html = '';

            for (const { name: tableName } of schema) {
                const resp = await this.sendMessage({
                    action: 'getEntries',
                    name: collectionName,
                    tableName
                });

                if (resp.success) {
                    totalCount += resp.entries.length;
                    if (schema.length > 1) {
                        html += `<div class="schema-table-name" style="margin-bottom:4px;font-size:12px;">📋 ${tableName}</div>`;
                    }
                    if (resp.entries.length === 0) {
                        html += '<p class="hint" style="margin-bottom:8px;">No entries yet.</p>';
                    } else {
                        html += resp.entries.map(id => `
                          <div class="entry-row">
                            <span class="entry-id">#</span>
                            <span class="entry-label">${id}</span>
                          </div>`).join('');
                    }
                }
            }

            this.entryCount.textContent = totalCount;
            this.entriesContent.innerHTML = html || '<p class="hint">No entries yet.</p>';
        } catch (error) {
            console.error('Failed to load entries:', error);
            this.entriesContent.innerHTML = '<p class="hint">Failed to load entries.</p>';
        }
    }

    // ===== SCHEMA MODAL =====

    openSchemaModal() {
        // Pre-fill with existing schema SQL if available
        if (this.currentSchema.length > 0) {
            this.schemaTextarea.value = this.currentSchema.map(t => t.sql).join(';\n\n') + ';';
        } else {
            this.schemaTextarea.value = '';
        }
        this.schemaModal.classList.remove('hidden');
        this.schemaTextarea.focus();
    }

    closeSchemaModal() {
        this.schemaModal.classList.add('hidden');
    }

    async saveSchema() {
        const sql = this.schemaTextarea.value.trim();
        if (!sql) {
            this.showNotification('Please enter a CREATE TABLE statement', 'error');
            return;
        }

        // Validate that there's at least one CREATE TABLE statement
        if (!/CREATE\s+TABLE/i.test(sql)) {
            this.showNotification('No CREATE TABLE statement found', 'error');
            return;
        }

        try {
            const response = await this.sendMessage({
                action: 'setSchema',
                name: this.currentCollection,
                createSQL: sql
            });

            if (response.success) {
                this.closeSchemaModal();
                this.showNotification(`Schema saved for "${this.currentCollection}"`, 'success');
                this.loadCollectionDetail(this.currentCollection);
            } else {
                this.showNotification(`Error: ${response.error}`, 'error');
            }
        } catch (error) {
            this.showNotification('Failed to save schema', 'error');
        }
    }

    // ===== COLLECTION ACTIONS =====

    async createCollection() {
        const name = prompt('Enter collection name:');
        if (!name || !name.trim()) return;

        try {
            const response = await this.sendMessage({ action: 'createCollection', name: name.trim() });
            if (response.success) {
                this.loadCollections();
                this.showNotification(`Collection "${name}" created`, 'success');
            }
        } catch (error) {
            this.showNotification('Failed to create collection', 'error');
        }
    }

    async importDatabase() {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'SQLite Database',
                    accept: { 'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3'] }
                }]
            });

            const file = await fileHandle.getFile();
            const name = prompt('Enter collection name:', file.name.replace(/\.(db|sqlite|sqlite3)$/, ''));
            if (!name || !name.trim()) return;

            const arrayBuffer = await file.arrayBuffer();
            // Convert to plain Array so it survives chrome.runtime.sendMessage serialization
            const data = Array.from(new Uint8Array(arrayBuffer));
            const response = await this.sendMessage({
                action: 'importFromBlob',
                name: name.trim(),
                data
            });

            if (response.success) {
                this.loadCollections();
                this.showNotification(`Database imported as "${name}"`, 'success');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Import failed:', error);
                this.showNotification('Failed to import database', 'error');
            }
        }
    }

    async exportCollection(name) {
        try {
            const response = await this.sendMessage({ action: 'exportToBlob', name });
            if (response.success) {
                const uint8Array = new Uint8Array(response.data);
                const blob = new Blob([uint8Array], { type: 'application/x-sqlite3' });

                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: `${name}.db`,
                    types: [{ description: 'SQLite Database', accept: { 'application/x-sqlite3': ['.db'] } }]
                });

                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();

                this.showNotification(`Collection "${name}" exported`, 'success');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Export failed:', error);
                this.showNotification('Failed to export collection', 'error');
            }
        }
    }

    async saveCheckpoint(name) {
        try {
            const response = await this.sendMessage({ action: 'saveCheckpoint', name });
            if (response.success) {
                this.showNotification(`Checkpoint saved for "${name}"`, 'success');
            }
        } catch (error) {
            this.showNotification('Failed to save checkpoint', 'error');
        }
    }

    async restoreCheckpoint(name) {
        if (!confirm(`Restore "${name}" to last checkpoint? Current changes will be lost.`)) return;

        try {
            const response = await this.sendMessage({ action: 'restoreCheckpoint', name });
            if (response.success) {
                if (response.restored) {
                    this.showNotification(`Collection "${name}" restored`, 'success');
                    if (this.currentCollection === name) {
                        this.loadCollectionDetail(name);
                    }
                } else {
                    this.showNotification('No checkpoint found', 'error');
                }
            }
        } catch (error) {
            this.showNotification('Failed to restore checkpoint', 'error');
        }
    }

    async deleteCollection(name) {
        if (!confirm(`Delete collection "${name}"? This cannot be undone.`)) return;

        try {
            const response = await this.sendMessage({ action: 'deleteCollection', name });
            if (response.success) {
                this.showNotification(`Collection "${name}" deleted`, 'success');
                if (this.currentCollection === name) {
                    this.showListView();
                } else {
                    this.loadCollections();
                }
            }
        } catch (error) {
            this.showNotification('Failed to delete collection', 'error');
        }
    }

    // ===== UTILITIES =====

    sendMessage(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, response => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });
    }

    escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);

        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
          position: fixed; top: 16px; right: 16px;
          padding: 10px 16px;
          background: ${type === 'success' ? '#10b981' : '#ef4444'};
          color: white; border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1000; font-size: 13px;
          animation: slideIn 0.25s ease-out;
        `;

        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.25s ease-out';
            setTimeout(() => notification.remove(), 250);
        }, 3000);
    }
}

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SidebarUI();
});
