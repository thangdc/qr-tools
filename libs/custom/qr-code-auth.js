(function () {
'use strict';

var SUPABASE_URL = 'https://yatmdgjkljmaohdkvzkd.supabase.co';
var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZTRNO7lC0PzRgIfNU9qWtQ_CvXdx6cV';
var supabaseClient = null;
var currentUser = null;
var AUTH_REDIRECT_PATH = '/qr-code-generator.html';

function getAuthRedirectUrl() {
    var host = String(window.location.hostname || '').toLowerCase();
    if (host === 'vietsofts.thangdc.com') return 'https://vietsofts.thangdc.com' + AUTH_REDIRECT_PATH;
    return window.location.origin + window.location.pathname;
}

function setStatus(message, isError) {
    $('#vsAuthStatus').text(message || '').toggleClass('is-error', !!isError);
}

function setBusy(busy) {
    $('#vsAuthSubmit,#vsAuthSignup,#vsAuthForgot,#vsAuthForgotSubmit,#vsAuthLogout').prop('disabled', !!busy);
}

function showMode(mode) {
    var isLogin = mode === 'login';
    var isSignup = mode === 'signup';
    var isForgot = mode === 'forgot';
    var isAccount = mode === 'account';

    $('#vsAuthLoginForm').toggle(!isAccount);
    $('#vsAuthAccountInfo').toggle(isAccount);
    $('#vsAuthLogout').toggle(isAccount);
    $('#vsAuthPasswordField').toggle(!isForgot && !isAccount);
    $('#vsAuthConfirmPasswordField').toggle(isSignup);
    $('#vsAuthSubmit').toggle(isLogin).text('Đăng nhập');
    $('#vsAuthSignup').toggle(isSignup).text('Tạo tài khoản');
    $('#vsAuthForgotSubmit').toggle(isForgot);
    $('#vsAuthForgot').toggle(isLogin);
    $('#vsAuthBackToLogin').toggle(!isLogin && !isAccount);
    $('#vsAuthCreateAccount').toggle(isLogin);
    $('#vsAuthForgotForm').toggle(false);
    $('#vsAuthTitle').text(isSignup ? 'Tạo tài khoản VietSoft' : isForgot ? 'Đặt lại mật khẩu' : isAccount ? 'Tài khoản VietSoft' : 'Đăng nhập VietSoft');
    if (isAccount && currentUser) $('#vsAuthAccountEmail').text(currentUser.email || '');
    setStatus('');
}

function openModal(mode) {
    $('#vsAuthModal').addClass('is-open').attr('aria-hidden', 'false');
    $('body').addClass('vs-auth-modal-open');
    showMode(mode || 'login');
    $('#vsAuthEmail').trigger('focus');
}

function closeModal() {
    $('#vsAuthModal').removeClass('is-open').attr('aria-hidden', 'true');
    $('body').removeClass('vs-auth-modal-open');
    setStatus('');
}

function updateAccountUi() {
    var loggedIn = !!currentUser;
    $('#vsAuthLoginButton').toggle(!loggedIn);
    $('#vsAuthAccount').toggle(loggedIn);
    if (loggedIn) {
        var email = currentUser.email || '';
        $('#vsAuthAccountEmail').text(email);
        $('#vsAuthAccountLabel').text(email);
    }
}

async function handleLogin() {
    var email = String($('#vsAuthEmail').val() || '').trim().toLowerCase();
    var password = String($('#vsAuthPassword').val() || '');
    if (!email || !password) {
        setStatus('Vui lòng nhập email và mật khẩu.', true);
        return;
    }

    setBusy(true);
    setStatus('Đang đăng nhập...');
    try {
        var result = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
        if (result.error) throw result.error;
        currentUser = result.data.user;
        updateAccountUi();
        $(document).trigger('vietsoft:auth-changed', [currentUser]);
        closeModal();
        if (window.vietsoftAnalytics) window.vietsoftAnalytics.track('auth_login');
    } catch (e) {
        setStatus(e && e.message ? e.message : 'Đăng nhập thất bại.', true);
    } finally {
        setBusy(false);
    }
}

async function handleSignup() {
    var email = String($('#vsAuthEmail').val() || '').trim().toLowerCase();
    var password = String($('#vsAuthPassword').val() || '');
    var confirmPassword = String($('#vsAuthConfirmPassword').val() || '');

    if (!email || !password) {
        setStatus('Vui lòng nhập email và mật khẩu.', true);
        return;
    }
    if (password.length < 6) {
        setStatus('Mật khẩu cần có ít nhất 6 ký tự.', true);
        return;
    }
    if (password !== confirmPassword) {
        setStatus('Mật khẩu xác nhận không khớp.', true);
        return;
    }

    setBusy(true);
    setStatus('Đang tạo tài khoản...');
    try {
        var result = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: getAuthRedirectUrl()
            }
        });
        if (result.error) throw result.error;
        if (result.data.session) {
            currentUser = result.data.user;
            updateAccountUi();
            $(document).trigger('vietsoft:auth-changed', [currentUser]);
            closeModal();
            setStatus('');
        } else {
            setStatus('Tài khoản đã được tạo. Vui lòng kiểm tra email để xác nhận tài khoản.');
        }
        if (window.vietsoftAnalytics) window.vietsoftAnalytics.track('auth_signup');
    } catch (e) {
        setStatus(e && e.message ? e.message : 'Không thể tạo tài khoản.', true);
    } finally {
        setBusy(false);
    }
}

