/* Hero animation: dot grid that lights up near the cursor + a pen-tool bezier path that draws itself.
   Self-contained. Add <script src="hero-animation.js" defer></script> to index.html. */
(function () {
  var hero = document.querySelector('.hero');
  if (!hero) return;

  var css = document.createElement('style');
  css.textContent = '.hero > .hero-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}';
  document.head.appendChild(css);

  var cv = document.createElement('canvas');
  cv.className = 'hero-canvas';
  cv.setAttribute('aria-hidden', 'true');
  hero.insertBefore(cv, hero.firstChild);
  var ctx = cv.getContext('2d');

  var LIME = '198,249,31', BROWN = '#8d6346';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1, gap = 44, dots = [];
  var mouse = { x: -999, y: -999, sx: -999, sy: -999, on: false };
  var running = false, visible = true, t0 = 0;

  // anchor positions as fractions of the hero, each with its own drift
  var A = [
    { fx: .52, fy: .62, px: 0.0, ax: 26, ay: 20 },
    { fx: .64, fy: .24, px: 1.3, ax: 22, ay: 28 },
    { fx: .78, fy: .55, px: 2.6, ax: 30, ay: 22 },
    { fx: .88, fy: .18, px: 3.9, ax: 18, ay: 26 },
    { fx: .95, fy: .46, px: 5.2, ax: 14, ay: 18 }
  ];

  function resize() {
    var r = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gap = W < 700 ? 34 : 44;
    dots = [];
    for (var y = gap / 2; y < H; y += gap)
      for (var x = gap / 2; x < W; x += gap) dots.push([x, y]);
    if (!running) draw(reduce ? 99 : performance.now() / 1000 - t0);
  }

  function pts(t) {
    return A.map(function (a) {
      return {
        x: a.fx * W + Math.sin(t * .6 + a.px) * a.ax,
        y: a.fy * H * (W < 700 ? .6 : 1) + Math.cos(t * .5 + a.px) * a.ay
      };
    });
  }

  function ease(p) { return 1 - Math.pow(1 - p, 3); }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    // smooth the pointer
    mouse.sx += (mouse.x - mouse.sx) * .12;
    mouse.sy += (mouse.y - mouse.sy) * .12;

    // dot grid
    var R = 170;
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i], dx = d[0] - mouse.sx, dy = d[1] - mouse.sy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var wave = reduce ? 0 : Math.sin(t * .9 + d[0] * .008 + d[1] * .006) * .035;
      var near = dist < R && mouse.on ? 1 - dist / R : 0;
      var a = .09 + wave + near * .75;
      ctx.fillStyle = near > .02 ? 'rgba(' + LIME + ',' + a.toFixed(3) + ')' : 'rgba(255,255,255,' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(d[0], d[1], 1.2 + near * 2.4, 0, 6.2832);
      ctx.fill();
    }

    // pen-tool path
    var P = pts(t), n = P.length;
    function at(i) { return P[Math.max(0, Math.min(n - 1, i))]; }
    function ctrl(i) { // Catmull-Rom tangent
      var p0 = at(i - 1), p2 = at(i + 1);
      return { x: (p2.x - p0.x) / 6, y: (p2.y - p0.y) / 6 };
    }
    var prog = reduce ? 1 : ease(Math.min(1, Math.max(0, (t - .7) / 2.6)));

    var len = 0;
    for (var k = 0; k < n - 1; k++) len += Math.hypot(P[k + 1].x - P[k].x, P[k + 1].y - P[k].y);
    len *= 1.25;

    ctx.save();
    ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(' + LIME + ',.7)';
    ctx.shadowColor = 'rgba(' + LIME + ',.35)'; ctx.shadowBlur = 12;
    if (prog < 1) { ctx.setLineDash([len, len]); ctx.lineDashOffset = len * (1 - prog); }
    ctx.beginPath(); ctx.moveTo(P[0].x, P[0].y);
    for (var s = 0; s < n - 1; s++) {
      var c1 = ctrl(s), c2 = ctrl(s + 1);
      ctx.bezierCurveTo(P[s].x + c1.x, P[s].y + c1.y, P[s + 1].x - c2.x, P[s + 1].y - c2.y, P[s + 1].x, P[s + 1].y);
    }
    ctx.stroke();
    ctx.restore();

    // anchors, handles, coordinates
    ctx.font = '10px "Space Mono", monospace';
    for (var j = 0; j < n; j++) {
      if (prog < j / (n - 1) - .02) break;
      var p = P[j], h = ctrl(j);
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.x - h.x * 1.4, p.y - h.y * 1.4); ctx.lineTo(p.x + h.x * 1.4, p.y + h.y * 1.4); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      [-1, 1].forEach(function (sg) {
        ctx.beginPath(); ctx.arc(p.x + sg * h.x * 1.4, p.y + sg * h.y * 1.4, 2.2, 0, 6.2832); ctx.fill();
      });
      ctx.fillStyle = '#141115'; ctx.strokeStyle = 'rgb(' + LIME + ')'; ctx.lineWidth = 1.5;
      ctx.fillRect(p.x - 4, p.y - 4, 8, 8); ctx.strokeRect(p.x - 4, p.y - 4, 8, 8);
      if (W > 700) {
        ctx.fillStyle = BROWN;
        var lbl = 'x ' + Math.round(p.x) + '  y ' + Math.round(p.y);
        var lx = p.x + 10 + ctx.measureText(lbl).width > W - 8 ? p.x - 10 - ctx.measureText(lbl).width : p.x + 10;
        ctx.fillText(lbl, lx, p.y - 10);
      }
    }
  }

  function loop(now) {
    if (!running) return;
    draw(now / 1000 - t0);
    requestAnimationFrame(loop);
  }
  function start() { if (running || reduce || !visible || document.hidden) return; running = true; requestAnimationFrame(loop); }
  function stop() { running = false; }

  t0 = performance.now() / 1000;
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; visible ? start() : stop(); }).observe(hero);
  }
  if (!reduce) {
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
      if (mouse.sx < -900) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
    });
    hero.addEventListener('mouseleave', function () { mouse.on = false; });
  }
  start();
  if (reduce) draw(99);
})();
