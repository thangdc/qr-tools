(function () {
'use strict';

var PAYMENT_BANK_ID = 'ACB';
var PAYMENT_ACCOUNT = '1709878';
var PAYMENT_ACCOUNT_NAME = 'DINH CONG THANG';
var PAYMENT_QR_BASE = 'https://img.vietqr.io/image/' + PAYMENT_BANK_ID + '-' + PAYMENT_ACCOUNT + '-compact2.png';

function formatVnd(value) {
    return new Intl.NumberFormat('vi-VN').format(Number(value) || 0) + 'đ';
}

function buildPaymentQrUrl(amount, email, plan) {
    var cleanEmail = String(email || '').trim();
    var addInfo = 'Mua QR - ' + (cleanEmail || 'Email');
    var params = new URLSearchParams();
    if (amount) params.set('amount', String(amount));
    params.set('addInfo', addInfo);
    params.set('accountName', PAYMENT_ACCOUNT_NAME);
    return PAYMENT_QR_BASE + '?' + params.toString();
}

function openPaymentModal(defaultPlan) {
    var modal = $('#vsPaymentModal');
    if (!modal.length) return;
    $('#vsPaymentPlan').val(defaultPlan || 'annual').trigger('change');
    $('#vsPaymentEmail').val('');
    updatePaymentQr();
    modal.addClass('is-open').attr('aria-hidden', 'false');
    $('body').addClass('vs-payment-modal-open');
    setTimeout(function () { $('#vsPaymentEmail').trigger('focus'); }, 50);
}

function closePaymentModal() {
    var modal = $('#vsPaymentModal');
    if (!modal.length) return;
    modal.removeClass('is-open').attr('aria-hidden', 'true');
    $('body').removeClass('vs-payment-modal-open');
}

function updatePaymentQr() {
    var plan = $('#vsPaymentPlan').val() || 'annual';
    var email = $('#vsPaymentEmail').val() || '';
    var amount = plan === 'annual' ? 199000 : 39000;
    var qrUrl = buildPaymentQrUrl(amount, email, plan);
    $('#vsPaymentQr').attr('src', qrUrl);
    $('#vsPaymentAmount').text(formatVnd(amount));
    $('#vsPaymentTransferContent').text(
        'Mua QR - ' + (email.trim() ? email.trim() : 'Email')
    );
}

$(function () {
    if (!$('#vsPaymentModal').length) return;

    window.VietSoftQrLicense.getActive().then(function (result) {
        if (result.valid) $('#vsUpgradePro').text('Pro đã kích hoạt').prop('disabled', true);
    });

    $('#vsUpgradePro').off('click').on('click', async function () {
        var button = $(this);
        var result = await window.VietSoftQrLicense.getActive();
        if (result.valid) {
            button.text('Pro đã kích hoạt').prop('disabled', true);
            return;
        }
        openPaymentModal('annual');
    });

    window.VietSoftQrPayment = {
        open: openPaymentModal,
        close: closePaymentModal
    };

    $('#vsPaymentPlan').on('change', updatePaymentQr);
    $('#vsPaymentEmail').on('input', updatePaymentQr);
    $('#vsPaymentModalClose').on('click', closePaymentModal);
    $('#vsPaymentModal').on('click', '[data-payment-close="true"]', closePaymentModal);

    $('#vsPaymentCopyContent').on('click', async function () {
        var content = $('#vsPaymentTransferContent').text();
        try {
            await navigator.clipboard.writeText(content);
            $('#vsPaymentCopyStatus').text('✓ Đã sao chép nội dung chuyển khoản');
        } catch (e) {
            $('#vsPaymentCopyStatus').text('Hãy bôi đen và sao chép nội dung chuyển khoản.');
        }
    });

    $('#vsPaymentDone').on('click', function () {
        var email = String($('#vsPaymentEmail').val() || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            $('#vsPaymentStatus').text('Vui lòng nhập email để nhận License Key.');
            $('#vsPaymentEmail').trigger('focus');
            return;
        }
        $('#vsPaymentStatus').html(
            '<strong>Đã chọn bước nhận License.</strong><br>' +
            'Sau khi xác nhận giao dịch, License Key sẽ được cấp cho <strong>' +
            $('<div>').text(email).html() +
            '</strong>. Vui lòng giữ đúng nội dung chuyển khoản để đối soát.'
        );
    });

    $(document).on('keydown.qrPaymentModal', function (e) {
        if (e.key === 'Escape') closePaymentModal();
    });
});
})();