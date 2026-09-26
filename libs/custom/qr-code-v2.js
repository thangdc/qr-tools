(function () {
'use strict';

var currentType = 'url';
var currentData = '';
var currentImage = '';
var currentHistoryId = '';
var historySort = {key:'id', direction:'desc'};
var historyPage = 1;
var historyPageSize = 10;
var historySearch = '';
var selectedHistoryIds = {};
var configKey = 'vietsoft_qr_config_v1';
var activeTabKey = 'vietsoft_qr_active_tab_v1';
var currentQrKey = 'vietsoft_qr_current_v1';
var qrConfig = {size:300, level:'M'};
var FREE_BRAND_LOGO_URL = '/images/logo.png?v=20260922';
var currentDesign = {foreground:'#111827', background:'#FFFFFF', style:'square', logoDataUrl:FREE_BRAND_LOGO_URL};
var locationMap = null;
var locationMarker = null;
var locationTileLayer = null;
var locationTileLayerIndex = 0;
var locationTileLayerErrors = 0;
var locationTileLayers = [
    {url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:'&copy; OpenStreetMap contributors'},
    {url:'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',attribution:'&copy; OpenStreetMap contributors, Tiles style by HOT'},
    {url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',attribution:'Sources: Esri, DeLorme, HERE, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom'}
];

var exportTemplates = {
    url: {
        templateId: 6,
        templateName: 'Trang Web',
        columns: ['ID', 'Địa chỉ trang web'],
        getRow: function (item, id) { return [id, item.fields.url || '']; }
    },
    text: {
        templateId: 9,
        templateName: 'Văn Bản',
        columns: ['ID', 'Nội Dung'],
        getRow: function (item, id) { return [id, item.fields.text || '']; }
    },
    phone: {
        templateId: 3,
        templateName: 'Điện Thoại',
        columns: ['ID', 'Số Điện Thoại'],
        getRow: function (item, id) { return [id, item.fields.phone || '']; }
    },
    sms: {
        templateId: 5,
        templateName: 'Tin Nhắn SMS',
        columns: ['ID', 'Số Điện Thoại', 'Nội Dung'],
        getRow: function (item, id) { return [id, item.fields.phone || '', item.fields.body || '']; }
    },
    email: {
        templateId: 2,
        templateName: 'Địa chỉ Email',
        columns: ['ID', 'Email', 'Tiêu Đề', 'Nội Dung'],
        getRow: function (item, id) { return [id, item.fields.email || '', item.fields.subject || '', item.fields.body || '']; }
    },
    contact: {
        templateId: 8,
        templateName: 'Thông Tin Liên Hệ',
        columns: ['ID', 'Họ Tên', 'Số Điện Thoại', 'Website', 'Email', 'Địa chỉ'],
        getRow: function (item, id) {
            return [id, item.fields.name || '', item.fields.phone || '', item.fields.website || '', item.fields.email || '', item.fields.address || ''];
        }
    },
    wifi: {
        templateId: 7,
        templateName: 'Wi-Fi',
        columns: ['ID', 'Tên mạng (SSID)', 'Mật khẩu', 'Bảo mật', 'Mạng ẩn'],
        getRow: function (item, id) { return [id, item.fields.ssid || '', item.fields.password || '', item.fields.auth || '', item.fields.hidden ? 'Có' : 'Không']; }
    },
    location: {
        templateId: 10,
        templateName: 'Vị trí',
        columns: ['ID', 'Latitude', 'Longitude'],
        getRow: function (item, id) { return [id, item.fields.latitude || '', item.fields.longitude || '']; }
    },
    payment: {
        templateId: 11,
        templateName: 'Thanh toán',
        columns: ['ID', 'Ngân hàng', 'Số tài khoản', 'Tên tài khoản', 'Số tiền', 'Nội dung', 'Khóa số tiền'],
        getRow: function (item, id) { return [id, item.fields.bankName || item.fields.bankBin || '', item.fields.account || '', item.fields.accountName || '', item.fields.amount || '', item.fields.description || '', item.fields.lockAmount ? 'Có' : 'Không']; }
    },
    product: {
        templateId: 4,
        templateName: 'Sản Phẩm',
        columns: ['ID', 'Tên Sản Phẩm', 'Mô Tả', 'Giá'],
        getRow: function (item, id) { return [id, item.fields.name || '', item.fields.description || '', item.fields.price || '']; }
    }
};

function loadQrConfig() {
    try {
        var saved = JSON.parse(localStorage.getItem(configKey) || 'null');
        if (saved && ['220','300','400','500'].indexOf(String(saved.size)) !== -1 && ['L','M','Q','H'].indexOf(String(saved.level)) !== -1) {
            qrConfig = {size:parseInt(saved.size, 10), level:String(saved.level)};
        }
    } catch (e) {}
}

function saveQrConfig() {
    qrConfig.size = parseInt($('#vsSize').val(), 10) || 300;
    qrConfig.level = $('#vsLevel').val() || 'M';
    localStorage.setItem(configKey, JSON.stringify(qrConfig));
}

function applyQrConfig() {
    $('#vsSize').val(String(qrConfig.size));
    $('#vsLevel').val(qrConfig.level);
}

function track(name, params) {
    if (window.vietsoftAnalytics) window.vietsoftAnalytics.track(name, params || {});
}

function esc(value) {
    return String(value == null ? '' : value).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

var fields = {
    url: {title:'Tạo QR cho URL', html:'<div class="vs-field"><label>URL</label><input id="vsUrl" type="url" placeholder="https://example.com"></div>'},
    text: {title:'Tạo QR cho văn bản', html:'<div class="vs-field"><label>Nội dung</label><textarea id="vsText" rows="7" placeholder="Nhập nội dung cần mã hóa..."></textarea></div>'},
    contact: {title:'Tạo QR cho liên hệ', html:'<div class="vs-grid2"><div class="vs-field"><label>Họ tên</label><input id="vsName"></div><div class="vs-field"><label>Điện thoại</label><input id="vsPhone"></div></div><div class="vs-grid2"><div class="vs-field"><label>Email</label><input id="vsEmail"></div><div class="vs-field"><label>Website</label><input id="vsWebsite" placeholder="https://"></div></div><div class="vs-field"><label>Địa chỉ</label><input id="vsAddress"></div>'},
    wifi: {title:'Tạo QR cho Wi-Fi', html:'<div class="vs-field"><label>Tên mạng (SSID)</label><input id="vsSsid" placeholder="My Wi-Fi"></div><div class="vs-grid2"><div class="vs-field"><label>Mật khẩu</label><input id="vsWifiPass" type="password"></div><div class="vs-field"><label>Bảo mật</label><select id="vsWifiAuth"><option value="WPA">WPA/WPA2</option><option value="WEP">WEP</option><option value="nopass">Không mật khẩu</option></select></div></div><div class="vs-field"><label><input id="vsHidden" type="checkbox" style="width:auto"> Mạng ẩn</label></div>'},
    email: {title:'Tạo QR cho Email', html:'<div class="vs-field"><label>Email</label><input id="vsEmailTo" type="email"></div><div class="vs-field"><label>Tiêu đề</label><input id="vsEmailSubject"></div><div class="vs-field"><label>Nội dung</label><textarea id="vsEmailBody" rows="5"></textarea></div>'},
    phone: {title:'Tạo QR cho số điện thoại', html:'<div class="vs-field"><label>Số điện thoại</label><input id="vsPhoneNumber" type="tel" placeholder="+84..."></div>'},
    sms: {title:'Tạo QR cho SMS', html:'<div class="vs-field"><label>Số điện thoại</label><input id="vsSmsPhone" type="tel"></div><div class="vs-field"><label>Nội dung</label><textarea id="vsSmsBody" rows="5"></textarea></div>'},
    location: {title:'Tạo QR cho vị trí', html:'<div class="vs-location-search"><input id="vsLocationSearch" type="search" placeholder="Tìm địa chỉ hoặc địa điểm..." aria-label="Tìm địa chỉ hoặc địa điểm"><button class="vs-btn vs-btn-secondary" id="vsLocationSearchButton" type="button">Tìm</button></div><div id="vsLocationMap" class="vs-location-map"></div><div class="vs-location-selected"><span id="vsLocationAddress">Chọn một điểm trên bản đồ</span><span id="vsLocationCoords">10.787780, 106.662483</span></div><input id="vsLat" type="hidden" value="10.78778"><input id="vsLng" type="hidden" value="106.662483"><p class="vs-location-help">Nhấp vào bản đồ hoặc kéo ghim để chọn vị trí. Có thể tìm địa chỉ ở ô phía trên.</p>'},
    payment: {title:'Tạo QR thanh toán', html:'<div class="vs-field"><label>Ngân hàng</label><select id="vsPaymentBank"><option value="">Đang tải danh sách ngân hàng...</option></select></div><div class="vs-grid2"><div class="vs-field"><label>Số tài khoản</label><input id="vsPaymentAccount" inputmode="numeric" placeholder="Số tài khoản nhận tiền"></div><div class="vs-field"><label>Tên tài khoản</label><input id="vsPaymentAccountName" placeholder="NGUYEN VAN A"></div></div><div class="vs-grid2"><div class="vs-field"><label>Số tiền <span class="vs-label-muted">(tùy chọn)</span></label><input id="vsPaymentAmount" inputmode="numeric" placeholder="299000"></div><div class="vs-field"><label>Nội dung chuyển khoản</label><input id="vsPaymentDescription" maxlength="25" placeholder="THANH TOAN DON HANG"></div></div><div class="vs-field"><label><input id="vsPaymentLockAmount" type="checkbox" style="width:auto"> Khóa số tiền trong QR</label><p class="vs-location-help">Bật để QR tự điền số tiền. Tắt để khách nhập số tiền khi thanh toán.</p></div><p class="vs-location-help">QR được tạo theo định dạng VietQR/EMVCo và xử lý ngay trên trình duyệt.</p>'}
};


function renderResultDesignPanel() {
    var container = $('.vs-result');
    if (!container.length || $('#vsResultDesign').length) return;
    var html = '<div class="vs-result-design" id="vsResultDesign">' +
        '<div class="vs-result-design-header">' +
            '<div><div class="vs-result-design-kicker">Tùy chỉnh</div><h3>Thiết kế QR</h3><p class="vs-result-design-summary">Kích thước, màu sắc, kiểu điểm và logo</p></div>' +
            '<button class="vs-result-design-toggle" id="vsResultDesignToggle" type="button" aria-expanded="false"><span>Tùy chỉnh QR</span><span class="vs-result-design-chevron" aria-hidden="true">⌄</span></button>' +
        '</div>' +
        '<div class="vs-result-design-body" id="vsResultDesignBody">' +
        '<div class="vs-grid2">' +
        '<div class="vs-field"><label>Màu QR</label><div class="vs-color-control"><input id="vsDesignForeground" type="color" value="#111827"><input id="vsDesignForegroundText" type="text" value="#111827" maxlength="7" aria-label="Mã màu QR"></div></div>' +
        '<div class="vs-field"><label>Màu nền</label><div class="vs-color-control"><input id="vsDesignBackground" type="color" value="#FFFFFF"><input id="vsDesignBackgroundText" type="text" value="#FFFFFF" maxlength="7" aria-label="Mã màu nền"></div></div>' +
        '</div>' +
        '<div class="vs-field"><label>Kiểu điểm</label><select id="vsDesignStyle"><option value="square">Vuông</option><option value="rounded">Bo góc</option><option value="dot">Chấm</option></select></div>' +
        '<div class="vs-field"><label>Logo <span class="vs-label-muted">(tùy chọn)</span></label><input id="vsDesignLogo" type="file" accept="image/png,image/jpeg,image/webp"><div id="vsDesignLogoName" class="vs-design-file-name">Chưa chọn logo</div></div>' +
        '<div class="vs-design-advanced"><div class="vs-design-advanced-title">Nâng cao</div><div class="vs-grid2"><div class="vs-field"><label>Mắt QR</label><select id="vsDesignEyeStyle"><option value="square">Vuông</option><option value="rounded">Bo góc</option></select></div><div class="vs-field"><label>Kích thước logo</label><select id="vsDesignLogoSize"><option value="0.12">Nhỏ</option><option value="0.16" selected>Vừa</option><option value="0.20">Lớn</option><option value="0.24">Rất lớn</option></select></div></div><div class="vs-field"><label>Khoảng trắng</label><select id="vsDesignQuietZone"><option value="2">2 module</option><option value="4" selected>4 module</option><option value="6">6 module</option></select></div></div>' +
        '<div class="vs-design-warning" id="vsDesignWarning">Tạo QR trước, sau đó bạn có thể tùy chỉnh.</div>' +
        '<div class="vs-actions"><button class="vs-btn vs-btn-primary" id="vsApplyDesign" type="button" disabled><svg class="vs-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8-5-3.6-5 3.6 1.9-5.8L4 8.8h6.1L12 3z"/></svg><span>Áp dụng thiết kế</span></button><button class="vs-btn vs-btn-secondary" id="vsResetDesign" type="button">Đặt lại</button></div>' +
        '</div></div>';
    container.find('.vs-result-config').after(html);
    $('#vsResultDesignBody').prepend(container.find('.vs-result-config'));
    syncDesignColorControls();
    syncDesignFields(currentDesign);
    $('#vsApplyDesign').prop('disabled', !currentData);
    $('#vsDesignWarning').text(currentData ? '✓ Bạn có thể thay đổi thiết kế và xem kết quả ngay.' : 'Tạo QR trước, sau đó bạn có thể tùy chỉnh.');
}

function syncDesignColorControls() {
    $('#vsResultDesignToggle').on('click', function(){
        var expanded = $(this).attr('aria-expanded') === 'true';
        $(this).attr('aria-expanded', String(!expanded));
        $('#vsResultDesignBody').stop(true, true).slideToggle(160);
    });

    $('#vsDesignForeground').on('input', function(){ $('#vsDesignForegroundText').val($(this).val()); if (currentData) renderCustomQr(); });
    $('#vsDesignBackground').on('input', function(){ $('#vsDesignBackgroundText').val($(this).val()); if (currentData) renderCustomQr(); });
    $('#vsDesignForegroundText,#vsDesignBackgroundText').on('change', function(){
        var valueText = $(this).val().trim();
        if (/^#[0-9a-fA-F]{6}$/.test(valueText)) {
            var target = this.id === 'vsDesignForegroundText' ? '#vsDesignForeground' : '#vsDesignBackground';
            $(target).val(valueText).trigger('input');
        }
    });
    $('#vsDesignStyle,#vsDesignEyeStyle,#vsDesignLogoSize,#vsDesignQuietZone').on('change', function(){ if (currentData) renderCustomQr(); });
    $('#vsDesignLogo').on('change', function(){
        var file = this.files && this.files[0];
        $('#vsDesignLogoName').text(file ? file.name : 'Chưa chọn logo');
        if (currentData) renderCustomQr();
    });
    $('#vsApplyDesign').on('click', applyDesign);
    $('#vsResetDesign').on('click', function(){
        currentDesign = normalizeDesign({foreground:'#111827', background:'#FFFFFF', style:'square', logoDataUrl:''});
        syncDesignFields(currentDesign);
        $('#vsDesignLogo').val('');
        if (currentData) {
            renderCustomQr();
            persistCurrentDesign(currentDesign);
            saveCurrentQrState();
        } else {
            $('#vsApplyDesign').prop('disabled', true);
            $('#vsDesignWarning').text('Tạo QR trước, sau đó bạn có thể tùy chỉnh.');
        }
        setStatus('✓ Đã đặt lại thiết kế QR');
    });
}

function drawRoundedRect(ctx, x, y, size, radius) {
    var r = Math.min(radius, size / 2);
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+size,y,x+size,y+size,r); ctx.arcTo(x+size,y+size,x,y+size,r); ctx.arcTo(x,y+size,x,y,r); ctx.arcTo(x,y,x+size,y,r); ctx.closePath(); ctx.fill();
}

function isFinderModule(row, col, count) {
    return (row < 7 && col < 7) || (row < 7 && col >= count - 7) || (row >= count - 7 && col < 7);
}

function drawFinder(ctx, x, y, moduleSize, foreground, background, style) {
    var size = moduleSize * 7;
    var inner = moduleSize * 5;
    var center = moduleSize * 3;
    if (style === 'rounded') {
        ctx.fillStyle = foreground;
        drawRoundedRect(ctx, x, y, size, Math.min(moduleSize * 1.2, size / 4));
        ctx.fillStyle = background;
        drawRoundedRect(ctx, x + moduleSize, y + moduleSize, inner, Math.min(moduleSize * 0.9, inner / 4));
        ctx.fillStyle = foreground;
        drawRoundedRect(ctx, x + moduleSize * 2, y + moduleSize * 2, center, Math.min(moduleSize * 0.7, center / 4));
        return;
    }
    ctx.fillStyle = foreground; ctx.fillRect(x, y, size, size);
    ctx.fillStyle = background; ctx.fillRect(x + moduleSize, y + moduleSize, inner, inner);
    ctx.fillStyle = foreground; ctx.fillRect(x + moduleSize * 2, y + moduleSize * 2, center, center);
}

var qrRenderSequence = 0;

function renderQrImage(data, design, size, callback, onError, allowConcurrent) {
    onError = onError || function() {};
    if (!data || typeof qrcode !== 'function') {
        onError(new Error('QR renderer is unavailable.'));
        return false;
    }
    var renderSequence = ++qrRenderSequence;
    design = normalizeDesign(design);
    var level = design.logoDataUrl ? 'H' : (qrConfig.level || 'M');
    var qr;
    try {
        qr = qrcode(0, level);
        qr.addData(data);
        qr.make();
    } catch (e) {
        onError(e);
        return false;
    }
    var count = qr.getModuleCount();
    var canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
    var ctx = canvas.getContext('2d');
    var foreground = design.foreground, background = design.background, style = design.style;
    ctx.fillStyle = background; ctx.fillRect(0, 0, size, size);
    var quiet = design.quietZone, total = count + quiet * 2, moduleSize = size / total, offset = quiet * moduleSize;
    for (var row=0; row<count; row++) for (var col=0; col<count; col++) {
        if (!qr.isDark(row,col) || isFinderModule(row,col,count)) continue;
        var x=offset+col*moduleSize, y=offset+row*moduleSize;
        ctx.fillStyle=foreground;
        if (style === 'dot') { ctx.beginPath(); ctx.arc(x+moduleSize/2,y+moduleSize/2,moduleSize*.42,0,Math.PI*2); ctx.fill(); }
        else if (style === 'rounded') drawRoundedRect(ctx,x+moduleSize*.08,y+moduleSize*.08,moduleSize*.84,moduleSize*.84);
        else ctx.fillRect(x,y,Math.ceil(moduleSize+.1),Math.ceil(moduleSize+.1));
    }
    drawFinder(ctx, offset, offset, moduleSize, foreground, background, design.eyeStyle);
    drawFinder(ctx, offset + (count-7)*moduleSize, offset, moduleSize, foreground, background, design.eyeStyle);
    drawFinder(ctx, offset, offset + (count-7)*moduleSize, moduleSize, foreground, background, design.eyeStyle);
    var done = function(logo){
        if (!allowConcurrent && renderSequence !== qrRenderSequence) return;
        if (logo) {
            var logoSize=size*design.logoSize, lx=(size-logoSize)/2, ly=(size-logoSize)/2;
            var padding=Math.max(4, Math.round(size*.012));
            ctx.fillStyle=background; ctx.fillRect(lx-padding,ly-padding,logoSize+padding*2,logoSize+padding*2);
            ctx.drawImage(logo,lx,ly,logoSize,logoSize);
        }
        callback(canvas.toDataURL('image/png'));
    };
    if (design.logoDataUrl) {
        var logo=new Image();
        logo.onload=function(){done(logo);};
        logo.onerror=function(){done(null);};
        logo.src=design.logoDataUrl;
    } else done(null);
    return true;
}

function renderCustomQr() {
    if (!currentData) return false;
    var design = normalizeDesign({
        foreground: $('#vsDesignForeground').val(),
        background: $('#vsDesignBackground').val(),
        style: $('#vsDesignStyle').val(),
        eyeStyle: $('#vsDesignEyeStyle').val(),
        logoSize: $('#vsDesignLogoSize').val(),
        quietZone: $('#vsDesignQuietZone').val()
    });
    getCurrentDesign(function(captured) {
        currentDesign = captured;
        renderQrImage(currentData, captured, qrConfig.size || 300, function(imageUrl) {
            currentImage = imageUrl;
            var preview=document.getElementById('vsPreview'); preview.innerHTML='';
            var img=new Image(); img.alt='QR Code'; img.src=currentImage; preview.appendChild(img);
            $('#vsDownload,#vsCopy,#vsOpen').prop('disabled',false);
            saveCurrentQrState();
            setStatus('✓ Thiết kế QR đã được áp dụng');
        });
    });
    return true;
}
function applyDesign() {
    getCurrentDesign(function(design) {
        currentDesign = design;
        renderQrImage(currentData, design, qrConfig.size || 300, function(imageUrl) {
            currentImage = imageUrl;
            var preview=document.getElementById('vsPreview'); preview.innerHTML='';
            var img=new Image(); img.alt='QR Code'; img.src=currentImage; preview.appendChild(img);
            $('#vsDownload,#vsCopy,#vsOpen').prop('disabled',false);
            persistCurrentDesign(design);
            saveCurrentQrState();
            setStatus('✓ Thiết kế QR đã được áp dụng và lưu');
        });
    });
}

function renderFields(type) {
    var typeChanged = currentType !== type;
    if (typeChanged) clearHistorySelection();
    currentType = type;
    historySearch = '';
    historyPage = 1;
    historySort = {key:'id', direction:'desc'};
    $('#vsGenerate').closest('.vs-actions').show();
    $('#vsResultDesign').show();
    $('.vs-history').show();
    $('#vsFormTitle').text(fields[type].title);
    $('#vsFields').html(fields[type].html);
    $('#vsStatus').text('');
    if (typeChanged) {
        currentData = '';
        currentImage = '';
        currentHistoryId = '';
        currentDesign = normalizeDesign({});
        try { localStorage.removeItem(currentQrKey); } catch (e) {}
    }
    $('#vsTabs a').removeClass('active').filter('[data-type="' + type + '"]').addClass('active');
    if (locationMap) { locationMap.remove(); locationMap = null; locationMarker = null; }
    renderHistory();
    if (type === 'location') initLocationMap();
    if (type === 'payment') loadPaymentBanks();
    if ($('#vsResultDesign').length) {
        syncDesignFields(currentDesign);
        $('#vsApplyDesign').prop('disabled', !currentData);
        $('#vsDesignWarning').text(currentData ? '✓ Bạn có thể thay đổi thiết kế và xem kết quả ngay.' : 'Tạo QR trước, sau đó bạn có thể tùy chỉnh.');
    }
    track('qr_type_select', {qr_type:type});
}

function value(id) { return $('#' + id).val() || ''; }

function setLocation(lat, lng, address) {
    lat = parseFloat(lat);
    lng = parseFloat(lng);
    if (!isFinite(lat) || !isFinite(lng)) return;

    $('#vsLat').val(lat.toFixed(6));
    $('#vsLng').val(lng.toFixed(6));
    $('#vsLocationCoords').text(lat.toFixed(6) + ', ' + lng.toFixed(6));
    if (address) $('#vsLocationAddress').text(address);

    var point = [lat, lng];
    if (locationMarker) {
        locationMarker.setLatLng(point);
    } else if (locationMap) {
        locationMarker = L.marker(point, {draggable:true}).addTo(locationMap);
        locationMarker.on('dragend', function () {
            var p = locationMarker.getLatLng();
            setLocation(p.lat, p.lng);
            reverseGeocode(p.lat, p.lng);
        });
    }
    if (locationMap) locationMap.setView(point, Math.max(locationMap.getZoom(), 15));
}

function reverseGeocode(lat, lng) {
    var url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lng) + '&accept-language=vi';
    fetch(url, {headers:{'Accept':'application/json'}}).then(function(response) {
        if (!response.ok) throw new Error('Reverse geocoding failed');
        return response.json();
    }).then(function(result) {
        if (result && result.display_name) $('#vsLocationAddress').text(result.display_name);
    }).catch(function(){});
}

function searchLocation() {
    var query = value('vsLocationSearch').trim();
    if (!query) return;
    var button = $('#vsLocationSearchButton');
    button.prop('disabled', true).text('Đang tìm...');
    var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=vi&q=' + encodeURIComponent(query);
    fetch(url, {headers:{'Accept':'application/json'}}).then(function(response) {
        if (!response.ok) throw new Error('Search failed');
        return response.json();
    }).then(function(results) {
        if (!results.length) {
            $('#vsLocationAddress').text('Không tìm thấy địa điểm.');
            return;
        }
        var result = results[0];
        setLocation(result.lat, result.lon, result.display_name);
    }).catch(function() {
        $('#vsLocationAddress').text('Không thể tìm địa điểm lúc này.');
    }).finally(function() {
        button.prop('disabled', false).text('Tìm');
    });
}

function addLocationTileLayer() {
    if (!locationMap || typeof L === 'undefined') return;
    if (locationTileLayer) { locationMap.removeLayer(locationTileLayer); locationTileLayer = null; }
    var config = locationTileLayers[locationTileLayerIndex];
    if (!config) return;
    locationTileLayerErrors = 0;
    locationTileLayer = L.tileLayer(config.url, {maxZoom:19,crossOrigin:true,attribution:config.attribution});
    locationTileLayer.on('tileerror', function () {
        locationTileLayerErrors += 1;
        if (locationTileLayerErrors >= 3 && locationTileLayerIndex < locationTileLayers.length - 1) {
            locationTileLayerIndex += 1; addLocationTileLayer();
        }
    });
    locationTileLayer.addTo(locationMap);
}

function initLocationMap() {
    var element = document.getElementById('vsLocationMap');
    if (!element || typeof L === 'undefined') return;
    locationTileLayerIndex = 0;
    locationMap = L.map(element, {preferCanvas:true}).setView([10.78778, 106.662483], 13);
    addLocationTileLayer();
    locationMap.on('click', function(e) { setLocation(e.latlng.lat, e.latlng.lng); reverseGeocode(e.latlng.lat, e.latlng.lng); });
    $('#vsLocationSearchButton').on('click', searchLocation);
    $('#vsLocationSearch').on('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); searchLocation(); } });
    function refreshLocationMap() {
        if (!locationMap) return;
        locationMap.invalidateSize(true);
        if (locationTileLayer) locationTileLayer.redraw();
    }
    setTimeout(refreshLocationMap,100); setTimeout(refreshLocationMap,500); setTimeout(refreshLocationMap,1000);
}
function getRecord() {
    switch(currentType) {
        case 'url': return {fields:{url:value('vsUrl')}};
        case 'text': return {fields:{text:value('vsText')}};
        case 'contact': return {fields:{name:value('vsName'),phone:value('vsPhone'),website:value('vsWebsite'),email:value('vsEmail'),address:value('vsAddress')}};
        case 'wifi': return {fields:{ssid:value('vsSsid'),password:value('vsWifiPass'),auth:value('vsWifiAuth'),hidden:$('#vsHidden').prop('checked')}};
        case 'email': return {fields:{email:value('vsEmailTo'),subject:value('vsEmailSubject'),body:value('vsEmailBody')}};
        case 'phone': return {fields:{phone:value('vsPhoneNumber')}};
        case 'sms': return {fields:{phone:value('vsSmsPhone'),body:value('vsSmsBody')}};
        case 'location': return {fields:{latitude:value('vsLat'),longitude:value('vsLng')}};
        case 'payment': return {fields:{bankBin:value('vsPaymentBank'),bankName:$('#vsPaymentBank option:selected').text(),account:value('vsPaymentAccount'),accountName:value('vsPaymentAccountName'),amount:value('vsPaymentAmount'),description:value('vsPaymentDescription'),lockAmount:$('#vsPaymentLockAmount').prop('checked')}};
    }
    return {fields:{}};
}


function normalizePaymentText(value, maxLength) {
    var text = String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    text = text.replace(/[Đđ]/g, function(ch) { return ch === 'Đ' ? 'D' : 'd'; });
    text = text.toUpperCase().replace(/[^A-Z0-9 .\-_/]/g, ' ').replace(/\s+/g, ' ').trim();
    return maxLength ? text.substring(0, maxLength) : text;
}

function paymentTlv(id, value) {
    value = String(value == null ? '' : value);
    return id + String(value.length).padStart(2, '0') + value;
}

function crc16CcittFalse(value) {
    var crc = 0xFFFF;
    for (var i = 0; i < value.length; i++) {
        crc ^= value.charCodeAt(i) << 8;
        for (var bit = 0; bit < 8; bit++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function buildPaymentData(f) {
    var bankBin = String(f.bankBin || '').trim();
    var account = String(f.account || '').trim();
    var accountName = normalizePaymentText(f.accountName, 25);
    var description = normalizePaymentText(f.description, 25);
    var amount = String(f.amount || '').replace(/[^0-9]/g, '');
    var bankAccount = paymentTlv('00', bankBin) + paymentTlv('01', account);
    var merchantInfo = paymentTlv('00', 'A000000727') + paymentTlv('01', bankAccount) + paymentTlv('02', 'QRIBFTTA');
    var payload = paymentTlv('00', '01') +
        paymentTlv('01', f.lockAmount && amount ? '12' : '11') +
        paymentTlv('38', merchantInfo) +
        paymentTlv('53', '704');
    if (f.lockAmount && amount) payload += paymentTlv('54', amount);
    payload += paymentTlv('58', 'VN') + paymentTlv('59', accountName);
    if (description) payload += paymentTlv('62', paymentTlv('08', description));
    return payload + '6304' + crc16CcittFalse(payload + '6304');
}

function loadPaymentBanks() {
    var fallback = [
        {bin:'970436',name:'Vietcombank'},
        {bin:'970415',name:'VietinBank'},
        {bin:'970418',name:'BIDV'},
        {bin:'970422',name:'MBBank'},
        {bin:'970407',name:'Techcombank'},
        {bin:'970432',name:'VPBank'},
        {bin:'970416',name:'ACB'},
        {bin:'970423',name:'TPBank'},
        {bin:'970441',name:'VIB'},
        {bin:'970403',name:'Sacombank'},
        {bin:'970437',name:'HDBank'},
        {bin:'970405',name:'Agribank'}
    ];
    var select = $('#vsPaymentBank');
    if (!select.length) return;
    var render = function(banks) {
        var selected = select.val() || '';
        select.empty().append('<option value="">Chọn ngân hàng</option>');
        banks.filter(function(bank) { return bank && bank.bin && bank.name; })
            .sort(function(a,b) { return String(a.name).localeCompare(String(b.name), 'vi'); })
            .forEach(function(bank) {
                $('<option>').val(String(bank.bin)).text(String(bank.name)).appendTo(select);
            });
        if (selected) select.val(selected);
    };
    render(fallback);
    if (window.fetch) {
        fetch('https://api.vietqr.io/v2/banks')
            .then(function(response) { if (!response.ok) throw new Error('Bank API'); return response.json(); })
            .then(function(result) {
                var banks = (result && Array.isArray(result.data)) ? result.data.map(function(bank) {
                    return {bin:bank.bin,name:bank.shortName || bank.name};
                }) : [];
                if (banks.length) render(banks);
            })
            .catch(function() {});
    }
}

function escapeQrField(value, characters) {
    var escaped = String(value == null ? '' : value);
    escaped = escaped.replace(/\\/g, '\\\\');
    return escaped.replace(characters, '\\\\$&');
}

function escapeVCardField(value) {
    var escaped = String(value == null ? '' : value);
    return escaped.replace(/\\/g, '\\\\')
        .replace(/([;,])/g, '\\\\$1')
        .replace(/\\r?\\n/g, '\\\\n');
}

function buildData(record) {
    var f = record.fields;
    switch(currentType) {
        case 'url': return f.url.trim();
        case 'text': return f.text;
        case 'contact':
            return 'BEGIN:VCARD\\nVERSION:3.0\\nFN:' + escapeVCardField(f.name) +
                '\\nTEL:' + escapeVCardField(f.phone) +
                '\\nEMAIL:' + escapeVCardField(f.email) +
                '\\nURL:' + escapeVCardField(f.website) +
                '\\nADR;TYPE=HOME:' + escapeVCardField(f.address) +
                '\\nEND:VCARD';
        case 'wifi':
            return 'WIFI:T:' + escapeQrField(f.auth, /[;,:]/g) +
                ';S:' + escapeQrField(f.ssid, /[;,:\"]/g) +
                ';P:' + escapeQrField(f.password, /[;,:\"]/g) +
                ';H:' + (f.hidden ? 'true' : 'false') + ';;';
        case 'email':
            return 'mailto:' + encodeURIComponent(f.email || '') +
                '?subject=' + encodeURIComponent(f.subject || '') +
                '&body=' + encodeURIComponent(f.body || '');
        case 'phone': return 'tel:' + f.phone;
        case 'sms': return 'SMSTO:' + f.phone + ':' + String(f.body || '').replace(/([\\:])/g, '\\$1');
        case 'location': return 'geo:' + f.latitude + ',' + f.longitude;
        case 'payment': return buildPaymentData(f);
    }
    return '';
}

function saveHistory(data, record) {
    var historyId = String(Date.now()) + '-' + String(Math.random()).slice(2);
    var item = {
        historyId: historyId,
        type: currentType,
        fields: record.fields,
        data: data,
        design: $.extend({}, currentDesign),
        time: new Date().toLocaleString()
    };
    if (window.VietSoftQrHistoryRepository.save(item)) {
        currentHistoryId = historyId;
    } else {
        currentHistoryId = '';
        setStatus('QR đã được tạo nhưng không thể lưu vào lịch sử của trình duyệt.');
    }
    renderHistory();
}

function normalizeDesign(design) {
    design = design || {};
    var logoSize = parseFloat(design.logoSize);
    var quietZone = parseInt(design.quietZone, 10);
    return {
        foreground: /^#[0-9a-fA-F]{6}$/.test(String(design.foreground || '')) ? String(design.foreground) : '#111827',
        background: /^#[0-9a-fA-F]{6}$/.test(String(design.background || '')) ? String(design.background) : '#FFFFFF',
        style: ['square','rounded','dot'].indexOf(String(design.style || '')) !== -1 ? String(design.style) : 'square',
        eyeStyle: ['square','rounded'].indexOf(String(design.eyeStyle || '')) !== -1 ? String(design.eyeStyle) : 'square',
        logoSize: isFinite(logoSize) && logoSize >= 0.12 && logoSize <= 0.24 ? logoSize : 0.16,
        quietZone: [2,4,6].indexOf(quietZone) !== -1 ? quietZone : 4,
        logoDataUrl: String(design.logoDataUrl || FREE_BRAND_LOGO_URL)
    };
}

function getCurrentDesign(callback) {
    var design = {
        foreground: $('#vsDesignForeground').val() || '#111827',
        background: $('#vsDesignBackground').val() || '#FFFFFF',
        style: $('#vsDesignStyle').val() || 'square',
        eyeStyle: $('#vsDesignEyeStyle').val() || 'square',
        logoSize: parseFloat($('#vsDesignLogoSize').val()) || 0.16,
        quietZone: parseInt($('#vsDesignQuietZone').val(), 10) || 4,
        logoDataUrl: ''
    };
    var file = document.getElementById('vsDesignLogo');
    var logoFile = file && file.files && file.files[0];
    if (!logoFile) {
        callback(normalizeDesign(design));
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        design.logoDataUrl = e.target.result || '';
        callback(normalizeDesign(design));
    };
    reader.onerror = function() { callback(normalizeDesign(design)); };
    reader.readAsDataURL(logoFile);
}

function saveCurrentQrState() {
    if (!currentData) return;
    try {
        localStorage.setItem(currentQrKey, JSON.stringify({data:currentData, design:normalizeDesign(currentDesign), type:currentType, historyId:currentHistoryId}));
    } catch (e) {}
}

function restoreCurrentQrState() {
    try {
        var saved = JSON.parse(localStorage.getItem(currentQrKey) || 'null');
        if (!saved || !saved.data) return;
        currentData = String(saved.data);
        var savedType = String(saved.type || currentType);
        if (fields[savedType] && savedType !== currentType) {
            renderFields(savedType);
        }
        currentType = savedType;
        currentHistoryId = String(saved.historyId || '');
        currentDesign = normalizeDesign(saved.design);
        var rendered = renderQrImage(currentData, currentDesign, qrConfig.size || 300, function(imageUrl) {
            currentImage = imageUrl;
            var preview = document.getElementById('vsPreview');
            if (!preview) return;
            preview.innerHTML = '';
            var img = new Image();
            img.alt = 'QR Code';
            img.src = currentImage;
            preview.appendChild(img);
            $('#vsDownload,#vsCopy,#vsOpen').prop('disabled', false);
            syncDesignFields(currentDesign);
            $('#vsApplyDesign').prop('disabled', false);
            $('#vsDesignWarning').text('✓ Bạn có thể thay đổi thiết kế và xem kết quả ngay.');
        });
    } catch (e) {}
}

function persistCurrentDesign(design) {
    currentDesign = normalizeDesign(design);
    if (!currentData || !currentHistoryId) return;
    var saved = window.VietSoftQrHistoryRepository.update(currentHistoryId, function (item) {
        item.design = $.extend({}, currentDesign);
        return item;
    });
    if (!saved) {
        setStatus('Thiết kế đã áp dụng nhưng không thể lưu vào lịch sử của trình duyệt.');
    }
    renderHistory();
}

function getHistory() {
    try {
        var items = window.VietSoftQrHistoryRepository.getAll();
        if (!Array.isArray(items)) return [];

        return items.map(function(item, index) {
            var normalized = item || {};
            if (!normalized.fields || typeof normalized.fields !== 'object') {
                normalized.fields = fieldsFromHistoryData(normalized.type, normalized.data || '');
            }
            normalized.design = normalizeDesign(normalized.design);
            if (!normalized.historyId) {
                normalized.historyId = 'legacy-' + index;
            }
            return normalized;
        });
    } catch (e) {
        return [];
    }
}

function fieldsFromHistoryData(type, data) {
    data = String(data || '');

    switch (type) {
        case 'url':
            return {url:data};

        case 'text':
            return {text:data};

        case 'phone':
            return {phone:data.replace(/^tel:/i, '')};

        case 'sms':
            var sms = data.replace(/^smsto:/i, '');
            var smsParts = sms.split(':');
            var smsPhone = smsParts.shift() || '';
            var smsBody = smsParts.join(':').replace(/\\\\/g, '\\').replace(/\\:/g, ':');
            return {phone:smsPhone, body:smsBody};

        case 'email':
            if (/^mailto:/i.test(data)) {
                var mailto = data.replace(/^mailto:/i, '');
                var mailParts = mailto.split('?');
                var emailAddress = decodeURIComponent(mailParts.shift() || '');
                var query = {};
                (mailParts.join('?').split('&')).forEach(function(part) {
                    if (!part) return;
                    var separator = part.indexOf('=');
                    var key = separator >= 0 ? part.substring(0, separator) : part;
                    var value = separator >= 0 ? part.substring(separator + 1) : '';
                    try { query[key] = decodeURIComponent(value); } catch (e) { query[key] = value; }
                });
                return {
                    email: emailAddress,
                    subject: query.subject || '',
                    body: query.body || ''
                };
            }
            return {
                email:(data.match(/TO:([^;]*);/i) || [,''])[1],
                subject:(data.match(/SUB:([^;]*);/i) || [,''])[1],
                body:(data.match(/BODY:(.*?);?$/i) || [,''])[1].replace(/;$/, '')
            };

        case 'contact':
            if (/^BEGIN:VCARD/i.test(data)) {
                var vcardField = function(name) {
                    var match = data.match(new RegExp('^' + name + '(?:;[^:]*)?:([^\\n\\r]*)', 'im'));
                    return match ? match[1].replace(/\\\\n/g, '\\n').replace(/\\\\([;,])/g, '$1').replace(/\\\\\\/g, '\\') : '';
                };
                return {
                    name: vcardField('FN'),
                    phone: vcardField('TEL'),
                    website: vcardField('URL'),
                    email: vcardField('EMAIL'),
                    address: vcardField('ADR')
                };
            }
            var mecardField = function(name) {
                var match = data.match(new RegExp(name + ':([^;]*);', 'i'));
                return match ? match[1].replace(/\\\\/g, '\\').replace(/\\([;:])/g, '$1') : '';
            };
            return {
                name:mecardField('N'),
                phone:mecardField('TEL'),
                website:mecardField('URL'),
                email:mecardField('EMAIL'),
                address:mecardField('ADR')
            };

        case 'wifi':
            var wifiField = function(name) {
                var match = data.match(new RegExp(name + ':([^;]*);', 'i'));
                return match ? match[1].replace(/\\\\/g, '\\').replace(/\\([;,:"])/g, '$1') : '';
            };
            var wifiHidden = (data.match(/H:([^;]*);/i) || [,'false'])[1];
            return {
                ssid:wifiField('S'),
                password:wifiField('P'),
                auth:wifiField('T'),
                hidden:String(wifiHidden).toLowerCase() === 'true'
            };

        case 'location':
            var geo = data.replace(/^geo:/i, '').split(',');
            return {latitude:geo[0] || '',longitude:geo[1] || ''};

        case 'payment':
            return {};
    }

    return {};
}

function getHistoryTable(item, id) {
    var template = exportTemplates[item.type];
    if (template) {
        return {
            columns: template.columns,
            row: template.getRow(item, id)
        };
    }

    var f = item.fields || {};
    if (item.type === 'wifi') {
        return {columns:['ID','Tên mạng (SSID)','Mật khẩu','Bảo mật','Mạng ẩn'],row:[id,f.ssid || '',f.password || '',f.auth || '',f.hidden ? 'Có' : 'Không']};
    }
    if (item.type === 'location') {
        return {columns:['ID','Latitude','Longitude'],row:[id,f.latitude || '',f.longitude || '']};
    }
    if (item.type === 'payment') {
        return {columns:['ID','Ngân hàng','Số tài khoản','Tên tài khoản','Số tiền','Nội dung','Khóa số tiền'],row:[id,f.bankName || f.bankBin || '',f.account || '',f.accountName || '',f.amount || '',f.description || '',f.lockAmount ? 'Có' : 'Không']};
    }
    return {columns:['ID','Nội dung'],row:[id,item.data || '']};
}

function getHistoryViewItems() {
    var items = getHistory().filter(function(item) { return item.type === currentType; });

    if (historySearch) {
        var query = historySearch.toLowerCase();
        items = items.filter(function(item) {
            var table = getHistoryTable(item, 0);
            return table.row.some(function(value) {
                return String(value == null ? '' : value).toLowerCase().indexOf(query) !== -1;
            });
        });
    }

    items.sort(function(a, b) {
        var av = historySortValue(a, historySort.key);
        var bv = historySortValue(b, historySort.key);
        var result = av < bv ? -1 : (av > bv ? 1 : 0);
        return historySort.direction === 'asc' ? result : -result;
    });

    return items;
}

function historySortValue(item, key) {
    if (key === 'time') return String(item.time || '');
    if (key === 'id') return 0;
    var table = getHistoryTable(item, 0);
    var index = exportTemplates[currentType] ? exportTemplates[currentType].columns.indexOf(key) : -1;
    return index >= 0 ? String(table.row[index] == null ? '' : table.row[index]).toLowerCase() : '';
}

function populateFieldsFromHistory(item) {
    if (!item || !item.type) return;
    var type = String(item.type);
    if (!fields[type]) return;
    renderFields(type);
    var values = item.fields || fieldsFromHistoryData(type, item.data || '');
    var map = {
        url: {url:'vsUrl'},
        text: {text:'vsText'},
        contact: {name:'vsName',phone:'vsPhone',email:'vsEmail',website:'vsWebsite',address:'vsAddress'},
        wifi: {ssid:'vsSsid',password:'vsWifiPass',auth:'vsWifiAuth',hidden:'vsHidden'},
        email: {email:'vsEmailTo',subject:'vsEmailSubject',body:'vsEmailBody'},
        phone: {phone:'vsPhoneNumber'},
        sms: {phone:'vsSmsPhone',body:'vsSmsBody'},
        location: {latitude:'vsLat',longitude:'vsLng'},
        payment: {bankBin:'vsPaymentBank',account:'vsPaymentAccount',accountName:'vsPaymentAccountName',amount:'vsPaymentAmount',description:'vsPaymentDescription',lockAmount:'vsPaymentLockAmount'}
    };
    var typeMap = map[type] || {};
    Object.keys(typeMap).forEach(function(key) {
        var selector = '#' + typeMap[key];
        if ($(selector).length) {
            if ($(selector).is(':checkbox')) $(selector).prop('checked', !!values[key]);
            else $(selector).val(values[key] == null ? '' : values[key]);
        }
    });
    if (type === 'payment') {
        $('#vsPaymentBank').val(values.bankBin || '');
    }
    if (type === 'location') {
        var lat = values.latitude || '';
        var lng = values.longitude || '';
        if (lat && lng) setLocation(lat, lng);
    }
}
function syncDesignFields(design) {
    design = normalizeDesign(design);
    $('#vsDesignForeground').val(design.foreground);
    $('#vsDesignForegroundText').val(design.foreground);
    $('#vsDesignBackground').val(design.background);
    $('#vsDesignBackgroundText').val(design.background);
    $('#vsDesignStyle').val(design.style);
    $('#vsDesignEyeStyle').val(design.eyeStyle);
    $('#vsDesignLogoSize').val(String(design.logoSize));
    $('#vsDesignQuietZone').val(String(design.quietZone));
    $('#vsDesignLogoName').text(design.logoDataUrl ? 'Logo đã lưu' : 'Chưa chọn logo');
}
function showHistoryQrResult(item) {
    if (!item || !item.data) return;
    var historyId = String(item.historyId || '');
    $('.vs-history-table tbody tr.vs-history-row').removeClass('is-selected');
    if (historyId) {
        $('.vs-history-table tbody tr.vs-history-row[data-history-id="' + historyId.replace(/"/g, '\\"') + '"]').addClass('is-selected');
    }
    var design = normalizeDesign(item.design);
    currentHistoryId = String(item.historyId || '');
    populateFieldsFromHistory(item);
    syncDesignFields(design);
    currentData = String(item.data);
    currentDesign = design;
    renderQrImage(currentData, design, qrConfig.size || 300, function(imageUrl) {
        currentImage = imageUrl;
        var preview=document.getElementById('vsPreview'); preview.innerHTML='';
        var img=new Image(); img.alt='QR Code'; img.src=currentImage; preview.appendChild(img);
        $('#vsDownload,#vsCopy,#vsOpen').prop('disabled',false);
        $('#vsApplyDesign').prop('disabled', false);
        $('#vsDesignWarning').text('✓ Bạn có thể thay đổi thiết kế và xem kết quả ngay.');
        saveCurrentQrState();
        setStatus('✓ Đã tải QR từ lịch sử; bạn có thể chỉnh sửa nội dung và tạo lại.');
        try {
            var form = document.querySelector('.vs-form');
            if (form) form.scrollIntoView({behavior:'smooth', block:'start'});
        } catch (e) {}
    });
}

$(document).on('click','.vs-history-qr-trigger',function(e){
    e.preventDefault();
    e.stopPropagation();
    var historyId=$(this).attr('data-history-id')||'';
    var items=getHistory();
    for(var i=0;i<items.length;i++) {
        if(String(items[i].historyId||'')===historyId) { showHistoryQrResult(items[i]); break; }
    }
});
$(document).on('click','.vs-history-row',function(e){
    if ($(e.target).closest('.vs-history-delete,button,input,select,textarea').length) return;
    var historyId=$(this).attr('data-history-id')||'';
    var items=getHistory();
    for(var i=0;i<items.length;i++) {
        if(String(items[i].historyId||'')===historyId) { showHistoryQrResult(items[i]); break; }
    }
});
function renderHistoryQrs(){
    $('.vs-history-qr-code').each(function(){
        var element=this, historyId=$(element).attr('data-history-id')||'', items=getHistory(), item=null;
        for(var i=0;i<items.length;i++) if(String(items[i].historyId||'')===historyId){item=items[i];break;}
        if(!item || !item.data) return;
        renderQrImage(String(item.data), normalizeDesign(item.design), 56, function(imageUrl){
            $(element).empty().append($('<img>', {src:imageUrl, alt:'QR Code'}));
        }, function(){
            $(element).empty();
        }, true);
    });
}
function updateHistorySelectionUi() {
    var count = Object.keys(selectedHistoryIds).length;
    $('#vsHistorySelectedCount').text(count + ' đã chọn');
    var pageChecks = $('#vsHistory .vs-history-select-item');
    var checkedCount = pageChecks.filter(':checked').length;
    var allChecked = pageChecks.length > 0 && checkedCount === pageChecks.length;
    $('#vsHistorySelectPage,#vsHistorySelectAllPage').prop('checked', allChecked);
}

function renderHistory() {
    var allItems = getHistoryViewItems();
    var container = $('#vsHistory');
    var template = getExportTemplate(currentType);

    var toolbar = '<div class="vs-history-toolbar">' +
        '<input class="vs-history-search" id="vsHistorySearch" value="' + esc(historySearch) + '" placeholder="Lọc dữ liệu..." aria-label="Lọc lịch sử">' +
        '<div class="vs-history-toolbar-actions">' +
        '<label class="vs-history-select-all"><input id="vsHistorySelectPage" type="checkbox"' + (!allItems.length ? ' disabled' : '') + '> <span>Chọn trang</span></label>' +
        '<span class="vs-history-selected-count" id="vsHistorySelectedCount">0 đã chọn</span>' +
        '<button class="vs-btn vs-btn-secondary" id="vsClearHistory" type="button"' + (!allItems.length ? ' disabled' : '') + '><svg class="vs-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10l1 2h3v2H3V6h3l1-2zm0 6h2v9h2v-9h2v9h2v-9h2v11H7V10z"/></svg><span>Xóa tất cả</span></button>' +
        '</div></div>';

    if (!allItems.length) {
        container.html(toolbar + '<div class="vs-history-empty">' +
            (historySearch ? 'Không tìm thấy dữ liệu phù hợp.' : 'Chưa có dữ liệu lịch sử cho ' + esc((fields[currentType] ? fields[currentType].title : 'loại QR hiện tại').replace('Tạo QR cho ','')) + '.') +
            '</div>');
        $('#vsExportExcel').prop('disabled', !template);
    $('#vsPrintHistory').prop('disabled', false);
        $('#vsPrintHistory').prop('disabled', true);
        return;
    }

    var pageCount = Math.max(1, Math.ceil(allItems.length / historyPageSize));
    if (historyPage > pageCount) historyPage = pageCount;
    var start = (historyPage - 1) * historyPageSize;
    var pageItems = allItems.slice(start, start + historyPageSize);
    var columns = template ? template.columns.slice() : getHistoryTable(allItems[0], 1).columns.slice();

    var html = toolbar +
        '<div class="vs-history-table-wrap"><table class="vs-history-table"><thead><tr>';

    html += '<th class="vs-history-select-column" data-sortable="false"><input id="vsHistorySelectAllPage" type="checkbox" aria-label="Chọn tất cả mã QR trên trang"></th>';
    html += '<th class="vs-history-qr-column" data-sortable="false">QR</th>';
    columns.forEach(function(column) {
        var sortable = column !== 'ID';
        var arrow = sortable && historySort.key === column ? (historySort.direction === 'asc' ? ' ▲' : ' ▼') : '';
        html += '<th class="' + (column === 'ID' ? 'vs-history-id-column' : '') + '" data-sortable="' + sortable + '" data-history-sort="' + esc(column) + '">' + esc(column) + arrow + '</th>';
    });
    html += '<th class="vs-history-actions-column" data-sortable="false">Thao tác</th></tr></thead><tbody>';

    pageItems.forEach(function(item, index) {
        var absoluteIndex = start + index;
        var table = getHistoryTable(item, absoluteIndex + 1);
        html += '<tr class="vs-history-row' + (String(item.historyId || '') === String(currentHistoryId || '') ? ' is-selected' : '') + '" data-history-id="' + esc(item.historyId) + '" title="Nhấn để chỉnh sửa QR này">';
        html += '<td class="vs-history-select"><input type="checkbox" class="vs-history-select-item" data-history-id="' + esc(item.historyId) + '"' + (selectedHistoryIds[String(item.historyId || '')] ? ' checked' : '') + ' aria-label="Chọn QR"></td>';
        html += '<td class="vs-history-qr"><a href="#" class="vs-history-qr-trigger" data-history-id="' + esc(item.historyId) + '" title="Xem QR Code"><div class="vs-history-qr-code" data-history-id="' + esc(item.historyId) + '" aria-label="QR Code"></div></a></td>';
        table.row.forEach(function(value, cellIndex) { html += '<td class="' + (cellIndex === 0 ? 'vs-history-id' : '') + '">' + esc(value) + '</td>'; });
        html += '<td class="vs-history-actions"><button class="vs-history-delete" type="button" data-history-delete-id="' + esc(item.historyId) + '" title="Xóa" aria-label="Xóa bản ghi">' +
            '<svg class="vs-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2h-2v13H6V7H4V5h4l1-2zm-1 4v11h8V7H8zm2 2h2v7h-2V9zm4 0h2v7h-2V9z"/></svg>' +
            '</button></td></tr>';
    });

    html += '</tbody></table></div>';

    var first = start + 1;
    var last = Math.min(start + historyPageSize, allItems.length);
    html += '<div class="vs-history-footer"><div class="vs-history-page-size-wrap"><span>Hiển thị</span><select class="vs-history-page-size" id="vsHistoryPageSize"><option value="10">10 / trang</option><option value="25">25 / trang</option><option value="50">50 / trang</option></select></div><div class="vs-history-pagination"><span>' + first + '–' + last + ' / ' + allItems.length + '</span><div class="vs-history-page-buttons">';
    html += '<button type="button" data-history-page="' + (historyPage - 1) + '"' + (historyPage === 1 ? ' disabled' : '') + '>‹</button>';
    for (var page = 1; page <= pageCount; page++) {
        if (pageCount > 7 && page !== 1 && page !== pageCount && Math.abs(page - historyPage) > 2) continue;
        html += '<button type="button" class="' + (page === historyPage ? 'active' : '') + '" data-history-page="' + page + '">' + page + '</button>';
    }
    html += '<button type="button" data-history-page="' + (historyPage + 1) + '"' + (historyPage === pageCount ? ' disabled' : '') + '>›</button></div></div></div>';

    var searchInput = document.getElementById('vsHistorySearch');
    var hadSearchFocus = searchInput && (
        document.activeElement === searchInput ||
        document.activeElement === document.body
    );
    var searchSelectionStart = searchInput ? searchInput.selectionStart : null;
    var searchSelectionEnd = searchInput ? searchInput.selectionEnd : null;
    container.html(html);
    $('#vsHistoryPageSize').val(String(historyPageSize));
    if (hadSearchFocus) {
        setTimeout(function () {
            var restoredSearch = document.getElementById('vsHistorySearch');
            if (!restoredSearch) return;
            restoredSearch.focus();
            try {
                restoredSearch.setSelectionRange(
                    searchSelectionStart == null ? restoredSearch.value.length : searchSelectionStart,
                    searchSelectionEnd == null ? restoredSearch.value.length : searchSelectionEnd
                );
            } catch (e) {}
        }, 0);
    }
    $('#vsExportExcel').prop('disabled', !template);
    renderHistoryQrs();
    updateHistorySelectionUi();
}

function deleteHistoryItem(historyId) {
    var removed = window.VietSoftQrHistoryRepository.remove(historyId);
    if (!removed) return;
    delete selectedHistoryIds[String(historyId || '')];
    if (String(currentHistoryId || '') === String(historyId || '')) {
        currentHistoryId = '';
        saveCurrentQrState();
    }
    renderHistory();
}

function clearCurrentHistory() {
    if (!confirm('Xóa toàn bộ lịch sử của loại QR này?')) return;
    var currentItem = getHistory().filter(function(item) {
        return String(item.historyId || '') === String(currentHistoryId || '');
    })[0];
    if (currentItem && currentItem.type === currentType) {
        currentHistoryId = '';
        saveCurrentQrState();
    }
    clearHistorySelection();
    window.VietSoftQrHistoryRepository.clearByType(currentType);
    historyPage = 1;
    renderHistory();
}


function getExportTemplate(type) {
    var normalizedType = String(type || '').toLowerCase().trim();
    return exportTemplates[normalizedType] || null;
}

function syncVisibleHistorySelection() {
    $('#vsHistory .vs-history-select-item').each(function(){
        var checkbox = $(this);
        var id = String(checkbox.attr('data-history-id') || '');
        if (!id) return;
        if (checkbox.prop('checked')) selectedHistoryIds[id] = true;
        else delete selectedHistoryIds[id];
    });
}

function getSelectedHistoryItems(items) {
    syncVisibleHistorySelection();
    return (items || []).filter(function(item) { return !!selectedHistoryIds[String(item.historyId || '')]; });
}

function clearHistorySelection() { selectedHistoryIds = {}; }

function exportExcel() {
    var type = String(currentType || '').toLowerCase().trim();
    var template = getExportTemplate(type);
    var status = $('#vsExportStatus');
    var button = $('#vsExportExcel');

    if (!template) {
        status.text('Tab QR hiện tại không có template Excel tương ứng.');
        return;
    }

    var items = getHistory().filter(function(item) {
        return String(item.type || '').toLowerCase().trim() === type &&
            item.fields && typeof item.fields === 'object';
    });

    if (!items.length) {
        status.text('Chưa có dữ liệu để xuất cho ' + template.templateName + '.');
        return;
    }

    var selectedItems = getSelectedHistoryItems(items);
    var exportItems = selectedItems.length ? selectedItems : items;

    if (!window.XLSX || typeof XLSX.utils === 'undefined' || typeof XLSX.writeFile !== 'function') {
        status.text('Thư viện Excel chưa sẵn sàng. Vui lòng tải lại trang.');
        return;
    }

    button.prop('disabled', true).text('Đang xuất...');
    status.text('');

    try {
        var rows = [template.columns];
        exportItems.slice().reverse().forEach(function(item, index) {
            rows.push(template.getRow(item, index + 1));
        });

        var worksheet = XLSX.utils.aoa_to_sheet(rows);
        worksheet['!cols'] = template.columns.map(function(column) {
            return {wch: Math.max(16, Math.min(40, String(column).length + 8))};
        });

        var workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, template.templateName.substring(0, 31));
        XLSX.writeFile(workbook, 'QR-Code-' + template.templateName + '.xlsx');

        status.text('✓ Đã xuất ' + exportItems.length + ' bản ghi.');
        track('qr_excel_export', {qr_type:type, template_id:template.templateId, record_count:exportItems.length, selected:selectedItems.length > 0});
    } catch (e) {
        status.text('Xuất Excel thất bại: ' + (e && e.message ? e.message : 'lỗi không xác định') + '.');
    } finally {
        button.prop('disabled', false).text('Xuất Excel');
    }
}

function normalizeImportHeader(value) {
    return String(value == null ? '' : value)
        .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function findImportTemplate(headers) {
    var normalized = headers.map(normalizeImportHeader);
    var types = Object.keys(exportTemplates);
    for (var i = 0; i < types.length; i++) {
        var type = types[i];
        var columns = exportTemplates[type].columns.map(normalizeImportHeader);
        if (columns.length !== normalized.length) continue;
        var matched = true;
        for (var j = 0; j < columns.length; j++) {
            if (columns[j] !== normalized[j]) { matched = false; break; }
        }
        if (matched) return type;
    }
    return null;
}

function parseImportBoolean(value) {
    var text = String(value == null ? '' : value).trim().toLowerCase();
    return text === 'true' || text === '1' || text === 'yes' || text === 'co' || text === 'có';
}

function resolveImportedBank(value) {
    var raw = String(value == null ? '' : value).trim();
    if (/^\\d{6}$/.test(raw)) return raw;
    var options = $('#vsPaymentBank option');
    for (var i = 0; i < options.length; i++) {
        if (String($(options[i]).text()).trim().toLowerCase() === raw.toLowerCase()) return String($(options[i]).val() || '');
    }
    var fallback = {
        'vietcombank':'970436','vietinbank':'970415','bidv':'970418','mbbank':'970422',
        'techcombank':'970407','vpbank':'970432','acb':'970416','tpbank':'970423',
        'vib':'970441','sacombank':'970403','hdbank':'970437','agribank':'970405'
    };
    return fallback[raw.toLowerCase().replace(/\\s+/g,'')] || '';
}

function getImportedFields(type, row, headers) {
    var values = {};
    var map = {};
    headers.forEach(function(header, index) { map[normalizeImportHeader(header)] = row[index] == null ? '' : row[index]; });
    function value(name) { return map[normalizeImportHeader(name)] == null ? '' : map[normalizeImportHeader(name)]; }

    if (type === 'url') values = {url:String(value('Địa chỉ trang web')).trim()};
    else if (type === 'text') values = {text:String(value('Nội Dung'))};
    else if (type === 'phone') values = {phone:String(value('Số Điện Thoại')).trim()};
    else if (type === 'sms') values = {phone:String(value('Số Điện Thoại')).trim(),body:String(value('Nội Dung'))};
    else if (type === 'email') values = {email:String(value('Email')).trim(),subject:String(value('Tiêu Đề')),body:String(value('Nội Dung'))};
    else if (type === 'contact') values = {name:String(value('Họ Tên')),phone:String(value('Số Điện Thoại')).trim(),website:String(value('Website')).trim(),email:String(value('Email')).trim(),address:String(value('Địa chỉ'))};
    else if (type === 'wifi') values = {ssid:String(value('Tên mạng (SSID)')),password:String(value('Mật khẩu')),auth:String(value('Bảo mật') || 'WPA'),hidden:parseImportBoolean(value('Mạng ẩn'))};
    else if (type === 'location') values = {latitude:String(value('Latitude')).trim(),longitude:String(value('Longitude')).trim()};
    else if (type === 'payment') values = {bankBin:resolveImportedBank(value('Ngân hàng')),account:String(value('Số tài khoản')).trim(),accountName:String(value('Tên tài khoản')),amount:String(value('Số tiền')).trim(),description:String(value('Nội dung')),lockAmount:parseImportBoolean(value('Khóa số tiền'))};
    return values;
}

function buildImportedData(type, fields) {
    var previousType = currentType;
    currentType = type;
    var data = '';
    try { data = buildData({fields:fields}); } catch (e) { data = ''; }
    currentType = previousType;
    return data;
}

function isValidImportedFields(type, fields) {
    if (type === 'url') return !!fields.url;
    if (type === 'text') return !!fields.text;
    if (type === 'phone') return !!fields.phone;
    if (type === 'sms') return !!fields.phone;
    if (type === 'email') return !!fields.email;
    if (type === 'contact') return !!fields.name || !!fields.phone || !!fields.email;
    if (type === 'wifi') return !!fields.ssid;
    if (type === 'location') return fields.latitude !== '' && fields.longitude !== '';
    if (type === 'payment') return !!fields.bankBin && !!fields.account;
    return false;
}

var pendingImport = null;

function getImportPreviewLabel(type, fields) {
    if (type === 'url') return fields.url || '';
    if (type === 'text') return fields.text || '';
    if (type === 'phone') return fields.phone || '';
    if (type === 'sms') return (fields.phone || '') + (fields.body ? ' · ' + fields.body : '');
    if (type === 'email') return (fields.email || '') + (fields.subject ? ' · ' + fields.subject : '');
    if (type === 'contact') return fields.name || fields.phone || fields.email || '';
    if (type === 'wifi') return fields.ssid || '';
    if (type === 'location') return (fields.latitude || '') + ', ' + (fields.longitude || '');
    if (type === 'payment') return (fields.bankBin || '') + ' · ' + (fields.account || '');
    return '';
}

function closeImportPreview() {
    var modal = $('#vsImportPreviewModal');
    if (!modal.length) return;
    modal.removeClass('is-open').attr('aria-hidden','true');
    $('body').removeClass('vs-import-preview-open');
    pendingImport = null;
}

function ensureImportPreviewModal() {
    if ($('#vsImportPreviewModal').length) return;
    var html = '<div class="vs-import-preview-modal" id="vsImportPreviewModal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="vsImportPreviewTitle">' +
        '<div class="vs-import-preview-backdrop" data-import-preview-close="true"></div>' +
        '<div class="vs-import-preview-card" role="document">' +
            '<button class="vs-import-preview-close" id="vsImportPreviewClose" type="button" aria-label="Đóng">×</button>' +
            '<div class="vs-import-preview-kicker">IMPORT EXCEL</div>' +
            '<h2 id="vsImportPreviewTitle">Xem trước dữ liệu QR</h2>' +
            '<p class="vs-import-preview-intro" id="vsImportPreviewSummary"></p>' +
            '<div class="vs-import-preview-table-wrap"><table class="vs-import-preview-table"><thead><tr><th>Dòng</th><th>Loại QR</th><th>Nội dung</th><th>QR</th><th>Trạng thái</th></tr></thead><tbody id="vsImportPreviewRows"></tbody></table></div>' +
            '<div class="vs-import-preview-footer"><span id="vsImportPreviewHint"></span><div class="vs-import-preview-actions"><button class="vs-btn vs-btn-secondary" id="vsImportPreviewCancel" type="button">Hủy</button><button class="vs-btn vs-btn-primary" id="vsImportPreviewConfirm" type="button">Nhập dữ liệu</button></div></div>' +
        '</div></div>';
    $('body').append(html);
    $('#vsImportPreviewClose,#vsImportPreviewCancel').on('click', closeImportPreview);
    $('#vsImportPreviewModal').on('click','[data-import-preview-close="true"]', closeImportPreview);
}

function renderImportPreviewQrs(result) {
    var rows = result.preview.slice(0, 30);
    var renderNext = function(index) {
        if (index >= rows.length) return;
        var item = rows[index];
        if (!item.valid) {
            renderNext(index + 1);
            return;
        }
        renderQrImage(String(item.data || ''), normalizeDesign({}), 96, function(imageUrl) {
            item.qrImage = imageUrl;
            $('#vsImportPreviewRows tr[data-import-preview-row="' + item.rowNumber + '"] .vs-import-preview-qr').html('<img src="' + imageUrl.replace(/"/g, '&quot;') + '" alt="QR Code">');
            renderNext(index + 1);
        }, function() {
            item.qrImage = '';
            renderNext(index + 1);
        });
    };
    renderNext(0);
}

function showImportPreview(result) {
    ensureImportPreviewModal();
    var validCount = result.records.length;
    var skippedCount = result.skipped.length;
    var total = validCount + skippedCount;
    $('#vsImportPreviewSummary').text('Đã đọc ' + total + ' dòng dữ liệu: ' + validCount + ' bản ghi sẽ được nhập, ' + skippedCount + ' dòng sẽ bỏ qua.');
    var rowsHtml = '';
    result.preview.slice(0, 30).forEach(function(item) {
        rowsHtml += '<tr class="' + (item.valid ? 'is-valid' : 'is-skipped') + '" data-import-preview-row="' + esc(item.rowNumber) + '">' +
            '<td>' + esc(item.rowNumber) + '</td>' +
            '<td>' + esc(item.typeName) + '</td>' +
            '<td>' + esc(item.label) + '</td>' +
            '<td class="vs-import-preview-qr">' + (item.valid ? '<span class="vs-import-preview-qr-loading">Đang tạo...</span>' : '<span class="vs-import-preview-qr-empty">—</span>') + '</td>' +
            '<td><span class="vs-import-preview-status">' + esc(item.status) + '</span></td>' +
        '</tr>';
    });
    $('#vsImportPreviewRows').html(rowsHtml || '<tr><td colspan="5">Không có dòng dữ liệu để xem trước.</td></tr>');
    $('#vsImportPreviewHint').text(result.preview.length > 30 ? 'Đang hiển thị 30 dòng đầu tiên. QR được tạo tuần tự để preview.' : 'QR được tạo ngay trong preview để kiểm tra trước khi nhập.');
    $('#vsImportPreviewConfirm').prop('disabled', !validCount).text(validCount ? 'Nhập ' + validCount + ' bản ghi' : 'Không có dữ liệu hợp lệ');
    $('#vsImportPreviewModal').addClass('is-open').attr('aria-hidden','false');
    $('body').addClass('vs-import-preview-open');
    renderImportPreviewQrs(result);
}

function commitImportedRecords(result) {
    var importedItems = result.records.map(function(record) {
        return {
            historyId: String(Date.now()) + '-' + String(Math.random()).slice(2),
            type: record.type,
            fields: record.fields,
            data: record.data,
            design: normalizeDesign({}),
            time: new Date().toLocaleString()
        };
    });
    window.VietSoftQrHistoryRepository.saveMany(importedItems);
    historyPage = 1;
    historySearch = '';
    currentType = result.type;
    try { localStorage.setItem(activeTabKey, result.type); } catch (e) {}
    renderFields(result.type);
    renderHistory();
    $('#vsExportStatus').text('✓ Đã nhập ' + result.records.length + ' bản ghi' + (result.skipped.length ? ' (' + result.skipped.length + ' bỏ qua).' : '.'));
    track('qr_excel_import', {qr_type:result.type, record_count:result.records.length, skipped_count:result.skipped.length});
    closeImportPreview();
}

function importExcel(file) {
    var status = $('#vsExportStatus');
    if (!file) return;
    if (!window.XLSX || typeof XLSX.read !== 'function' || typeof XLSX.utils.sheet_to_json !== 'function') {
        status.text('Thư viện Excel chưa sẵn sàng. Vui lòng tải lại trang.');
        return;
    }

    status.text('Đang đọc Excel...');
    var reader = new FileReader();
    reader.onload = function(event) {
        try {
            var workbook = XLSX.read(event.target.result, {type:'array'});
            if (!workbook.SheetNames || !workbook.SheetNames.length) throw new Error('File không có sheet dữ liệu.');
            var sheet = workbook.Sheets[workbook.SheetNames[0]];
            var rows = XLSX.utils.sheet_to_json(sheet, {header:1, defval:''});
            if (!rows.length) throw new Error('Sheet không có dữ liệu.');

            var headers = rows[0].map(function(value){ return String(value == null ? '' : value).trim(); });
            var type = findImportTemplate(headers);
            if (!type) throw new Error('Không nhận diện được định dạng Excel đã xuất từ VietSoft.');

            var imported = [];
            var skipped = [];
            var preview = [];
            var items = getHistory();

            rows.slice(1).forEach(function(row, index) {
                var rowNumber = index + 2;
                if (!row || !row.length || row.every(function(value){ return String(value == null ? '' : value).trim() === ''; })) return;
                var fields = getImportedFields(type, row, headers);
                if (!isValidImportedFields(type, fields)) {
                    skipped.push({rowNumber:rowNumber, reason:'Thiếu dữ liệu bắt buộc'});
                    preview.push({rowNumber:rowNumber,typeName:exportTemplates[type].templateName,label:getImportPreviewLabel(type,fields),valid:false,status:'Bỏ qua: thiếu dữ liệu'});
                    return;
                }
                var data = buildImportedData(type, fields);
                if (!data) {
                    skipped.push({rowNumber:rowNumber, reason:'Không tạo được dữ liệu QR'});
                    preview.push({rowNumber:rowNumber,typeName:exportTemplates[type].templateName,label:getImportPreviewLabel(type,fields),valid:false,status:'Bỏ qua: dữ liệu không hợp lệ'});
                    return;
                }

                var duplicate = items.some(function(item) {
                    return String(item.type) === type && String(item.data || '') === String(data);
                }) || imported.some(function(item) {
                    return String(item.data || '') === String(data);
                });
                if (duplicate) {
                    skipped.push({rowNumber:rowNumber, reason:'Trùng dữ liệu'});
                    preview.push({rowNumber:rowNumber,typeName:exportTemplates[type].templateName,label:getImportPreviewLabel(type,fields),valid:false,status:'Bỏ qua: trùng dữ liệu'});
                    return;
                }

                imported.push({type:type,fields:fields,data:data});
                preview.push({rowNumber:rowNumber,typeName:exportTemplates[type].templateName,label:getImportPreviewLabel(type,fields),valid:true,status:'Sẵn sàng nhập'});
            });

            if (!imported.length && !skipped.length) throw new Error('File không có bản ghi dữ liệu.');
            pendingImport = {type:type,records:imported,skipped:skipped,preview:preview};
            showImportPreview(pendingImport);
            status.text('');
        } catch (e) {
            status.text('Nhập Excel thất bại: ' + (e && e.message ? e.message : 'lỗi không xác định') + '.');
        } finally {
            $('#vsImportExcelInput').val('');
        }
    };
    reader.onerror = function(){ status.text('Không thể đọc file Excel.'); $('#vsImportExcelInput').val(''); };
    reader.readAsArrayBuffer(file);
}


function buildStoredZip(files) {
    var crcTable = buildCrc32Table();
    var localParts = [];
    var centralParts = [];
    var offset = 0;
    var now = new Date();
    var dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    var dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

    files.forEach(function(file) {
        var nameBytes = new TextEncoder().encode(file.name);
        var data = file.data;
        var crc = crc32(data, crcTable);
        var local = new Uint8Array(30 + nameBytes.length);
        var view = new DataView(local.buffer);
        view.setUint32(0, 0x04034b50, true);
        view.setUint16(4, 20, true);
        view.setUint16(6, 0, true);
        view.setUint16(8, 0, true);
        view.setUint16(10, dosTime, true);
        view.setUint16(12, dosDate, true);
        view.setUint32(14, crc, true);
        view.setUint32(18, data.length, true);
        view.setUint32(22, data.length, true);
        view.setUint16(26, nameBytes.length, true);
        view.setUint16(28, 0, true);
        local.set(nameBytes, 30);
        localParts.push(local, data);

        var central = new Uint8Array(46 + nameBytes.length);
        var centralView = new DataView(central.buffer);
        centralView.setUint32(0, 0x02014b50, true);
        centralView.setUint16(4, 20, true);
        centralView.setUint16(6, 20, true);
        centralView.setUint16(8, 0, true);
        centralView.setUint16(10, 0, true);
        centralView.setUint16(12, dosTime, true);
        centralView.setUint16(14, dosDate, true);
        centralView.setUint32(16, crc, true);
        centralView.setUint32(20, data.length, true);
        centralView.setUint32(24, data.length, true);
        centralView.setUint16(28, nameBytes.length, true);
        centralView.setUint16(30, 0, true);
        centralView.setUint16(32, 0, true);
        centralView.setUint16(34, 0, true);
        centralView.setUint16(36, 0, true);
        centralView.setUint32(38, 0, true);
        centralView.setUint32(42, offset, true);
        central.set(nameBytes, 46);
        centralParts.push(central);
        offset += local.length + data.length;
    });

    var centralOffset = offset;
    var centralSize = centralParts.reduce(function(sum, part) { return sum + part.length; }, 0);
    var end = new Uint8Array(22);
    var endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, centralOffset, true);
    endView.setUint16(20, 0, true);

    return new Blob(localParts.concat(centralParts, [end]), {type:'application/zip'});
}

function buildCrc32Table() {
    var table = [];
    for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        table[n] = c >>> 0;
    }
    return table;
}

function crc32(data, table) {
    var crc = 0xffffffff;
    for (var i = 0; i < data.length; i++) crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
    return (crc ^ 0xffffffff) >>> 0;
}

function dataUrlToBytes(dataUrl) {
    var base64 = String(dataUrl || '').split(',')[1] || '';
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function downloadHistoryQrs() {
    var type = String(currentType || '').toLowerCase().trim();
    var allItems = getHistory().filter(function(item) {
        return String(item.type || '').toLowerCase().trim() === type && item.data;
    });
    var selectedItems = getSelectedHistoryItems(allItems);
    var items = selectedItems.length ? selectedItems : getHistoryViewItems();

    if (!items.length) {
        $('#vsExportStatus').text('Chưa có mã QR để tải.');
        return;
    }
    if (typeof TextEncoder === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
        $('#vsExportStatus').text('Trình duyệt không hỗ trợ tải QR hàng loạt.');
        return;
    }

    var button = $('#vsDownloadHistory');
    button.prop('disabled', true);
    $('#vsExportStatus').text('Đang chuẩn bị ' + items.length + ' mã QR...');

    var files = [];
    var renderNext = function(index) {
        if (index >= items.length) {
            var zip = buildStoredZip(files);
            var url = URL.createObjectURL(zip);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'VietSoft-QR-' + type + '-' + items.length + '.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
            $('#vsExportStatus').text('✓ Đã tải ' + files.length + ' mã QR vào file ZIP.');
            button.prop('disabled', false);
            track('qr_batch_download', {qr_type:type, record_count:files.length, selected:selectedItems.length > 0});
            return;
        }

        var item = items[index];
        renderQrImage(String(item.data || ''), normalizeDesign(item.design), 320, function(imageUrl) {
            files.push({
                name:'qr-' + type + '-' + String(index + 1) + '.png',
                data:dataUrlToBytes(imageUrl)
            });
            $('#vsExportStatus').text('Đang tạo QR ' + (index + 1) + '/' + items.length + '...');
            renderNext(index + 1);
        }, function() {
            renderNext(index + 1);
        });
    };

    renderNext(0);
}

function getPrintMetadata(item) {
    var type = String(item && item.type || '').toLowerCase().trim();
    var f = item && item.fields ? item.fields : {};
    var lines = [];

    if (type === 'payment') {
        if (String(f.accountName || '').trim()) lines.push(String(f.accountName).trim());
        if (String(f.amount || '').trim()) lines.push(String(f.amount).trim().replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ');
        if (String(f.description || '').trim()) lines.push(String(f.description).trim());
    } else if (type === 'contact') {
        if (String(f.name || '').trim()) lines.push(String(f.name).trim());
        if (String(f.phone || '').trim()) lines.push(String(f.phone).trim());
        if (String(f.email || '').trim()) lines.push(String(f.email).trim());
    } else if (type === 'wifi') {
        if (String(f.ssid || '').trim()) lines.push('Wi-Fi: ' + String(f.ssid).trim());
    } else if (type === 'email') {
        if (String(f.email || '').trim()) lines.push(String(f.email).trim());
        if (String(f.subject || '').trim()) lines.push(String(f.subject).trim());
    } else if (type === 'sms') {
        if (String(f.phone || '').trim()) lines.push(String(f.phone).trim());
        if (String(f.body || '').trim()) lines.push(String(f.body).trim());
    } else if (type === 'phone') {
        if (String(f.phone || '').trim()) lines.push(String(f.phone).trim());
    } else if (type === 'url') {
        if (String(f.url || '').trim()) lines.push(String(f.url).trim());
    } else if (type === 'text') {
        if (String(f.text || '').trim()) lines.push(String(f.text).trim());
    } else if (type === 'location') {
        if (String(f.latitude || '').trim() || String(f.longitude || '').trim()) {
            lines.push(String(f.latitude || '').trim() + ', ' + String(f.longitude || '').trim());
        }
    }

    return lines.slice(0, 3);
}

function escapePrintText(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getPrintMetadataOptions() {
    var existing = document.getElementById('vsQrPrintOptions');
    if (existing) return existing;

    var modal = document.createElement('div');
    modal.id = 'vsQrPrintOptions';
    modal.className = 'vs-qr-print-options';
    modal.innerHTML =
        '<div class="vs-qr-print-backdrop"></div>' +
        '<div class="vs-qr-print-card" role="dialog" aria-modal="true" aria-labelledby="vsQrPrintTitle">' +
            '<div class="vs-qr-print-kicker">In QR</div>' +
            '<h3 id="vsQrPrintTitle">Chọn nội dung in</h3>' +
            '<p>Thêm thông tin dưới mỗi mã QR để dễ nhận biết khi in nhiều mã.</p>' +
            '<label class="vs-qr-print-check"><input id="vsQrPrintWithMetadata" type="checkbox" checked><span><strong>In thông tin dưới QR</strong><small>Hiển thị thông tin nhận diện phù hợp với từng loại QR.</small></span></label>' +
            '<div class="vs-qr-print-actions"><button type="button" class="vs-btn vs-btn-secondary" id="vsQrPrintCancel">Hủy</button><button type="button" class="vs-btn vs-btn-primary" id="vsQrPrintConfirm">Tiếp tục in</button></div>' +
        '</div>';
    document.body.appendChild(modal);

    $('#vsQrPrintCancel,.vs-qr-print-backdrop').on('click', function() {
        $(modal).removeClass('is-open');
    });
    return modal;
}

function printHistoryQrs() {
    var type = String(currentType || '').toLowerCase().trim();
    var allItems = getHistory().filter(function(item) {
        return String(item.type || '').toLowerCase().trim() === type && item.data;
    });
    var selectedItems = getSelectedHistoryItems(allItems);
    var items = selectedItems.length ? selectedItems : getHistoryViewItems();

    if (!items.length) {
        $('#vsExportStatus').text('Chưa có mã QR để in.');
        return;
    }

    var modal = getPrintMetadataOptions();
    $(modal).addClass('is-open');

    $('#vsQrPrintConfirm').off('click.qrPrint').on('click.qrPrint', function() {
        $(modal).removeClass('is-open');
        startPrintHistoryQrs(items, $('#vsQrPrintWithMetadata').prop('checked'));
    });
}

function startPrintHistoryQrs(items, withMetadata) {
    var button = $('#vsPrintHistory');
    button.prop('disabled', true);
    $('#vsExportStatus').text('Đang chuẩn bị ' + items.length + ' mã QR để in...');

    var frame = document.getElementById('vsQrPrintFrame');
    if (!frame) {
        frame = document.createElement('iframe');
        frame.id = 'vsQrPrintFrame';
        frame.setAttribute('aria-hidden', 'true');
        frame.style.position = 'fixed';
        frame.style.width = '1px';
        frame.style.height = '1px';
        frame.style.border = '0';
        frame.style.opacity = '0';
        frame.style.pointerEvents = 'none';
        frame.style.left = '-10000px';
        frame.style.top = '0';
        document.body.appendChild(frame);
    }

    var qrCells = [];
    var renderNext = function(index) {
        if (index >= items.length) {
            var printDocument = frame.contentDocument || frame.contentWindow.document;
            printDocument.open();
            printDocument.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>In ' + items.length + ' mã QR</title>' +
                '<style>' +
                '@page{margin:12mm}' +
                'html,body{margin:0;padding:0;background:#fff}' +
                'body{font-family:Arial,sans-serif;color:#101828}' +
                '.qr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10mm 12mm;align-items:start}' +
                '.qr-cell{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;break-inside:avoid;page-break-inside:avoid;text-align:center;min-width:0}' +
                '.qr-cell img{display:block;width:55mm;height:55mm;object-fit:contain}' +
                '.qr-meta{width:100%;margin-top:3mm;font-size:10pt;line-height:1.35;overflow-wrap:anywhere;word-break:break-word}' +
                '.qr-meta-line{margin:0 0 1mm}' +
                '</style></head><body><div class="qr-grid">' + qrCells.join('') + '</div></body></html>');
            printDocument.close();

            $('#vsExportStatus').text('✓ Đã chuẩn bị ' + items.length + ' mã QR. Mở hộp thoại in...');
            setTimeout(function() {
                frame.contentWindow.focus();
                frame.contentWindow.print();
                button.prop('disabled', false);
            }, 250);
            return;
        }

        var item = items[index];
        var metadata = withMetadata ? getPrintMetadata(item) : [];
        renderQrImage(String(item.data || ''), normalizeDesign(item.design), 320, function(imageUrl) {
            var metaHtml = metadata.length ? '<div class="qr-meta">' + metadata.map(function(line) {
                return '<div class="qr-meta-line">' + escapePrintText(line) + '</div>';
            }).join('') + '</div>' : '';
            qrCells[index] = '<div class="qr-cell"><img src="' + imageUrl.replace(/"/g, '&quot;') + '" alt="QR Code">' + metaHtml + '</div>';
            renderNext(index + 1);
        }, function() {
            qrCells[index] = '';
            renderNext(index + 1);
        });
    };

    renderNext(0);
}

function setStatus(text) { $('#vsStatus').text(text); }

function isValidEmail(email) {
    return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(email || '').trim());
}

function isValidUrl(url) {
    try {
        var parsed = new URL(String(url || '').trim());
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

function isValidPhone(phone) {
    var normalized = String(phone || '').trim();
    return /^[+]?[-()\\s\\d]{6,25}$/.test(normalized) && /\\d{6,}/.test(normalized);
}

function validateRecord(record) {
    var f = record.fields;
    switch (currentType) {
        case 'url':
            if (!isValidUrl(f.url)) return 'Vui lòng nhập URL hợp lệ bắt đầu bằng http:// hoặc https://';
            break;
        case 'contact':
            if (!String(f.name || '').trim()) return 'Vui lòng nhập họ tên.';
            if (f.phone && !isValidPhone(f.phone)) return 'Số điện thoại không hợp lệ.';
            if (f.email && !isValidEmail(f.email)) return 'Email không hợp lệ.';
            if (f.website && !isValidUrl(f.website)) return 'Website phải là URL http:// hoặc https:// hợp lệ.';
            break;
        case 'wifi':
            if (!String(f.ssid || '').trim()) return 'Vui lòng nhập tên mạng (SSID).';
            break;
        case 'email':
            if (!isValidEmail(f.email)) return 'Vui lòng nhập địa chỉ email hợp lệ.';
            break;
        case 'phone':
            if (!isValidPhone(f.phone)) return 'Vui lòng nhập số điện thoại hợp lệ.';
            break;
        case 'sms':
            if (!isValidPhone(f.phone)) return 'Vui lòng nhập số điện thoại hợp lệ.';
            break;
        case 'payment':
            if (!/^\d{6}$/.test(String(f.bankBin || ''))) return 'Vui lòng chọn ngân hàng.';
            if (!/^.{6,19}$/.test(String(f.account || '').trim())) return 'Số tài khoản phải có từ 6 đến 19 ký tự.';
            if (!String(f.accountName || '').trim()) return 'Vui lòng nhập tên tài khoản.';
            if (f.lockAmount && !/^\d{1,13}$/.test(String(f.amount || '').replace(/[^0-9]/g, ''))) return 'Vui lòng nhập số tiền hợp lệ.';
            if (String(f.description || '').length > 25) return 'Nội dung chuyển khoản tối đa 25 ký tự.';
            break;
        case 'location':
            var lat = Number(f.latitude);
            var lng = Number(f.longitude);
            if (!isFinite(lat) || lat < -90 || lat > 90 || !isFinite(lng) || lng < -180 || lng > 180) {
                return 'Tọa độ vị trí không hợp lệ.';
            }
            break;
    }
    return '';
}

function generate() {
    var record = getRecord();
    var validationError = validateRecord(record);
    if (validationError) { setStatus(validationError); return; }
    var data;
    try {
        data = buildData(record);
    } catch (e) {
        setStatus('Không thể tạo dữ liệu QR. Vui lòng kiểm tra lại nội dung.');
        return;
    }

    if (!data.trim()) { setStatus('Vui lòng nhập nội dung.'); return; }
    saveQrConfig();
    var preview = document.getElementById('vsPreview');
    preview.innerHTML = '<div class="vs-empty">Đang tạo QR...</div>';
    setStatus('');

    var previousData = currentData;
    var previousImage = currentImage;
    var previousHistoryId = currentHistoryId;
    var previousDesign = currentDesign;
    currentData = data;
    currentHistoryId = '';
    currentDesign = normalizeDesign({foreground:'#111827',background:'#FFFFFF',style:'square'});
    syncDesignFields(currentDesign);
    $('#vsApplyDesign').prop('disabled', false);
    $('#vsDesignWarning').text('✓ Bạn có thể thay đổi thiết kế và xem kết quả ngay.');

    var rendered = renderQrImage(currentData, currentDesign, qrConfig.size || 300, function(imageUrl) {
        currentImage = imageUrl;
        preview.innerHTML = '';
        var image = new Image();
        image.alt = 'QR Code';
        image.src = currentImage;
        preview.appendChild(image);
        $('#vsDownload,#vsCopy,#vsOpen').prop('disabled',false);
        setStatus('✓ QR Code đã được tạo');
        saveHistory(data, record);
        saveCurrentQrState();
        track('qr_generate',{qr_type:currentType});
    }, function() {
        currentData = previousData;
        currentImage = previousImage;
        currentHistoryId = previousHistoryId;
        currentDesign = previousDesign;
        if (previousImage) {
            preview.innerHTML = '';
            var previousQr = new Image();
            previousQr.alt = 'QR Code';
            previousQr.src = previousImage;
            preview.appendChild(previousQr);
            syncDesignFields(currentDesign);
            $('#vsDownload,#vsCopy,#vsOpen').prop('disabled', false);
            $('#vsApplyDesign').prop('disabled', false);
            $('#vsDesignWarning').text('✓ Bạn có thể thay đổi thiết kế và xem kết quả ngay.');
        } else {
            preview.innerHTML = '<div class="vs-empty">Chưa có mã QR</div>';
            $('#vsDownload,#vsCopy,#vsOpen,#vsApplyDesign').prop('disabled', true);
            $('#vsDesignWarning').text('Tạo QR trước, sau đó bạn có thể tùy chỉnh.');
        }
        setStatus('Không thể tạo QR. Nội dung có thể quá dài hoặc không phù hợp với mức sửa lỗi hiện tại.');
    });
    if (!rendered) {
        currentData = previousData;
        currentImage = previousImage;
        currentHistoryId = previousHistoryId;
        currentDesign = previousDesign;
        if (previousImage) {
            preview.innerHTML = '';
            var previousQr = new Image();
            previousQr.alt = 'QR Code';
            previousQr.src = previousImage;
            preview.appendChild(previousQr);
            syncDesignFields(currentDesign);
            $('#vsDownload,#vsCopy,#vsOpen,#vsApplyDesign').prop('disabled', false);
            $('#vsDesignWarning').text('✓ Bạn có thể thay đổi thiết kế và xem kết quả ngay.');
        } else {
            preview.innerHTML = '<div class="vs-empty">Chưa có mã QR</div>';
            $('#vsDownload,#vsCopy,#vsOpen,#vsApplyDesign').prop('disabled', true);
            $('#vsDesignWarning').text('Không thể khởi tạo bộ tạo QR. Vui lòng tải lại trang.');
        }
    }
}

$(function(){
    loadQrConfig();
    applyQrConfig();
    var initialType = 'url';
    var savedTab = '';
    try {
        var queryType = new URLSearchParams(window.location.search).get('type');
        if (queryType && fields[queryType]) {
            initialType = queryType;
        } else {
            savedTab = localStorage.getItem(activeTabKey) || '';
            if (savedTab && fields[savedTab]) initialType = savedTab;
        }
    } catch (e) {}
    renderFields(initialType);
    renderResultDesignPanel();
    loadPaymentBanks();
    restoreCurrentQrState();
    $('#vsTabs').off('click.qrTabs').on('click.qrTabs', 'a[data-type]', function(e){
        e.preventDefault();
        e.stopPropagation();
        var type = $(this).attr('data-type');
        try { localStorage.setItem(activeTabKey, type); } catch (e) {}
        try {
            var url = new URL(window.location.href);
            url.searchParams.set('type', type);
            window.history.replaceState(null, '', url.toString());
        } catch (e) {}
        if (fields[type]) {
            renderFields(type);
        }
    });
    $('#vsGenerate').on('click',generate);
    $('#vsClear').on('click',function(){
        currentData = '';
        currentImage = '';
        currentHistoryId = '';
        currentDesign = normalizeDesign({});
        try { localStorage.removeItem(currentQrKey); } catch (e) {}
        renderFields(currentType);
        var preview = document.getElementById('vsPreview');
        if (preview) preview.innerHTML = '<div class="vs-empty">Chưa có mã QR</div>';
        $('#vsDownload,#vsCopy,#vsOpen,#vsApplyDesign').prop('disabled', true);
        $('#vsDesignWarning').text('Tạo QR trước, sau đó bạn có thể tùy chỉnh.');
        $('#vsStatus').text('');
    });
    var pendingProAction = null;
    function executeProAction(action) {
        if (action === 'import') $('#vsImportExcelInput').trigger('click');
        else if (action === 'export-excel') exportExcel();
        else if (action === 'export-zip') downloadHistoryQrs();
        else if (action === 'print') printHistoryQrs();
        else if (action === 'download') downloadHistoryQrs();
    }
    async function gateProAction(action) {
        var result = await window.VietSoftQrLicense.getActive();
        if (result.valid) {
            executeProAction(action);
            return true;
        }
        openProModal(action);
        return false;
    }
    function normalizeLicenseEmail(value) {
        return String(value || '').trim().toLowerCase();
    }

    async function refreshProLicenseUi() {
        var result = await window.VietSoftQrLicense.getActive();
        var input = $('#vsProLicenseInput');
        var email = $('#vsProLicenseEmail');
        var status = $('#vsProLicenseStatus');
        var clear = $('#vsProLicenseClear');
        if (result.valid) {
            input.val(result.license);
            email.val(result.payload && result.payload.email ? result.payload.email : '');
            status.text('✓ Pro đã được kích hoạt' + (result.payload && result.payload.email ? ' · ' + result.payload.email : '') + (result.payload && result.payload.expiresAt ? ' · Hết hạn ' + result.payload.expiresAt : ' · Lifetime'));
            clear.prop('hidden', false);
            $('#vsProModalContinue').text('Tiếp tục');
        } else {
            status.text(result.message || 'Chưa kích hoạt Pro.');
            clear.prop('hidden', true);
            $('#vsProModalContinue').text('Kích hoạt & tiếp tục');
        }
    }

    function openProModal(action, view) {
        pendingProAction = action || null;
        var modal = $('#vsProModal');
        if (!modal.length) return;
        var showLicense = view === 'license';
        $('#vsProUpgradeView').prop('hidden', showLicense);
        $('#vsProLicenseView').prop('hidden', !showLicense);
        modal.addClass('is-open').attr('aria-hidden','false');
        $('body').addClass('vs-pro-modal-open');
        refreshProLicenseUi();
        $(showLicense ? '#vsProLicenseInput' : '#vsProUpgradeCta').trigger('focus');
    }
    function closeProModal() {
        var modal = $('#vsProModal');
        if (!modal.length) return;
        modal.removeClass('is-open').attr('aria-hidden','true');
        $('body').removeClass('vs-pro-modal-open');
    }
    async function continueProAction() {
        var button = $('#vsProModalContinue');
        var input = $('#vsProLicenseInput');
        var email = $('#vsProLicenseEmail');
        var status = $('#vsProLicenseStatus');
        var originalText = button.text();

        button.prop('disabled', true).text('Đang xử lý...');
        input.prop('disabled', true);
        email.prop('disabled', true);

        try {
            var result = await window.VietSoftQrLicense.getActive();
            if (!result.valid) {
                var enteredEmail = normalizeLicenseEmail(email.val());
                var entered = input.val().trim();
                if (!enteredEmail) {
                    status.text('Vui lòng nhập email đã dùng khi mua License.');
                    return;
                }
                if (!entered) {
                    status.text('Vui lòng nhập License Key.');
                    return;
                }
                status.text('Đang kích hoạt License...');
                result = await window.VietSoftQrLicense.activate(entered, enteredEmail);
                if (!result.valid) {
                    status.text('✕ ' + (result.message || 'License không hợp lệ.'));
                    return;
                }
                var licenseEmail = normalizeLicenseEmail(result.payload && result.payload.email);
                if (!licenseEmail) {
                    window.VietSoftQrLicense.clear();
                    status.text('✕ License chưa chứa email. Vui lòng cấp lại License Key.');
                    return;
                }
                if (licenseEmail !== enteredEmail) {
                    window.VietSoftQrLicense.clear();
                    status.text('✕ Email không khớp với License Key.');
                    return;
                }
                track('qr_pro_license_activated', {license_id: result.payload && result.payload.licenseId ? result.payload.licenseId : ''});
            }
            var action = pendingProAction;
            pendingProAction = null;
            closeProModal();
            executeProAction(action);
        } finally {
            button.prop('disabled', false).text(originalText);
            input.prop('disabled', false);
            email.prop('disabled', false);
        }
    }
     $('#vsImportExcel').on('click',function(){ gateProAction('import'); });
    $('#vsImportExcelInput').on('change',function(){ importExcel(this.files && this.files[0]); });
    $(document).on('click.qrImportPreview','#vsImportPreviewConfirm',function(){ if (pendingImport) commitImportedRecords(pendingImport); });
    function closeFileExportModal() {
        var modal = $('#vsFileExportModal');
        if (!modal.length) return;
        modal.removeClass('is-open').attr('aria-hidden','true');
        $('body').removeClass('vs-file-export-modal-open');
    }
    function openFileExportModal() {
        var modal = $('#vsFileExportModal');
        if (!modal.length) return;
        modal.addClass('is-open').attr('aria-hidden','false');
        $('body').addClass('vs-file-export-modal-open');
        $('#vsFileExportExcel').trigger('focus');
    }
    $('#vsFileExport').on('click',function(){ openFileExportModal(); });
    $('#vsFileExportModalClose').on('click',closeFileExportModal);
    $('#vsFileExportModal').on('click','[data-file-export-close="true"]',closeFileExportModal);
    $('#vsFileExportExcel').on('click',function(){ closeFileExportModal(); gateProAction('export-excel'); });
    $('#vsFileExportZip').on('click',function(){ closeFileExportModal(); gateProAction('export-zip'); });
    $('#vsPrintHistory').on('click',function(){ gateProAction('print'); });
    $('#vsProModalClose').on('click',function(){ pendingProAction = null; closeProModal(); });
    $('#vsProModalContinue').on('click',continueProAction);
    $('#vsProUpgradeCta').on('click',function(){
        closeProModal();
        $('#vsUpgradePro').trigger('click');
    });
    $('#vsProOpenLicense').on('click',function(){
        openProModal(pendingProAction, 'license');
    });
    $('#vsProBackToUpgrade').on('click',function(){
        openProModal(pendingProAction, 'upgrade');
    });
    $('#vsPaymentOpenLicense').on('click',function(){
        $('#vsPaymentModal').removeClass('is-open').attr('aria-hidden','true');
        $('body').removeClass('vs-payment-modal-open');
        openProModal(null, 'license');
    });
    $('#vsProLicenseClear').on('click',async function(){
        var button = $(this);
        button.prop('disabled', true);
        $('#vsProLicenseStatus').text('Đang xóa License...');
        try {
            await window.VietSoftQrLicense.clear();
            $('#vsProLicenseInput').val('');
            $('#vsProLicenseEmail').val('');
            await refreshProLicenseUi();
        } finally {
            button.prop('disabled', false);
        }
    });
    $('#vsProLicenseInput,#vsProLicenseEmail').on('input',function(){
        $('#vsProLicenseStatus').text('');
    });
    $('#vsProModal').on('click','[data-pro-close="true"]',function(){ pendingProAction = null; closeProModal(); });
    $(document).on('keydown.qrProModal',function(e){ if(e.key === 'Escape') { pendingProAction = null; closeProModal(); closeFileExportModal(); } });
    $('#vsSize,#vsLevel').on('change', function(){
        saveQrConfig();
        if (currentData) {
            renderQrImage(currentData, currentDesign, qrConfig.size || 300, function(imageUrl) {
                currentImage = imageUrl;
                var preview = document.getElementById('vsPreview');
                if (!preview) return;
                preview.innerHTML = '';
                var image = new Image();
                image.alt = 'QR Code';
                image.src = currentImage;
                preview.appendChild(image);
                $('#vsDownload,#vsCopy,#vsOpen').prop('disabled', false);
                saveCurrentQrState();
            });
        }
    });
    $('#vsHistory').on('input', '#vsHistorySearch', function(){
        historySearch = $(this).val();
        historyPage = 1;
        renderHistory();
    });
    $('#vsHistory').on('change', '#vsHistoryPageSize', function(){
        historyPageSize = parseInt($(this).val(), 10) || 10;
        historyPage = 1;
        renderHistory();
    });
    $('#vsHistory').on('click', '[data-history-sort]', function(){
        var key = $(this).attr('data-history-sort');
        if (key === 'ID') return;
        if (historySort.key === key) historySort.direction = historySort.direction === 'asc' ? 'desc' : 'asc';
        else { historySort.key = key; historySort.direction = 'asc'; }
        historyPage = 1;
        renderHistory();
    });
    $('#vsHistory').on('click', '[data-history-page]', function(){
        var page = parseInt($(this).attr('data-history-page'), 10);
        if (page > 0) { historyPage = page; renderHistory(); }
    });
    $('#vsHistory').on('click', '[data-history-delete-id]', function(){
        var historyId = $(this).attr('data-history-delete-id');
        if (confirm('Xóa bản ghi này?')) deleteHistoryItem(historyId);
    });
    // Let the browser own checkbox state; only stop row/label click propagation.
    $('#vsHistory').on('click', '.vs-history-select-item,#vsHistorySelectPage,#vsHistorySelectAllPage', function(e){
        e.stopPropagation();
    });
    $('#vsHistory').on('change', '.vs-history-select-item', function(){
        var checkbox = $(this);
        var id = String(checkbox.attr('data-history-id') || '');
        if (!id) return;
        if (checkbox.prop('checked')) selectedHistoryIds[id] = true;
        else delete selectedHistoryIds[id];
        updateHistorySelectionUi();
    });
    $('#vsHistory').on('change', '#vsHistorySelectPage,#vsHistorySelectAllPage', function(){
        var checked = $(this).prop('checked');
        $('#vsHistory .vs-history-select-item').each(function(){
            var id = String($(this).attr('data-history-id') || '');
            if (!id) return;
            $(this).prop('checked', checked);
            if (checked) selectedHistoryIds[id] = true;
            else delete selectedHistoryIds[id];
        });
        updateHistorySelectionUi();
    });
    $('#vsHistory').on('click', '#vsClearHistory', clearCurrentHistory);
    $('#vsDownload').on('click',function(){if(!currentImage)return;var a=document.createElement('a');a.href=currentImage;a.download='vietsoft-qr-' + currentType + '.png';a.click();track('qr_download',{qr_type:currentType,format:'png'});});
    $('#vsCopy').on('click',async function(){if(!currentImage)return;try{var blob=await (await fetch(currentImage)).blob();await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);setStatus('✓ Đã sao chép ảnh QR');track('qr_copy',{qr_type:currentType});}catch(e){setStatus('Trình duyệt không hỗ trợ sao chép ảnh. Hãy dùng Tải PNG.');}});
    $('#vsOpen').on('click',function(){if(currentImage)window.open(currentImage,'_blank');});
    $(window).off('resize.qrLocation').on('resize.qrLocation', function(){
        if (locationMap) locationMap.invalidateSize(true);
    });
});
})();
