(function () {
'use strict';

var PUBLIC_KEY_SPKI_BASE64 = 'MCowBQYDK2VwAyEA3W76cnNqekQ1XCiC4gFn4R9FqOjCvnN0ntXZZZTboRY=';
var STORAGE_KEY = 'vietsoft_qr_license_v2';
var LEGACY_STORAGE_KEY = 'vietsoft_qr_license_v1';
var PRODUCT = 'vietsoft-qr';
var SUPABASE_URL = 'https://yatmdgjkljmaohdkvzkd.supabase.co';
var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZTRNO7lC0PzRgIfNU9qWtQ_CvXdx6cV';
var ACTIVATE_URL = SUPABASE_URL + '/functions/v1/activate-license';
var VALIDATE_URL = SUPABASE_URL + '/functions/v1/validate-license';
var DEACTIVATE_URL = SUPABASE_URL + '/functions/v1/deactivate-license';
var VALIDATION_GRACE_MS = 24 * 60 * 60 * 1000;

function base64UrlToBytes(value) {
    var normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    while (normalized.length % 4) normalized += '=';
    var binary = atob(normalized);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function utf8Bytes(value) {
    return new TextEncoder().encode(String(value || ''));
}

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function createDeviceId() {
    var existing = localStorage.getItem('vietsoft_qr_device_id');
    if (existing) return existing;
    var id = window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : 'web-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    localStorage.setItem('vietsoft_qr_device_id', id);
    return id;
}

function parseLicense(license) {
    var parts = String(license || '').trim().split('.');
    if (parts.length !== 3 || parts[0] !== 'VSQR1') throw new Error('License không hợp lệ.');
    var payloadJson = new TextDecoder().decode(base64UrlToBytes(parts[1]));
    var payload = JSON.parse(payloadJson);
    if (!payload || payload.product !== PRODUCT) throw new Error('License không dành cho VietSoft QR Code Generator.');
    return { raw: String(license || '').trim(), payload: payload, payloadPart: parts[1], signaturePart: parts[2] };
}

async function verifyLicense(license) {
    try {
        var parsed = parseLicense(license);
        var key = await crypto.subtle.importKey('spki', base64UrlToBytes(PUBLIC_KEY_SPKI_BASE64), { name: 'Ed25519' }, false, ['verify']);
        var valid = await crypto.subtle.verify({ name: 'Ed25519' }, key, base64UrlToBytes(parsed.signaturePart), utf8Bytes(parsed.payloadPart));
        if (!valid) return { valid: false, message: 'License không hợp lệ hoặc đã bị thay đổi.' };
        if (parsed.payload.expiresAt && new Date(parsed.payload.expiresAt + 'T23:59:59') < new Date()) {
            return { valid: false, message: 'License đã hết hạn.' };
        }
        return { valid: true, payload: parsed.payload, license: parsed.raw };
    } catch (e) {
        return { valid: false, message: e && e.message ? e.message : 'Không thể xác thực License.' };
    }
}

function getStoredState() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
        var legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) return { license: legacy, email: '', activationToken: '', deviceId: createDeviceId(), validatedAt: 0 };
    } catch (e) {}
    return null;
}

function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function callFunction(url, body) {
    var response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_PUBLISHABLE_KEY },
            body: JSON.stringify(body)
        });
    } catch (e) {
        throw new Error('Không thể kết nối máy chủ License.');
    }

    var data = {};
    try { data = await response.json(); } catch (e) {}
    if (!response.ok || !data.success) throw new Error(data.message || 'Máy chủ License từ chối yêu cầu.');
    return data;
}

async function activate(license, email) {
    var result = await verifyLicense(license);
    if (!result.valid) return result;

    var normalizedEmail = normalizeEmail(email);
    var licenseEmail = normalizeEmail(result.payload && result.payload.email);
    if (!normalizedEmail) return { valid: false, message: 'Vui lòng nhập email mua License.' };
    if (!licenseEmail) return { valid: false, message: 'License chưa chứa email. Vui lòng cấp lại License Key.' };
    if (licenseEmail !== normalizedEmail) return { valid: false, message: 'Email không khớp với License Key.' };

    var deviceId = createDeviceId();
    try {
        var server = await callFunction(ACTIVATE_URL, { email: normalizedEmail, licenseKey: result.license, deviceId: deviceId });
        saveState({
            license: result.license,
            email: normalizedEmail,
            deviceId: deviceId,
            activationToken: server.activationToken || '',
            validatedAt: Date.now()
        });
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return {
            valid: true,
            payload: Object.assign({}, result.payload, { email: normalizedEmail, expiresAt: server.expiresAt || result.payload.expiresAt || '' }),
            license: result.license
        };
    } catch (e) {
        return { valid: false, message: e && e.message ? e.message : 'Không thể kích hoạt License.' };
    }
}

async function getActiveLicense() {
    var state = getStoredState();
    if (!state || !state.license) return { valid: false, message: 'Chưa kích hoạt Pro.' };

    var local = await verifyLicense(state.license);
    if (!local.valid) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return local;
    }

    var email = normalizeEmail(state.email || (local.payload && local.payload.email));
    var deviceId = state.deviceId || createDeviceId();
    if (!state.activationToken) return { valid: false, message: 'License cần được kích hoạt lại trên máy chủ.' };

    try {
        var server = await callFunction(VALIDATE_URL, { email: email, deviceId: deviceId, activationToken: state.activationToken });
        state.email = email;
        state.deviceId = deviceId;
        state.validatedAt = Date.now();
        saveState(state);
        return {
            valid: true,
            payload: Object.assign({}, local.payload, { email: email, expiresAt: server.expiresAt || local.payload.expiresAt || '' }),
            license: local.license
        };
    } catch (e) {
        if (state.validatedAt && Date.now() - Number(state.validatedAt) <= VALIDATION_GRACE_MS) return local;
        return { valid: false, message: e && e.message ? e.message : 'Không thể xác thực License với máy chủ.' };
    }
}

async function clear() {
    var state = getStoredState();
    if (state && state.activationToken && state.deviceId) {
        try {
            await callFunction(DEACTIVATE_URL, {
                email: normalizeEmail(state.email),
                deviceId: state.deviceId,
                activationToken: state.activationToken
            });
        } catch (e) {}
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
}

window.VietSoftQrLicense = {
    activate: activate,
    verify: verifyLicense,
    getActive: getActiveLicense,
    isPro: async function () { return !!(await getActiveLicense()).valid; },
    clear: clear
};
})();