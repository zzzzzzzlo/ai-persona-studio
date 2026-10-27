(function (A, w) {
  'use strict';
  var native = false, queue = Promise.resolve(), key = A.config.storageKey;
  function localRead() { try { return w.localStorage.getItem(key); } catch (err) { return null; } }
  function localRemove() { try { w.localStorage.removeItem(key); return true; } catch (err) { return false; } }
  function parse(text) { try { return typeof text === 'string' ? JSON.parse(text) : null; } catch (err) { return null; } }
  A.storage = {
    init: async function () {
      native = await A.bridge.getVersion() >= 9460 && A.bridge.has('getStorage') && A.bridge.has('setStorage') && A.bridge.has('removeStorage');
      if (native) {
        try {
          var raw = await A.bridge.readStorage(key);
          if (raw !== null && raw !== undefined && raw !== '') { localRemove(); return parse(raw); }
          var old = localRead();
          if (old && parse(old)) { await A.bridge.writeStorage(key, old); localRemove(); return parse(old); }
          return null;
        } catch (err) { A.notify('本地记录暂时无法读取，可以继续测试。'); return null; }
      }
      return parse(localRead());
    },
    save: function (state) {
      var data = JSON.stringify(A.snapshot(state));
      queue = queue.then(async function () {
        try { if (native) await A.bridge.writeStorage(key, data); else w.localStorage.setItem(key, data); return true; }
        catch (err) { A.notify('进度暂时无法保存，请保持页面打开完成测试。'); return false; }
      });
      return queue;
    },
    clear: function () {
      queue = queue.then(async function () {
        var localOK = localRemove();
        try { if (native) await A.bridge.removeStorage(key); return native || localOK; }
        catch (err) { A.notify('本地旧记录未能清除，请稍后再试。'); return false; }
      });
      return queue;
    },
    backend: function () { return native ? 'xhs-storage' : 'localStorage'; }
  };
})(window.HeartTest, window);
