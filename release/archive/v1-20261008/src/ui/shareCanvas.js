(function (A) {
  'use strict';
  var sans = '"PingFang SC", "Microsoft YaHei", sans-serif';
  function colors() {
    var style = getComputedStyle(document.documentElement);
    function value(name, fallback) { return style.getPropertyValue(name).trim() || fallback; }
    return {
      paper: value('--paper', '#F5F7FC'), ink: value('--ink', '#30374D'), accent: value('--accent', '#626DB2'), muted: value('--muted', '#7B8399'), line: value('--line', '#E7EBF4'),
      label: value('--label-ink', '#9F6885'), tags: value('--tag-background', '#F1F4FD'), quote: value('--quote-background', '#FFF4F8'), quoteInk: value('--quote-ink', '#8B6480'), quoteMark: value('--quote-mark', '#D59CB8'),
      tileStart: value('--mark-tile-start', '#FBE5EF'), tileEnd: value('--mark-tile-end', '#E7EDFF'), shadow: value('--mark-shadow', 'rgba(207,216,245,.55)'), outline: value('--mark-outline', '#C2CBEA'), heartStart: value('--mark-heart-start', '#F0A6C5'), heartEnd: value('--mark-heart-end', '#DF87AD')
    };
  }
  function lines(ctx, text, maxWidth) {
    var result = [], line = '';
    Array.from(text).forEach(function (c) { if (ctx.measureText(line + c).width > maxWidth && line) { result.push(line); line = c; } else line += c; });
    if (line) result.push(line); return result;
  }
  function box(ctx, x, y, width, height, r, fill, border) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r); ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height); ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    if (border) { ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function mark(ctx, x, y, size, palette) {
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 160, size / 160);
    var tile = ctx.createLinearGradient(0, 0, 160, 160); tile.addColorStop(0, palette.tileStart); tile.addColorStop(1, palette.tileEnd);
    box(ctx, 9, 9, 142, 142, 43, tile);
    ctx.fillStyle = palette.shadow;
    ctx.fill(new Path2D('M46 37H114C126 37 133 45 133 57V99C133 111 125 119 113 119H69L47 133V118C35 117 28 109 28 97V57C28 45 35 37 46 37Z'));
    var bubble = new Path2D('M44 32H112C124 32 131 40 131 52V94C131 106 123 114 111 114H67L45 128V113C33 112 26 104 26 92V52C26 40 33 32 44 32Z');
    ctx.fillStyle = '#FFFFFF'; ctx.fill(bubble); ctx.strokeStyle = palette.outline; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke(bubble);
    var heart = ctx.createLinearGradient(0, 52, 0, 94); heart.addColorStop(0, palette.heartStart); heart.addColorStop(1, palette.heartEnd); ctx.fillStyle = heart;
    ctx.fill(new Path2D('M79 94C70 87 55 77 55 65C55 57 61 52 68 52C73 52 77 55 79 59C82 55 85 52 90 52C98 52 103 58 103 65C103 77 89 88 79 94Z')); ctx.restore();
  }
  A.drawShareCard = function (result) {
    var canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1440;
    var ctx = canvas.getContext('2d'); if (!ctx) throw new Error('当前环境无法生成结果图，请截图保留你的结果。');
    var p = result.primary, metrics = A.displayMetrics(p, result.vector), palette = colors();
    ctx.fillStyle = palette.paper; ctx.fillRect(0, 0, 1080, 1440);
    mark(ctx, 66, 55, 54, palette); ctx.fillStyle = palette.ink; ctx.font = '600 30px ' + sans; ctx.fillText('AI 心动人格测试', 140, 94);
    ctx.fillStyle = palette.muted; ctx.font = '26px ' + sans; ctx.textAlign = 'right'; ctx.fillText('心动人格卡', 998, 93); ctx.textAlign = 'left';
    box(ctx, 56, 170, 968, 1120, 46, '#FFFFFF', palette.line);
    var label = result.mode === 'dual' ? '你的心动人格 · 双核心人格' : '你的心动人格';
    ctx.font = '27px ' + sans; var labelWidth = ctx.measureText(label).width + 36;
    box(ctx, 96, 234, labelWidth, 52, 15, '#FFF0F6'); ctx.fillStyle = palette.label; ctx.fillText(label, 114, 269);
    mark(ctx, 865, 214, 95, palette);
    ctx.fillStyle = palette.muted; ctx.font = '23px ' + sans; ctx.fillText('心动档案 · ' + p.id.padStart(2, '0'), 96, 327);
    ctx.fillStyle = palette.accent; ctx.font = '700 94px ' + sans; ctx.fillText(p.name, 88, 445);
    if (result.mode === 'dual') { ctx.fillStyle = palette.muted; ctx.font = '42px ' + sans; ctx.fillText('× ' + result.secondary.shortName, 96, 509); }
    if (metrics.length) metrics.forEach(function (m, i) {
      var x = 96 + 295 * i; ctx.fillStyle = palette.accent; ctx.font = '600 75px ' + sans; ctx.fillText(String(m.value), x, 613);
      var size = ctx.measureText(String(m.value)).width; ctx.font = '28px ' + sans; ctx.fillText('%', x + size + 7, 613);
      ctx.fillStyle = palette.muted; ctx.font = '25px ' + sans; ctx.fillText(m.label, x, 661);
    });
    var tagsY = metrics.length ? 724 : 565, tx = 96; ctx.font = '24px ' + sans;
    p.keywords.forEach(function (tag) { var width = ctx.measureText(tag).width + 32; box(ctx, tx, tagsY - 30, width, 47, 14, palette.tags); ctx.fillStyle = palette.accent; ctx.fillText(tag, tx + 16, tagsY + 2); tx += width + 12; });
    var quoteY = metrics.length ? 806 : 664;
    ctx.font = '38px ' + sans; var quoteLines = lines(ctx, A.resultCopy[p.id].insight.replace(/^「|」$/g, ''), 806);
    var quoteHeight = Math.max(270, quoteLines.length * 64 + 95);
    box(ctx, 92, quoteY, 896, quoteHeight, 28, palette.quote);
    ctx.fillStyle = palette.quoteMark; ctx.font = '94px Georgia'; ctx.fillText('“', 122, quoteY + 77);
    ctx.fillStyle = palette.quoteInk; ctx.font = '38px ' + sans;
    quoteLines.forEach(function (line, i) { ctx.fillText(line, 132, quoteY + 132 + i * 64); });
    if (result.mode === 'secondary') { ctx.fillStyle = palette.muted; ctx.font = '25px ' + sans; ctx.fillText('隐藏副型：' + result.secondary.shortName, 96, 1165); }
    ctx.strokeStyle = palette.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(96, 1204); ctx.lineTo(984, 1204); ctx.stroke();
    ctx.fillStyle = palette.ink; ctx.font = '27px ' + sans; ctx.fillText('15个心动情境，看看你到底吃哪一款', 96, 1255);
    ctx.fillStyle = palette.muted; ctx.font = '23px ' + sans; ctx.textAlign = 'center'; ctx.fillText('娱乐向恋爱偏好测试 · 把这份心动留给自己', 540, 1372); ctx.textAlign = 'left'; return canvas;
  };
})(window.HeartTest);
