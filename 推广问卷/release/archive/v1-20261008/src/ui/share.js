(function (A) {
  'use strict';
  var previousFocus, previousOverflow;
  A.closeCard = function () {
    var root = document.getElementById('modal-root'); if (!root.firstChild) return;
    root.innerHTML = ''; document.body.style.overflow = previousOverflow || '';
    if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
  };
  A.openCard = function (result, reason) {
    var root = document.getElementById('modal-root'); previousFocus = document.activeElement; previousOverflow = document.body.style.overflow;
    var dataUrl = A.drawShareCard(result).toDataURL('image/png'); var native = A.bridge.has('saveImageToPhotosAlbum');
    var label = result.mode === 'dual' ? result.primary.shortName + ' × ' + result.secondary.shortName : result.primary.name;
    root.innerHTML = '<div class="modal-overlay"><section class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="card-title"><header class="modal-head"><h2 id="card-title">你的心动人格卡</h2><button class="modal-close" data-modal-action="close" aria-label="关闭结果卡">×</button></header><img class="share-card-image" alt="' + A.escape(label) + '，心动人格分享卡" src="' + dataUrl + '"><p class="modal-help">' + (reason === 'post' && !A.bridge.has('postNote') ? '请在小红书小工具内使用发布功能。你可以先保留结果图，再自行发布笔记。' : native ? '让这一刻的心动，有迹可留。' : A.bridge.present() ? '当前客户端暂不支持保存到相册，可以截图保留结果卡。' : '长按图片或使用浏览器的“图片另存为”保存结果卡；也可以直接截图。') + '</p>' + (native ? '<button class="primary" data-modal-action="save">保存到相册</button>' : '') + (reason === 'post' ? '<div class="note-draft"><p>测出来我是' + A.escape(label) + '🙂</p><p>15个心动情境测了下自己到底吃哪一款，结果居然是这个……</p></div>' : '') + '</section></div>';
    document.body.style.overflow = 'hidden'; root.querySelector('.modal-close').focus();
    root.querySelector('.modal-overlay').addEventListener('click', function (event) { if (event.target.classList.contains('modal-overlay')) A.closeCard(); });
    root.querySelector('.modal-close').addEventListener('click', A.closeCard);
    var save = root.querySelector('[data-modal-action="save"]');
    if (save) save.addEventListener('click', async function () { save.disabled = true; try { await A.bridge.save(dataUrl); A.notify('心动人格卡已保存到相册。'); } catch (err) { A.notify('未能保存，请检查相册权限后再试。'); } finally { save.disabled = false; } });
  };
  document.addEventListener('keydown', function (event) {
    var root = document.getElementById('modal-root'); if (!root.firstChild) return;
    if (event.key === 'Escape') A.closeCard();
    if (event.key === 'Tab') { var controls = root.querySelectorAll('button'), first = controls[0], last = controls[controls.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
  });
})(window.HeartTest);
