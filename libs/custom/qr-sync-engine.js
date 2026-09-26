(function (global) {
'use strict';

var SYNC_STATE_KEY = 'vietsoft_qr_sync_state_v1';
var syncing = false;
var SYNC_OVERLAP_MS = 5 * 60 * 1000;
var FULL_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
function emitStatus(status, message) { if (global.jQuery) global.jQuery(document).trigger('vietsoft:sync-status', [{status:status,message:message||''}]); }

function getState() {
    try {
        var state = JSON.parse(localStorage.getItem(SYNC_STATE_KEY) || 'null');
        return state && typeof state === 'object' ? state : {};
    } catch (e) {
        return {};
    }
}

function getPullWindow(state) {
    if (!state.lastSyncAt || state.forceFullSync) return { updatedAt: '', fullSync: true };

    var lastSyncTime = toTime(state.lastSyncAt);
    var fullSync = !state.lastFullSyncAt || (Date.now() - toTime(state.lastFullSyncAt)) >= FULL_SYNC_INTERVAL_MS;
    if (fullSync) return { updatedAt: '', fullSync: true };

    var overlapTime = Math.max(0, lastSyncTime - SYNC_OVERLAP_MS);
    return { updatedAt: new Date(overlapTime).toISOString(), fullSync: false };
}

function saveState(state) {
    try {
        localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state || {}));
    } catch (e) {}
}

function isProUser() {
    if (!global.VietSoftQrAuth || !global.VietSoftQrAuth.isAuthenticated()) return Promise.resolve(false);
    if (!global.VietSoftQrLicense || typeof global.VietSoftQrLicense.isPro !== 'function') return Promise.resolve(false);
    return global.VietSoftQrLicense.isPro();
}

function toTime(value) {
    var time = Date.parse(value || '');
    return isFinite(time) ? time : 0;
}

function getLocalRecords() {
    return global.VietSoftQrHistoryRepository.getAll().map(function (item) {
        return {
            historyId: String(item.historyId || ''),
            type: item.type,
            fields: item.fields || {},
            data: String(item.data || ''),
            design: item.design || {},
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            deletedAt: null
        };
    }).filter(function (item) {
        return !!item.historyId;
    });
}

function getLocalTombstones() {
    return global.VietSoftQrHistoryRepository.getTombstones().map(function (item) {
        return {
            historyId: String(item.historyId || ''),
            type: '',
            fields: {},
            data: '',
            design: {},
            createdAt: item.deletedAt,
            updatedAt: item.deletedAt,
            deletedAt: item.deletedAt
        };
    }).filter(function (item) {
        return !!item.historyId;
    });
}

function mergeByTimestamp(local, cloud) {
    var localMap = {};
    var cloudMap = {};

    local.forEach(function (item) { localMap[item.historyId] = item; });
    cloud.forEach(function (item) { cloudMap[item.historyId] = item; });

    var ids = {};
    Object.keys(localMap).forEach(function (id) { ids[id] = true; });
    Object.keys(cloudMap).forEach(function (id) { ids[id] = true; });

    var push = [];
    var appliedCloud = [];
    var localTombstonesToAck = [];

    Object.keys(ids).forEach(function (id) {
        var localItem = localMap[id] || null;
        var cloudItem = cloudMap[id] || null;

        if (!cloudItem) {
            if (localItem) push.push(localItem);
            return;
        }

        var localTime = toTime(localItem && localItem.updatedAt);
        var cloudTime = toTime(cloudItem.updatedAt);

        if (localItem && localTime > cloudTime) {
            push.push(localItem);
            return;
        }

        if (cloudTime >= localTime) {
            if (cloudItem.deletedAt) {
                global.VietSoftQrHistoryRepository.removeSynced(id);
                localTombstonesToAck.push(id);
            } else {
                global.VietSoftQrHistoryRepository.putSynced(cloudItem);
            }
            appliedCloud.push(id);
        }
    });

    return {
        push: push,
        appliedCloud: appliedCloud,
        localTombstonesToAck: localTombstonesToAck
    };
}

async function syncNow(reason) {
    if (syncing) return {ok: false, reason: 'busy'};
    if (!global.VietSoftQrHistoryRepository || !global.VietSoftQrCloudHistory) return {ok: false, reason: 'unavailable'};
    if (!(await isProUser())) { emitStatus('hidden'); return {ok: false, reason: 'not-pro'}; }
    emitStatus('syncing', 'Đang đồng bộ...');

    syncing = true;
    try {
        var state = getState();
        var user = await global.VietSoftQrCloudHistory.getAuthenticatedUser();
        if (!user) { emitStatus('hidden'); return {ok:false, reason:'not-authenticated'}; }
        if (state.userId && state.userId !== user.id) {
            state = { userId: user.id, forceFullSync: true };
        } else if (!state.userId) {
            state.userId = user.id;
            state.forceFullSync = true;
        }
        var pullWindow = getPullWindow(state);
        var pulled = await global.VietSoftQrCloudHistory.pullUpdatedSince(pullWindow.updatedAt, pullWindow.fullSync);
        if (!pulled.ok) { emitStatus('error', 'Đồng bộ thất bại'); return pulled;}

        var local = getLocalRecords().concat(getLocalTombstones());
        var merged = mergeByTimestamp(local, pulled.items || []);

        var pushItems = merged.push;
        if (pushItems.length) {
            var pushed = await global.VietSoftQrCloudHistory.upsert(pushItems);
            if (!pushed.ok) { emitStatus('error', 'Đồng bộ thất bại'); return pushed;}
        }

        if (merged.localTombstonesToAck.length) {
            global.VietSoftQrHistoryRepository.acknowledgeTombstones(merged.localTombstonesToAck);
        }

        var syncedAt = new Date().toISOString();
        saveState({
            userId: user.id,
            forceFullSync: false,
            lastSyncAt: syncedAt,
            lastFullSyncAt: pullWindow.fullSync ? syncedAt : (state.lastFullSyncAt || syncedAt),
            lastReason: reason || 'manual',
            lastSyncedAt: syncedAt
        });

        var result = {ok:true,pulled:(pulled.items||[]).length,pushed:pushItems.length};
        emitStatus('success', 'Đã đồng bộ');
        return result;
    } catch (e) {
        emitStatus('error', 'Đồng bộ thất bại');
        return {ok: false, reason: e && e.message ? e.message : 'Sync failed.'};
    } finally {
        syncing = false;
    }
}

function scheduleSync(reason) {
    if (syncing) return;
    setTimeout(function () { syncNow(reason); }, 250);
}

$(function () {
    $(document).on('vietsoft:auth-changed', function (e, user) {
        if (user) scheduleSync('auth-changed');
    });

    $(document).on('vietsoft:history-changed', function (e, reason) {
        scheduleSync('history-' + String(reason || 'changed'));
    });

    setTimeout(function () { scheduleSync('page-load'); }, 500);
});

global.VietSoftQrSync = {
    syncNow: syncNow,
    getState: getState
};
})(window);
