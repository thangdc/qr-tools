(function (global) {
'use strict';

var STORAGE_KEY = 'vietsoft_qr_history_v2';
var TOMBSTONE_KEY = 'vietsoft_qr_history_tombstones_v1';
var MAX_ITEMS = 50;
var MAX_TOMBSTONES = 200;

function read() {
    try {
        var items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(items) ? items : [];
    } catch (e) {
        return [];
    }
}

function write(items) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        return true;
    } catch (e) {
        return false;
    }
}

function readTombstones() {
    try {
        var items = JSON.parse(localStorage.getItem(TOMBSTONE_KEY) || '[]');
        return Array.isArray(items) ? items : [];
    } catch (e) {
        return [];
    }
}

function writeTombstones(items) {
    try {
        localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(items.slice(-MAX_TOMBSTONES)));
        return true;
    } catch (e) {
        return false;
    }
}

function nowIso() {
    return new Date().toISOString();
}

function fallbackTimestamp(item) {
    var time = item && item.time ? Date.parse(item.time) : NaN;
    if (isFinite(time)) return new Date(time).toISOString();

    var idMatch = String(item && item.historyId || '').match(/^(\d{10,})-/);
    if (idMatch) return new Date(Number(idMatch[1])).toISOString();

    return new Date(0).toISOString();
}

function withTimestamps(item, timestamp) {
    var result = item || {};
    var fallback = timestamp || fallbackTimestamp(result);
    if (!result.createdAt) result.createdAt = fallback;
    if (!result.updatedAt) result.updatedAt = result.createdAt || fallback;
    return result;
}

function addTombstone(historyId, deletedAt) {
    var id = String(historyId || '');
    if (!id) return false;

    var items = readTombstones().filter(function (item) {
        return String(item.historyId || '') !== id;
    });
    items.push({historyId: id, deletedAt: deletedAt || nowIso()});
    return writeTombstones(items);
}

function emitChanged(reason) {
    if (global.jQuery) {
        global.jQuery(document).trigger('vietsoft:history-changed', [reason || 'changed']);
    }
}

global.VietSoftQrHistoryRepository = {
    getAll: function () {
        return read();
    },

    getTombstones: function () {
        return readTombstones();
    },

    save: function (item) {
        var items = read();
        var timestamp = nowIso();
        var saved = withTimestamps(item || {}, timestamp);
        saved.updatedAt = timestamp;
        if (!saved.createdAt) saved.createdAt = timestamp;
        items.unshift(saved);
        var ok = write(items.slice(0, MAX_ITEMS));
        if (ok) emitChanged('save');
        return ok;
    },

    saveMany: function (newItems) {
        var timestamp = nowIso();
        var incoming = (newItems || []).map(function (item) {
            var saved = withTimestamps(item || {}, timestamp);
            saved.updatedAt = timestamp;
            if (!saved.createdAt) saved.createdAt = timestamp;
            return saved;
        }).slice().reverse();
        var items = read();
        var ok = write(incoming.concat(items).slice(0, MAX_ITEMS));
        if (ok) emitChanged('saveMany');
        return ok;
    },

    update: function (historyId, updater) {
        var items = read();
        for (var i = 0; i < items.length; i++) {
            if (String(items[i] && items[i].historyId || '') === String(historyId || '')) {
                var updated = typeof updater === 'function' ? updater(items[i]) : updater;
                if (updated) {
                    withTimestamps(updated);
                    updated.updatedAt = nowIso();
                    items[i] = updated;
                }
                var ok = write(items);
                if (ok) emitChanged('update');
                return ok;
            }
        }
        return false;
    },

    remove: function (historyId) {
        var id = String(historyId || '');
        var items = read();
        var removed = null;
        var filtered = items.filter(function (item) {
            if (String(item && item.historyId || '') === id) {
                removed = item;
                return false;
            }
            return true;
        });
        if (!removed) return false;

        var deletedAt = nowIso();
        if (!addTombstone(id, deletedAt)) return false;
        var ok = write(filtered);
        if (ok) emitChanged('remove');
        return ok;
    },

    clearByType: function (type) {
        var items = read();
        var removed = items.filter(function (item) {
            return item && item.type === type;
        });
        if (!removed.length) return true;

        var deletedAt = nowIso();
        var tombstones = readTombstones();
        removed.forEach(function (item) {
            var id = String(item.historyId || '');
            if (!id) return;
            tombstones = tombstones.filter(function (entry) {
                return String(entry.historyId || '') !== id;
            });
            tombstones.push({historyId:id, deletedAt:deletedAt});
        });

        var ok = write(items.filter(function (item) {
            return !item || item.type !== type;
        })) && writeTombstones(tombstones);
        if (ok) emitChanged('clearByType');
        return ok;
    },

    replace: function (items) {
        var normalized = (items || []).slice(0, MAX_ITEMS).map(function (item) {
            return withTimestamps(item || {});
        });
        var ok = write(normalized);
        if (ok) emitChanged('replace');
        return ok;
    },

    putSynced: function (item) {
        if (!item || !item.historyId) return false;
        var items = read();
        var found = false;
        var normalized = withTimestamps(item);
        for (var i = 0; i < items.length; i++) {
            if (String(items[i].historyId || '') === String(normalized.historyId)) {
                items[i] = normalized;
                found = true;
                break;
            }
        }
        if (!found) items.unshift(normalized);
        var ok = write(items.slice(0, MAX_ITEMS));
        if (ok) {
            var id = String(normalized.historyId);
            var tombstones = readTombstones().filter(function (entry) {
                return String(entry.historyId || '') !== id;
            });
            writeTombstones(tombstones);
        }
        return ok;
    },

    removeSynced: function (historyId) {
        var id = String(historyId || '');
        if (!id) return false;
        var items = read();
        var filtered = items.filter(function (item) {
            return String(item && item.historyId || '') !== id;
        });
        var ok = write(filtered);
        if (ok) {
            var tombstones = readTombstones().filter(function (entry) {
                return String(entry.historyId || '') !== id;
            });
            writeTombstones(tombstones);
        }
        return ok;
    },

    acknowledgeTombstones: function (historyIds) {
        var ids = {};
        (historyIds || []).forEach(function (id) { ids[String(id || '')] = true; });
        var filtered = readTombstones().filter(function (entry) {
            return !ids[String(entry.historyId || '')];
        });
        return writeTombstones(filtered);
    }
};
})(window);
