(function (global) {
'use strict';

var SUPABASE_URL = 'https://yatmdgjkljmaohdkvzkd.supabase.co';
var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZTRNO7lC0PzRgIfNU9qWtQ_CvXdx6cV';
var client = null;

function getClient() {
    if (client) return client;
    if (!global.supabase || !global.supabase.createClient) return null;
    client = global.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    return client;
}

async function getAuthenticatedUser() {
    var supabaseClient = getClient();
    if (!supabaseClient) return null;
    var result = await supabaseClient.auth.getUser();
    if (result.error || !result.data || !result.data.user) return null;
    return result.data.user;
}

function mapItem(item, userId) {
    return {
        user_id: userId,
        history_id: String(item.historyId || ''),
        type: String(item.type || ''),
        fields: item.fields || {},
        data: String(item.data || ''),
        design: item.design || {},
        created_at: item.createdAt || item.created_at || new Date().toISOString(),
        updated_at: item.updatedAt || item.updated_at || item.createdAt || new Date().toISOString(),
        deleted_at: item.deletedAt || item.deleted_at || null
    };
}

async function upsert(items) {
    var user = await getAuthenticatedUser();
    if (!user) return { ok: false, reason: 'not-authenticated' };

    var rows = (items || []).filter(function (item) {
        return item && item.historyId;
    }).map(function (item) {
        return mapItem(item, user.id);
    });

    if (!rows.length) return { ok: true, count: 0 };

    var supabaseClient = getClient();
    var result = await supabaseClient
        .from('qr_items')
        .upsert(rows, { onConflict: 'user_id,history_id' });

    if (result.error) return { ok: false, reason: result.error.message };
    return { ok: true, count: rows.length };
}

async function pullUpdatedSince(updatedAt, fullSync) {
    var user = await getAuthenticatedUser();
    if (!user) return { ok: false, reason: 'not-authenticated', items: [] };

    var supabaseClient = getClient();
    var query = supabaseClient
        .from('qr_items')
        .select('history_id,type,fields,data,design,created_at,updated_at,deleted_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: true });

    if (updatedAt && !fullSync) query = query.gt('updated_at', updatedAt);

    var result = await query;
    if (result.error) return { ok: false, reason: result.error.message, items: [] };

    return {
        ok: true,
        items: (result.data || []).map(function (item) {
            return {
                historyId: item.history_id,
                type: item.type,
                fields: item.fields || {},
                data: item.data || '',
                design: item.design || {},
                createdAt: item.created_at,
                updatedAt: item.updated_at,
                deletedAt: item.deleted_at || null
            };
        })
    };
}

global.VietSoftQrCloudHistory = {
    isAvailable: function () {
        return !!getClient();
    },
    getAuthenticatedUser: getAuthenticatedUser,
    upsert: upsert,
    pullUpdatedSince: pullUpdatedSince
};
})(window);
