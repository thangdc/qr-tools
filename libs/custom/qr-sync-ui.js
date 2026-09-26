(function (global) {
'use strict';
function setSyncUi(payload) {
    payload=payload||{}; var status=payload.status||'hidden', button=$('#vsSyncStatus'), label=$('#vsSyncStatusLabel'), icon=$('#vsSyncStatusIcon');
    if(!button.length)return;
    button.removeClass('is-syncing is-error is-success');
    if(status==='hidden'){button.hide();return;}
    button.css('display','inline-flex');
    if(status==='checking'){icon.text('☁');label.text('Kiểm tra...');}
    else if(status==='syncing'){button.addClass('is-syncing');icon.text('↻');label.text(payload.message||'Đang đồng bộ...');}
    else if(status==='error'){button.addClass('is-error');icon.text('⚠');label.text(payload.message||'Đồng bộ lỗi');}
    else{button.addClass('is-success');icon.text('✓');label.text(payload.message||'Đã đồng bộ');}
}
$(function(){
    $(document).on('vietsoft:sync-status',function(e,payload){setSyncUi(payload);});
    $('#vsSyncStatus').on('click',function(){if(global.VietSoftQrSync&&!$(this).hasClass('is-syncing'))global.VietSoftQrSync.syncNow('manual');});
});
global.VietSoftQrSyncUi={setStatus:setSyncUi};
})(window);