async function handleForgotPassword() {
    var email = String($('#vsAuthEmail').val() || '').trim().toLowerCase();
    if (!email) {
        setStatus('Vui lòng nhập email.', true);
        return;
    }

    setBusy(true);
    setStatus('Đang gửi email đặt lại mật khẩu...');
    try {
        var result = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: getAuthRedirectUrl()
        });
        if (result.error) throw result.error;
        setStatus('Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.');
    } catch (e) {
        setStatus(e && e.message ? e.message : 'Không thể gửi email đặt lại mật khẩu.', true);
    } finally {
        setBusy(false);
    }
}

async function handleLogout() {
    setBusy(true);
    try {
        var result = await supabaseClient.auth.signOut();
        if (result.error) throw result.error;
        currentUser = null;
        updateAccountUi();
        $(document).trigger('vietsoft:auth-changed', [null]);
        closeModal();
        if (window.vietsoftAnalytics) window.vietsoftAnalytics.track('auth_logout');
    } catch (e) {
        setStatus(e && e.message ? e.message : 'Đăng xuất thất bại.', true);
    } finally {
        setBusy(false);
    }
}

async function init() {
    if (!window.supabase || !window.supabase.createClient) {
        console.warn('VietSoft Auth: Supabase client is not available.');
        return;
    }

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    var sessionResult = await supabaseClient.auth.getSession();
    if (sessionResult.data && sessionResult.data.session) {
        currentUser = sessionResult.data.session.user;
    }
    updateAccountUi();

    supabaseClient.auth.onAuthStateChange(function (event, session) {
        currentUser = session ? session.user : null;
        updateAccountUi();
        $(document).trigger('vietsoft:auth-changed', [currentUser]);
    });

    $('#vsAuthLoginButton').on('click', function () { openModal('login'); });
    $('#vsAuthAccount').on('click', function () { openModal('account'); });
    $('#vsAuthCreateAccount').on('click', function () { showMode('signup'); });
    $('#vsAuthModalClose').on('click', closeModal);
    $('#vsAuthModal').on('click', '[data-auth-close="true"]', closeModal);
    $('#vsAuthSubmit').on('click', handleLogin);
    $('#vsAuthSignup').on('click', handleSignup);
    $('#vsAuthForgot').on('click', function () { showMode('forgot'); });
    $('#vsAuthBackToLogin').on('click', function () { showMode('login'); });
    $('#vsAuthLogout').on('click', handleLogout);
    $('#vsAuthEmail,#vsAuthPassword,#vsAuthConfirmPassword').on('keydown', function (e) {
        if (e.key !== 'Enter') return;
        if ($('#vsAuthForgotForm').is(':visible')) handleForgotPassword();
        else if ($('#vsAuthConfirmPasswordField').is(':visible')) handleSignup();
        else handleLogin();
    });
    $('#vsAuthForgotSubmit').on('click', handleForgotPassword);
    $(document).on('keydown.vsAuth', function (e) {
        if (e.key === 'Escape') closeModal();
    });
}

window.VietSoftQrAuth = {
    getUser: function () { return currentUser; },
    isAuthenticated: function () { return !!currentUser; },
    open: openModal,
    close: closeModal
};

$(init);
})();