(function (A, w) {
  'use strict';
  function miniTool() { return w.xhs && w.xhs.miniTool; }
  function has(name) { var api = miniTool(); return Boolean(api && typeof api[name] === 'function'); }
  async function mediaPath(dataUrl) {
    if (!has('writeTempFile')) return dataUrl;
    var result = await miniTool().writeTempFile({ data: dataUrl });
    if (!result || typeof result.filePath !== 'string' || !result.filePath) throw new Error('结果图生成失败，请再试一次。');
    return result.filePath;
  }
  A.bridge = {
    has: has,
    present: function () { return Boolean(miniTool()); },
    getVersion: async function () {
      var xhs = w.xhs;
      var options = xhs && xhs.launchOptions;
      var version = options && options.miniToolEnv && Number(options.miniToolEnv.buildVersion);
      if (!version && has('getLaunchOptions')) {
        try { options = await miniTool().getLaunchOptions(); version = options && options.miniToolEnv && Number(options.miniToolEnv.buildVersion); } catch (err) { return 0; }
      }
      return Math.floor((version || 0) / 1000);
    },
    save: async function (dataUrl) {
      if (!has('saveImageToPhotosAlbum')) return false;
      await miniTool().saveImageToPhotosAlbum({ filePath: await mediaPath(dataUrl) });
      return true;
    },
    post: async function (dataUrl, result) {
      if (!has('postNote')) return false;
      var label = result.mode === 'dual' ? result.primary.shortName + '×' + result.secondary.shortName : result.primary.name;
      await miniTool().postNote({
        title: ('测出来我是' + label + '🙂').slice(0, 20),
        content: '15个心动情境测了下自己到底吃哪一款，结果居然是这个……\n我的心动人格：' + label + '。\n#AI心动人格测试 #恋爱偏好测试',
        mediaInfo: { image_resources: [{ url: await mediaPath(dataUrl) }] }
      });
      return true;
    },
    readStorage: async function (key) { return (await miniTool().getStorage({ key: key })).data; },
    writeStorage: async function (key, data) { await miniTool().setStorage({ key: key, data: data }); },
    removeStorage: async function (key) { await miniTool().removeStorage({ key: key }); }
  };
})(window.HeartTest, window);
