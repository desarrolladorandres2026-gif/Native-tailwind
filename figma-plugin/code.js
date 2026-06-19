// ============================================================
// DEBUTA APP — Figma Prototype Generator
// Compatible con el motor QuickJS de Figma (sin object spread,
// sin empty catch, sin sintaxis ES2018+ no soportada)
// ============================================================

var W = 390;
var H = 844;
var GAP = 120;

var C = {
  bg:         '#0D0D1A',
  bgGrad1:    '#050505',
  bgGrad2:    '#160B2A',
  card:       '#1A1A2E',
  cardBorder: 'rgba(255,255,255,0.10)',
  primary:    '#8B5CF6',
  secondary:  '#D946EF',
  tertiary:   '#6366F1',
  text:       '#FFFFFF',
  textDim:    '#D1D5DB',
  textLight:  '#9CA3AF',
  inputBg:    '#14141E',
  error:      '#EF4444',
  success:    '#10B981',
  green:      '#34C759',
  orange:     '#FF6B00',
  white:      '#FFFFFF',
  black:      '#000000',
};

// ── Helpers de color ─────────────────────────────────────────
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

function hexColor(h) {
  var p = hexToRgb(h);
  return { r: p.r, g: p.g, b: p.b };
}

function solidPaint(color, opacity) {
  if (opacity === undefined) { opacity = 1; }
  var p = hexToRgb(color);
  return [{ type: 'SOLID', color: { r: p.r, g: p.g, b: p.b }, opacity: opacity }];
}

function gradientPaint(colorsArr, angle) {
  if (angle === undefined) { angle = 90; }
  var rad = (angle * Math.PI) / 180;
  var cos = Math.cos(rad);
  var sin = Math.sin(rad);
  var stops = [];
  for (var i = 0; i < colorsArr.length; i++) {
    var entry = colorsArr[i];
    var c = entry[0];
    var pos = entry.length > 1 ? entry[1] : i / (colorsArr.length - 1);
    stops.push({ position: pos, color: hexColor(c) });
  }
  return [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [
      [cos, sin, 0.5 - 0.5 * cos - 0.5 * sin],
      [-sin, cos, 0.5 + 0.5 * sin - 0.5 * cos],
    ],
    gradientStops: stops,
  }];
}

// ── Helpers de nodo ───────────────────────────────────────────
async function loadFont(family, style) {
  if (!family) { family = 'Inter'; }
  if (!style)  { style  = 'Regular'; }
  try {
    await figma.loadFontAsync({ family: family, style: style });
  } catch(e) {
    // ignorar fuente no disponible
  }
}

function rect(parent, x, y, w, h, fills, opts) {
  if (!opts) { opts = {}; }
  var node = figma.createRectangle();
  node.x = x; node.y = y;
  node.resize(w, h);
  node.fills = fills;
  if (opts.radius !== undefined) { node.cornerRadius = opts.radius; }
  if (opts.name) { node.name = opts.name; }
  if (opts.opacity !== undefined) { node.opacity = opts.opacity; }
  if (opts.strokes) {
    node.strokes = opts.strokes;
    node.strokeWeight = opts.strokeWeight || 1;
  }
  parent.appendChild(node);
  return node;
}

function txt(parent, content, x, y, opts) {
  if (!opts) { opts = {}; }
  var node = figma.createText();
  node.x = x; node.y = y;
  node.characters = String(content);
  node.fills = solidPaint(opts.color || C.text);
  node.fontSize = opts.size || 14;
  node.fontName = { family: opts.family || 'Inter', style: opts.weight || 'Regular' };
  if (opts.width) { node.textAutoResize = 'HEIGHT'; node.resize(opts.width, 20); }
  if (opts.align) { node.textAlignHorizontal = opts.align; }
  if (opts.opacity !== undefined) { node.opacity = opts.opacity; }
  if (opts.name) { node.name = opts.name; }
  if (opts.lineHeight) { node.lineHeight = { unit: 'PIXELS', value: opts.lineHeight }; }
  if (opts.letterSpacing) { node.letterSpacing = { unit: 'PIXELS', value: opts.letterSpacing }; }
  parent.appendChild(node);
  return node;
}

function circle(parent, cx, cy, r, fills, opts) {
  if (!opts) { opts = {}; }
  var node = figma.createEllipse();
  node.x = cx - r; node.y = cy - r;
  node.resize(r * 2, r * 2);
  node.fills = fills;
  if (opts.strokes) { node.strokes = opts.strokes; node.strokeWeight = opts.strokeWeight || 2; }
  if (opts.name) { node.name = opts.name; }
  if (opts.opacity !== undefined) { node.opacity = opts.opacity; }
  parent.appendChild(node);
  return node;
}

function makeFrame(parent, x, y, w, h, opts) {
  if (!opts) { opts = {}; }
  var f = figma.createFrame();
  f.x = x; f.y = y;
  f.resize(w, h);
  f.fills = opts.fills || solidPaint(C.bg);
  f.clipsContent = opts.clip !== false;
  if (opts.name) { f.name = opts.name; }
  if (opts.radius !== undefined) { f.cornerRadius = opts.radius; }
  if (opts.strokes) { f.strokes = opts.strokes; f.strokeWeight = opts.strokeWeight || 1; }
  if (opts.opacity !== undefined) { f.opacity = opts.opacity; }
  parent.appendChild(f);
  return f;
}

function transparentFill() {
  return [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0 }];
}

// ── Botón gradiente ───────────────────────────────────────────
function gradBtn(parent, x, y, w, h, label, opts) {
  if (!opts) { opts = {}; }
  var c1 = opts.c1 || C.primary;
  var c2 = opts.c2 || C.secondary;
  var f = makeFrame(parent, x, y, w, h, {
    fills: gradientPaint([[c1, 0], [c2, 1]], opts.angle || 90),
    radius: opts.radius !== undefined ? opts.radius : 16,
    name: opts.name || label,
  });
  var t = txt(f, label, 0, 0, {
    color: C.white, size: opts.size || 16,
    weight: 'Bold', width: w, align: 'CENTER',
  });
  t.y = (h - t.height) / 2;
  return f;
}

// ── Chip ──────────────────────────────────────────────────────
function chip(parent, x, y, label, opts) {
  if (!opts) { opts = {}; }
  var padding = opts.padding !== undefined ? opts.padding : 12;
  var ph = opts.ph !== undefined ? opts.ph : 8;
  var f = makeFrame(parent, x, y, 10, 10, {
    fills: opts.fills || solidPaint(C.card),
    radius: opts.radius !== undefined ? opts.radius : 20,
    name: opts.name || label,
    strokes: opts.strokes,
    strokeWeight: opts.strokeWeight || 1,
  });
  var t = txt(f, label, padding, ph, {
    color: opts.color || C.textDim,
    size: opts.size || 13,
    weight: opts.weight || 'SemiBold',
  });
  f.resize(t.width + padding * 2, t.height + ph * 2);
  return f;
}

// ── Input ─────────────────────────────────────────────────────
function inputField(parent, x, y, w, placeholder, opts) {
  if (!opts) { opts = {}; }
  var h = opts.height || 52;
  var f = makeFrame(parent, x, y, w, h, {
    fills: solidPaint(C.inputBg),
    radius: opts.radius || 16,
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }],
    strokeWeight: 1,
    name: opts.name || placeholder,
  });
  txt(f, placeholder, 14, (h - 18) / 2, { color: C.textLight, size: 15 });
  return f;
}

// ── Avatar placeholder ────────────────────────────────────────
function avatarPlaceholder(parent, x, y, size, initials, opts) {
  if (!opts) { opts = {}; }
  var f = makeFrame(parent, x, y, size, size, {
    fills: gradientPaint([[C.primary, 0], [C.secondary, 1]], 135),
    radius: size / 2,
    name: opts.name || 'Avatar',
  });
  var t = txt(f, initials, 0, 0, {
    color: C.white, size: size * 0.36,
    weight: 'Bold', width: size, align: 'CENTER',
  });
  t.y = (size - t.height) / 2;
  return f;
}

// ── Bottom Nav ────────────────────────────────────────────────
function bottomNav(parent, activeTab) {
  var tabs = [
    { icon: 'D', label: 'Discover' },
    { icon: 'L', label: 'Likes'    },
    { icon: 'M', label: 'Matches'  },
    { icon: 'P', label: 'Perfil'   },
  ];
  var navH = 84;
  var f = makeFrame(parent, 0, H - navH, W, navH, {
    fills: solidPaint(C.card),
    name: 'BottomNav',
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }],
    strokeWeight: 1,
  });
  var tabW = W / tabs.length;
  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i];
    var active = (tab.label === activeTab);
    var tf = makeFrame(f, i * tabW, 0, tabW, navH, {
      fills: transparentFill(),
      name: 'tab-' + tab.label,
    });
    txt(tf, tab.icon, 0, 12, {
      color: active ? C.primary : C.textLight,
      size: 18, weight: active ? 'Bold' : 'Regular',
      width: tabW, align: 'CENTER',
    });
    txt(tf, tab.label, 0, 36, {
      color: active ? C.primary : C.textLight,
      size: 10, weight: active ? 'Bold' : 'Regular',
      width: tabW, align: 'CENTER',
    });
    if (active) {
      rect(tf, (tabW - 20) / 2, 72, 20, 4,
        gradientPaint([[C.primary, 0], [C.secondary, 1]]),
        { radius: 2 });
    }
  }
  return f;
}

// ═══════════════════════════════════════════════════════════════
// SPLASH
// ═══════════════════════════════════════════════════════════════
async function buildSplash(page, offsetX) {
  var f = makeFrame(page, offsetX, 0, W, H, {
    fills: gradientPaint([[C.bgGrad1, 0], [C.bgGrad2, 0.5], [C.bgGrad1, 1]], 135),
    name: '01 - Splash',
  });
  circle(f, W * 0.2, H * 0.18, 120,
    gradientPaint([[C.primary, 0], [C.bgGrad1, 1]]),
    { opacity: 0.3, name: 'orb1' });
  circle(f, W * 0.82, H * 0.72, 100,
    gradientPaint([[C.secondary, 0], [C.bgGrad1, 1]]),
    { opacity: 0.25, name: 'orb2' });

  var logoY = H / 2 - 90;
  circle(f, W / 2, logoY, 62,
    gradientPaint([[C.primary, 0], [C.secondary, 1]], 135),
    { name: 'logo-ring' });
  var inner = makeFrame(f, W / 2 - 46, logoY - 46, 92, 92, {
    fills: solidPaint(C.card), radius: 46, name: 'logo-inner',
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], strokeWeight: 1,
  });
  txt(inner, 'D', 0, 18, { color: C.primary, size: 48, weight: 'Bold', width: 92, align: 'CENTER' });

  txt(f, 'Debuta', 0, logoY + 74, {
    color: C.white, size: 36, weight: 'Bold',
    width: W, align: 'CENTER', letterSpacing: 1, name: 'logo-text',
  });
  txt(f, 'Conexiones Reales', 0, logoY + 120, {
    color: C.textLight, size: 16, width: W, align: 'CENTER', letterSpacing: 0.6,
  });

  var dotY = logoY + 180;
  var dotColors = [C.primary, C.secondary, C.tertiary];
  for (var i = 0; i < dotColors.length; i++) {
    circle(f, W / 2 - 24 + i * 24, dotY, 6, solidPaint(dotColors[i]));
  }
  return f;
}

// ═══════════════════════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════════════════════
async function buildOnboarding(page, offsetX) {
  var f = makeFrame(page, offsetX, 0, W, H, {
    fills: gradientPaint([[C.bgGrad1, 0], [C.bgGrad2, 0.5], [C.bgGrad1, 1]], 135),
    name: '02 - Onboarding',
  });

  var skipF = makeFrame(f, W - 110, 56, 88, 36, {
    fills: solidPaint(C.card), radius: 20, name: 'btn-skip',
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], strokeWeight: 1,
  });
  txt(skipF, 'Saltar', 0, 9, { color: C.textDim, size: 13, weight: 'SemiBold', width: 88, align: 'CENTER' });

  var iconY = H * 0.28;
  circle(f, W / 2, iconY, 80, gradientPaint([[C.primary, 0], [C.secondary, 1]], 135), { name: 'icon-ring' });
  var iconInner = makeFrame(f, W / 2 - 62, iconY - 62, 124, 124, {
    fills: solidPaint(C.card), radius: 62,
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], name: 'icon-inner',
  });
  txt(iconInner, 'D', 0, 28, { color: C.primary, size: 60, weight: 'Bold', width: 124, align: 'CENTER' });

  var textY = iconY + 98;
  txt(f, 'Tu proxima conexion te espera', 0, textY, {
    color: C.white, size: 28, weight: 'Bold', width: W - 64,
    align: 'CENTER', lineHeight: 36, name: 'slide-title',
  }).x = 32;
  txt(f, 'La app que te conecta con personas reales en tu ciudad.', 0, textY + 82, {
    color: C.textDim, size: 15, width: W - 80,
    align: 'CENTER', lineHeight: 22, name: 'slide-subtitle',
  }).x = 40;

  var chipF = makeFrame(f, 32, textY + 144, W - 64, 52, {
    fills: solidPaint(C.card), radius: 20, name: 'chip-detail',
    strokes: [{ type: 'SOLID', color: hexColor(C.primary) }], strokeWeight: 1,
  });
  // opacity de stroke ajustado con opacidad en la capa
  chipF.strokes = [{ type: 'SOLID', color: hexColor(C.primary), opacity: 0.25 }];
  txt(chipF, 'Crea tu perfil y empieza a descubrir.', 16, 16, {
    color: C.textDim, size: 13, weight: 'SemiBold', width: W - 96,
  });

  var dotsY = H - 160;
  var dotWidths = [28, 10, 10, 10];
  var dotXStart = (W - 78) / 2;
  for (var i = 0; i < dotWidths.length; i++) {
    rect(f, dotXStart, dotsY, dotWidths[i], 10,
      i === 0 ? solidPaint(C.primary) : solidPaint(C.textLight),
      { radius: 5, name: 'page-dot-' + i });
    dotXStart += dotWidths[i] + 8;
  }

  var navY = dotsY + 28;
  makeFrame(f, 32, navY, 48, 48, {
    fills: transparentFill(), radius: 24, name: 'btn-back',
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], strokeWeight: 1, opacity: 0,
  });
  gradBtn(f, 96, navY, W - 128, 48, 'Continuar', { name: 'btn-next' });
  return f;
}

// ═══════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════
async function buildLogin(page, offsetX) {
  var f = makeFrame(page, offsetX, 0, W, H, {
    fills: gradientPaint([[C.bgGrad1, 0], [C.bgGrad2, 0.5], [C.bgGrad1, 1]], 135),
    name: '03 - Login',
  });

  circle(f, W / 2, 110, 38, gradientPaint([[C.primary, 0], [C.secondary, 1]], 135));
  txt(f, 'D', 0, 90, { color: C.white, size: 32, weight: 'Bold', width: W, align: 'CENTER' });
  txt(f, 'Debuta', 0, 160, { color: C.white, size: 28, weight: 'Bold', width: W, align: 'CENTER', letterSpacing: 1 });
  txt(f, 'Bienvenido de vuelta', 0, 196, { color: C.textLight, size: 15, width: W, align: 'CENTER' });

  var formY = 272;
  inputField(f, 32, formY, W - 64, 'Correo electronico', { name: 'input-email' });
  inputField(f, 32, formY + 66, W - 64, 'Contrasena', { name: 'input-password' });

  txt(f, 'Olvidaste tu contrasena?', W - 32, formY + 148, {
    color: C.primary, size: 13, weight: 'SemiBold',
    width: W - 64, align: 'RIGHT', name: 'btn-forgot',
  });

  gradBtn(f, 32, formY + 172, W - 64, 52, 'Iniciar Sesion', { radius: 16, name: 'btn-login' });

  var divY = formY + 242;
  rect(f, 32, divY + 10, (W - 100) / 2, 1, solidPaint(C.cardBorder));
  txt(f, 'o', W / 2, divY, { color: C.textLight, size: 14, width: 36, align: 'CENTER' });
  rect(f, W / 2 + 18, divY + 10, (W - 100) / 2, 1, solidPaint(C.cardBorder));

  var googleF = makeFrame(f, 32, divY + 36, W - 64, 52, {
    fills: solidPaint(C.card), radius: 16,
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], name: 'btn-google',
  });
  txt(googleF, 'G  Continuar con Google', 0, 16, { color: C.text, size: 15, weight: 'SemiBold', width: W - 64, align: 'CENTER' });

  txt(f, 'No tienes cuenta? Registrate', 0, H - 80, {
    color: C.textDim, size: 14, width: W, align: 'CENTER', name: 'btn-register',
  });
  return f;
}

// ═══════════════════════════════════════════════════════════════
// DISCOVER
// ═══════════════════════════════════════════════════════════════
async function buildDiscover(page, offsetX) {
  var f = makeFrame(page, offsetX, 0, W, H, {
    fills: gradientPaint([[C.bgGrad1, 0], [C.bgGrad2, 0.5], [C.bgGrad1, 1]], 135),
    name: '04 - Discover',
  });

  txt(f, '9:41', 16, 14, { color: C.white, size: 15, weight: 'Bold' });

  var headerF = makeFrame(f, 0, 44, W, 56, { fills: transparentFill(), name: 'header' });
  var filterBtn = makeFrame(headerF, 20, 8, 150, 40, {
    fills: solidPaint(C.card), radius: 20, name: 'btn-filter',
    strokes: [{ type: 'SOLID', color: hexColor(C.primary) }], strokeWeight: 1,
  });
  txt(filterBtn, 'Filtros', 14, 10, { color: C.primary, size: 14, weight: 'Bold' });
  circle(headerF, W - 30, 20, 18, solidPaint(C.card), {
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], name: 'btn-notif',
  });
  txt(headerF, '*', W - 37, 8, { color: C.textLight, size: 18 });

  chip(f, 20, 108, '30km', { fills: solidPaint(C.white, 0.07), color: C.textLight, size: 11, weight: 'Bold', radius: 10, ph: 4, padding: 9 });
  chip(f, 70, 108, '18-30', { fills: solidPaint(C.white, 0.07), color: C.textLight, size: 11, weight: 'Bold', radius: 10, ph: 4, padding: 9 });
  chip(f, 126, 108, 'Citas', { fills: solidPaint(C.white, 0.07), color: C.textLight, size: 11, weight: 'Bold', radius: 10, ph: 4, padding: 9 });

  var cardY = 138;
  var cardH = H - 138 - 210;
  var cardF = makeFrame(f, 20, cardY, W - 40, cardH, {
    fills: gradientPaint([[C.primary, 0], [C.bgGrad2, 0.5], [C.secondary, 1]], 160),
    radius: 28, name: 'SwipeCard-top',
  });
  rect(cardF, 0, cardH - 160, W - 40, 160,
    gradientPaint([['#00000000', 0], [C.black, 1]], 180),
    { radius: 28 });
  txt(cardF, 'Valentina, 24', 20, cardH - 120, { color: C.white, size: 26, weight: 'Bold' });
  txt(cardF, '2.3 km de ti', 20, cardH - 90, { color: C.textDim, size: 14 });
  txt(cardF, '87% afinidad', 20, cardH - 64, { color: C.primary, size: 13, weight: 'SemiBold' });
  chip(cardF, 20, cardH - 40, 'Musica', { fills: solidPaint(C.white, 0.2), color: C.white, size: 11, radius: 10, ph: 5, padding: 8 });
  chip(cardF, 82, cardH - 40, 'Viajes', { fills: solidPaint(C.white, 0.2), color: C.white, size: 11, radius: 10, ph: 5, padding: 8 });

  rect(f, 28, cardY + cardH - 8, W - 56, 18, solidPaint(C.card, 0.7), { radius: 28, name: 'card-stack-2' });

  var btnY = cardY + cardH + 24;
  var undoF = makeFrame(f, W / 2 - 140, btnY, 52, 52, {
    fills: solidPaint(C.card), radius: 26,
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], name: 'btn-undo',
  });
  txt(undoF, '<', 0, 14, { color: C.textLight, size: 18, weight: 'Bold', width: 52, align: 'CENTER' });

  var disF = makeFrame(f, W / 2 - 78, btnY - 6, 64, 64, {
    fills: solidPaint(C.card), radius: 32,
    strokes: [{ type: 'SOLID', color: hexColor(C.error) }], strokeWeight: 2, name: 'btn-dislike',
  });
  txt(disF, 'X', 0, 16, { color: C.error, size: 24, weight: 'Bold', width: 64, align: 'CENTER' });

  var supF = makeFrame(f, W / 2 - 22, btnY, 44, 44, {
    fills: solidPaint(C.card), radius: 22,
    strokes: [{ type: 'SOLID', color: hexColor(C.tertiary) }], name: 'btn-superlike',
  });
  txt(supF, '*', 0, 10, { color: C.tertiary, size: 22, width: 44, align: 'CENTER' });

  var likeF = makeFrame(f, W / 2 + 14, btnY - 6, 64, 64, {
    fills: gradientPaint([[C.primary, 0], [C.secondary, 1]], 135),
    radius: 32, name: 'btn-like',
  });
  txt(likeF, 'L', 0, 16, { color: C.white, size: 24, weight: 'Bold', width: 64, align: 'CENTER' });

  bottomNav(f, 'Discover');
  return f;
}

// ═══════════════════════════════════════════════════════════════
// LIKES
// ═══════════════════════════════════════════════════════════════
async function buildLikes(page, offsetX) {
  var f = makeFrame(page, offsetX, 0, W, H, {
    fills: gradientPaint([[C.bgGrad1, 0], [C.bgGrad2, 0.5], [C.bgGrad1, 1]], 135),
    name: '05 - Likes',
  });
  txt(f, 'Te gustaron', 20, 64, { color: C.white, size: 30, weight: 'Bold', letterSpacing: -0.5, name: 'title' });
  txt(f, '12 personas quieren conectar contigo', 20, 104, { color: C.textLight, size: 13, weight: 'Medium' });

  var colW = (W - 60) / 2;
  var gridData = [
    { name: 'Ana, 22', km: '1.2', init: 'A' },
    { name: 'Carlos, 27', km: '3.5', init: 'C' },
    { name: 'Maria, 25', km: '0.8', init: 'M' },
    { name: 'Diego, 29', km: '5.1', init: 'D' },
  ];
  var gridColors = [C.primary, C.secondary, C.tertiary, C.primary];

  for (var i = 0; i < gridData.length; i++) {
    var d = gridData[i];
    var col = i % 2;
    var row = Math.floor(i / 2);
    var cx = 20 + col * (colW + 20);
    var cy = 136 + row * (colW * 1.3 + 16);
    var cH = colW * 1.3;
    var card = makeFrame(f, cx, cy, colW, cH, {
      fills: gradientPaint([[gridColors[i], 0], [C.bgGrad2, 1]], 160),
      radius: 20, name: 'likes-card-' + i,
    });
    rect(card, 0, cH - 64, colW, 64,
      gradientPaint([['#00000000', 0], [C.black, 1]], 180),
      { radius: 20 });
    txt(card, d.name, 10, cH - 48, { color: C.white, size: 14, weight: 'Bold' });
    txt(card, d.km + ' km', 10, cH - 28, { color: C.textDim, size: 11 });
    var blurB = makeFrame(card, colW / 2 - 28, cH / 2 - 18, 56, 36, {
      fills: solidPaint(C.black, 0.4), radius: 12, name: 'blur-badge',
    });
    txt(blurB, 'Ver', 0, 9, { color: C.white, size: 12, weight: 'Bold', width: 56, align: 'CENTER' });
  }

  bottomNav(f, 'Likes');
  return f;
}

// ═══════════════════════════════════════════════════════════════
// MATCHES
// ═══════════════════════════════════════════════════════════════
async function buildMatches(page, offsetX) {
  var f = makeFrame(page, offsetX, 0, W, H, {
    fills: solidPaint(C.bg), name: '06 - Matches',
  });

  txt(f, 'Mensajes', 20, 64, { color: C.white, size: 30, weight: 'Bold', letterSpacing: -0.8, name: 'title' });
  txt(f, '4 conversaciones', 20, 104, { color: C.textLight, size: 13, weight: 'Medium' });
  var optBtn = makeFrame(f, W - 62, 60, 42, 42, {
    fills: solidPaint(C.card), radius: 21,
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], name: 'btn-options',
  });
  txt(optBtn, 'O', 0, 11, { color: C.text, size: 16, weight: 'Bold', width: 42, align: 'CENTER' });

  var searchF = makeFrame(f, 20, 116, W - 40, 48, {
    fills: solidPaint(C.card), radius: 16,
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], name: 'search-bar',
  });
  txt(searchF, 'Buscar conversaciones...', 14, 14, { color: C.textLight, size: 14 });

  txt(f, 'Matches Nuevos', 20, 184, { color: C.white, size: 16, weight: 'Bold' });
  var newData = [
    { init: 'L', name: 'Laura' },
    { init: 'S', name: 'Sofia' },
    { init: 'J', name: 'Juan'  },
  ];
  for (var i = 0; i < newData.length; i++) {
    var nx = 20 + i * 96;
    var ny = 212;
    var ring = makeFrame(f, nx, ny, 82, 82, {
      fills: gradientPaint([[C.secondary, 0], [C.primary, 0.5], [C.secondary, 1]], 135),
      radius: 41, name: 'new-match-ring-' + i,
    });
    var inner = makeFrame(ring, 3, 3, 76, 76, { fills: solidPaint(C.bg), radius: 38 });
    avatarPlaceholder(inner, 3, 3, 70, newData[i].init);
    txt(f, newData[i].name, nx, ny + 90, { color: C.text, size: 12, weight: 'Bold', width: 82, align: 'CENTER' });
  }

  txt(f, 'Conversaciones', 20, 330, { color: C.white, size: 16, weight: 'Bold' });
  var chatData = [
    { init: 'V', name: 'Valentina', preview: 'Me encanto la sugerencia!', time: '2m', unread: 3 },
    { init: 'A', name: 'Andrea',    preview: 'Nos vemos manana?',           time: '1h', unread: 0 },
    { init: 'M', name: 'Miguel',    preview: 'Es un match! Di algo...',     time: '3h', unread: 0 },
    { init: 'L', name: 'Luisa',     preview: 'Es un match! Di algo...',     time: '1d', unread: 0 },
  ];
  for (var i = 0; i < chatData.length; i++) {
    var cd = chatData[i];
    var rowY = 360 + i * 78;
    var rowF = makeFrame(f, 0, rowY, W, 74, { fills: transparentFill(), name: 'chat-row-' + i });
    if (cd.unread > 0) {
      rect(rowF, 0, 0, 3, 74, gradientPaint([[C.primary, 0], [C.secondary, 1]]), { name: 'unread-bar' });
    }
    avatarPlaceholder(rowF, 20, 11, 52, cd.init);
    if (i === 0) {
      circle(rowF, 67, 58, 8, solidPaint(C.green), {
        strokes: [{ type: 'SOLID', color: hexColor(C.bg) }], strokeWeight: 2,
      });
    }
    if (cd.unread > 0) {
      circle(rowF, 65, 16, 11, gradientPaint([[C.primary, 0], [C.secondary, 1]]), {
        strokes: [{ type: 'SOLID', color: hexColor(C.black) }], strokeWeight: 2,
      });
      txt(rowF, String(cd.unread), 54, 8, { color: C.white, size: 10, weight: 'Bold', width: 22, align: 'CENTER' });
    }
    txt(rowF, cd.name, 88, 14, { color: C.white, size: 16, weight: cd.unread > 0 ? 'Bold' : 'SemiBold' });
    txt(rowF, cd.time, W - 50, 16, { color: C.textDim, size: 12 });
    txt(rowF, cd.preview, 88, 38, { color: cd.unread > 0 ? C.text : C.textLight, size: 14, width: W - 150 });
    rect(rowF, 20, 73, W - 40, 1, solidPaint(C.cardBorder, 0.5));
  }

  bottomNav(f, 'Matches');
  return f;
}

// ═══════════════════════════════════════════════════════════════
// CHAT
// ═══════════════════════════════════════════════════════════════
async function buildChat(page, offsetX) {
  var f = makeFrame(page, offsetX, 0, W, H, {
    fills: solidPaint(C.bg), name: '07 - Chat',
  });

  var headerF = makeFrame(f, 0, 0, W, 88, {
    fills: solidPaint(C.card), name: 'chat-header',
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], strokeWeight: 1,
  });
  var backBtn = makeFrame(headerF, 16, 44, 40, 40, { fills: transparentFill(), name: 'btn-back' });
  txt(backBtn, '<', 0, 8, { color: C.white, size: 24, weight: 'Bold', width: 40, align: 'CENTER' });
  avatarPlaceholder(headerF, 66, 46, 36, 'V');
  circle(headerF, 99, 79, 6, solidPaint(C.green), {
    strokes: [{ type: 'SOLID', color: hexColor(C.card) }], strokeWeight: 2,
  });
  txt(headerF, 'Valentina', 112, 46, { color: C.white, size: 16, weight: 'Bold' });
  txt(headerF, 'En linea', 112, 66, { color: C.green, size: 12 });

  var callF = makeFrame(headerF, W - 96, 44, 36, 36, {
    fills: solidPaint(C.card), radius: 18,
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], name: 'btn-call',
  });
  txt(callF, 'C', 0, 9, { color: C.primary, size: 16, weight: 'Bold', width: 36, align: 'CENTER' });
  var vidF = makeFrame(headerF, W - 52, 44, 36, 36, {
    fills: solidPaint(C.card), radius: 18,
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], name: 'btn-video-call',
  });
  txt(vidF, 'V', 0, 9, { color: C.primary, size: 16, weight: 'Bold', width: 36, align: 'CENTER' });

  var msgs = [
    { text: 'Hola! Vi que tambien te gusta la musica', mine: false, time: '10:30' },
    { text: 'Si! Tocas algun instrumento?', mine: true, time: '10:31' },
    { text: 'Toco guitarra desde los 12 anos.', mine: false, time: '10:32' },
    { text: 'Yo canto un poco, me encantaria aprender guitarra!', mine: true, time: '10:33' },
    { text: 'Te puedo ensenar! Seria un plan perfecto para una primera cita', mine: false, time: '10:35' },
  ];
  var msgY = 100;
  var maxW = W * 0.68;
  for (var i = 0; i < msgs.length; i++) {
    var m = msgs[i];
    var bubFills = m.mine
      ? gradientPaint([[C.primary, 0], [C.secondary, 1]], 135)
      : solidPaint(C.card);
    var bx = m.mine ? W - 20 - maxW : 20;
    var bubF = makeFrame(f, bx, msgY, maxW, 50, {
      fills: bubFills, radius: 18, name: 'msg-' + i,
    });
    var t = txt(bubF, m.text, 14, 12, { color: C.white, size: 14, lineHeight: 20, width: maxW - 28 });
    txt(bubF, m.time, maxW - 42, t.height + 14, {
      color: m.mine ? C.white : C.textLight, size: 10, opacity: m.mine ? 0.6 : 1,
    });
    bubF.resize(maxW, t.height + 38);
    if (m.mine) { bubF.x = W - 20 - maxW; }
    msgY += bubF.height + 10;
  }

  msgY += 10;
  var suggF = makeFrame(f, 20, msgY, W - 40, 160, {
    fills: solidPaint(C.card), radius: 20, name: 'date-suggestion-card',
    strokes: [{ type: 'SOLID', color: hexColor(C.primary) }], strokeWeight: 1,
  });
  txt(suggF, 'Sugerencia de Primera Cita!', 0, 14, {
    color: C.white, size: 13, weight: 'Bold', width: W - 40, align: 'CENTER',
  });
  rect(suggF, 14, 40, 80, 70, gradientPaint([[C.secondary, 0], [C.primary, 1]]), { radius: 12, name: 'restaurant-photo' });
  txt(suggF, 'La Casa del Arte', 106, 44, { color: C.white, size: 14, weight: 'Bold' });
  txt(suggF, '4.8 - Fusion colombiana', 106, 64, { color: C.textDim, size: 12 });
  txt(suggF, '1.2 km de ti', 106, 82, { color: C.textLight, size: 11 });
  gradBtn(suggF, 14, 118, (W - 68) / 2, 34, 'Aceptar', { radius: 12, size: 13 });
  var altBtn = makeFrame(suggF, 14 + (W - 68) / 2 + 10, 118, (W - 68) / 2, 34, {
    fills: solidPaint(C.inputBg), radius: 12,
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], name: 'btn-new-place',
  });
  txt(altBtn, 'Otro lugar', 0, 9, { color: C.textDim, size: 13, weight: 'SemiBold', width: (W - 68) / 2, align: 'CENTER' });

  var inputBar = makeFrame(f, 0, H - 88, W, 88, {
    fills: solidPaint(C.card), name: 'input-bar',
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], strokeWeight: 1,
  });
  var msgInput = makeFrame(inputBar, 20, 20, W - 80, 44, {
    fills: solidPaint(C.inputBg), radius: 22,
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], name: 'message-input',
  });
  txt(msgInput, 'Escribe un mensaje...', 16, 13, { color: C.textLight, size: 14 });
  var sendF = makeFrame(inputBar, W - 52, 20, 36, 44, {
    fills: gradientPaint([[C.primary, 0], [C.secondary, 1]]), radius: 18, name: 'btn-send',
  });
  txt(sendF, '>', 0, 12, { color: C.white, size: 18, weight: 'Bold', width: 36, align: 'CENTER' });

  return f;
}

// ═══════════════════════════════════════════════════════════════
// PERFIL
// ═══════════════════════════════════════════════════════════════
async function buildProfile(page, offsetX) {
  var f = makeFrame(page, offsetX, 0, W, H, {
    fills: solidPaint(C.bg), name: '08 - Perfil',
  });

  var cover = makeFrame(f, 0, 0, W, 280, {
    fills: gradientPaint([[C.primary, 0], [C.secondary, 0.5], [C.tertiary, 1]], 135),
    name: 'cover-photo',
  });
  rect(cover, 0, 0, W, 280,
    gradientPaint([['#00000099', 0], ['#00000000', 0.4], ['#00000066', 1]]), {});
  txt(cover, '<', 20, 56, { color: C.white, size: 30, weight: 'Bold', name: 'btn-back' });
  txt(cover, 'Mi Perfil', 0, 60, { color: C.white, size: 18, weight: 'Bold', width: W, align: 'CENTER' });
  txt(cover, 'S', W - 50, 60, { color: C.white, size: 22, name: 'btn-settings' });

  var cardF = makeFrame(f, 16, 240, W - 32, 520, {
    fills: solidPaint(C.card), radius: 36,
    strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], strokeWeight: 1, name: 'profile-card',
  });

  var ringSize = 128;
  var avatarRing = makeFrame(f, W / 2 - ringSize / 2 - 4, 190, ringSize + 8, ringSize + 8, {
    fills: gradientPaint([[C.primary, 0], [C.secondary, 0.5], [C.tertiary, 1]], 135),
    radius: (ringSize + 8) / 2, name: 'avatar-ring',
  });
  var avatarInner = makeFrame(avatarRing, 7, 7, ringSize - 6, ringSize - 6, {
    fills: solidPaint(C.card), radius: (ringSize - 6) / 2,
  });
  avatarPlaceholder(avatarInner, 5, 5, ringSize - 16, 'MJ');

  txt(cardF, 'Maria Jose Garcia', 0, 84, { color: C.white, size: 24, weight: 'Bold', width: W - 32, align: 'CENTER' });
  txt(cardF, '@mariajose - verificada', 0, 114, { color: C.textLight, size: 14, width: W - 32, align: 'CENTER' });

  var statsF = makeFrame(cardF, 20, 148, W - 72, 72, {
    fills: solidPaint(C.white, 0.04), radius: 22,
    strokes: [{ type: 'SOLID', color: hexColor(C.white) }], strokeWeight: 1, name: 'stats-row',
  });
  statsF.strokes = [{ type: 'SOLID', color: hexColor(C.white), opacity: 0.08 }];
  var statW = (W - 72) / 2;
  txt(statsF, '24', 0, 14, { color: C.primary, size: 22, weight: 'Bold', width: statW, align: 'CENTER' });
  txt(statsF, 'MATCHES', 0, 40, { color: C.textLight, size: 10, weight: 'Bold', width: statW, align: 'CENTER', letterSpacing: 1 });
  rect(statsF, statW, 16, 1, 40, solidPaint(C.white, 0.1));
  txt(statsF, '87', statW, 14, { color: C.secondary, size: 22, weight: 'Bold', width: statW, align: 'CENTER' });
  txt(statsF, 'LIKES DADOS', statW, 40, { color: C.textLight, size: 10, weight: 'Bold', width: statW, align: 'CENTER', letterSpacing: 1 });

  txt(cardF, 'Que estoy buscando?', 20, 240, { color: C.white, size: 18, weight: 'Bold' });
  var buscandoOpts = ['Citas', 'Amistad', 'Casual'];
  var bx = 20;
  for (var i = 0; i < buscandoOpts.length; i++) {
    var opt = buscandoOpts[i];
    var bc = chip(cardF, bx, 268, opt, {
      fills: i === 0 ? solidPaint(C.primary) : solidPaint(C.inputBg),
      color: i === 0 ? C.white : C.textDim,
      size: 13, radius: 20, ph: 8, padding: 14,
    });
    bx += bc.width + 10;
  }

  txt(cardF, 'Sobre mi', 20, 312, { color: C.white, size: 18, weight: 'Bold' });
  var editBtnF = makeFrame(cardF, W - 112, 312, 80, 32, {
    fills: gradientPaint([[C.primary, 0], [C.secondary, 1]], 90), radius: 12, name: 'btn-edit-profile',
  });
  txt(editBtnF, 'Editar', 0, 8, { color: C.white, size: 13, weight: 'Bold', width: 80, align: 'CENTER' });
  txt(cardF, 'Apasionada por la musica, los viajes y el cafe. Buscando a alguien especial con quien compartir aventuras y buenas conversaciones.', 20, 344, {
    color: C.textDim, size: 14, lineHeight: 22, width: W - 72,
  });

  txt(cardF, 'Intereses', 20, 430, { color: C.white, size: 18, weight: 'Bold' });
  var interests = ['Musica', 'Viajes', 'Cafe', 'Arte', 'Senderismo'];
  var ix = 20; var iy = 458;
  for (var i = 0; i < interests.length; i++) {
    var ic = chip(cardF, ix, iy, interests[i], {
      fills: solidPaint(C.inputBg), color: C.textDim, size: 13, radius: 14, ph: 8, padding: 14,
      strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }],
    });
    ix += ic.width + 8;
    if (ix > W - 100) { ix = 20; iy += 40; }
  }

  bottomNav(f, 'Perfil');
  return f;
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURACION
// ═══════════════════════════════════════════════════════════════
async function buildSettings(page, offsetX) {
  var f = makeFrame(page, offsetX, 0, W, H, {
    fills: solidPaint(C.bg), name: '09 - Configuracion',
  });

  txt(f, 'Configuracion', 20, 64, { color: C.white, size: 26, weight: 'Bold', letterSpacing: -0.5 });
  rect(f, 0, 104, W, 1, solidPaint(C.cardBorder));

  var bannerF = makeFrame(f, 20, 118, W - 40, 76, {
    fills: solidPaint(C.primary, 0.1), radius: 20, name: 'verify-banner',
    strokes: [{ type: 'SOLID', color: hexColor(C.primary) }], strokeWeight: 1.5,
  });
  circle(bannerF, 34, 38, 22, solidPaint(C.primary), { name: 'verify-icon' });
  txt(bannerF, 'S', 22, 20, { color: C.white, size: 20, weight: 'Bold' });
  txt(bannerF, 'Verifica tu identidad', 68, 16, { color: C.white, size: 15, weight: 'Bold' });
  txt(bannerF, 'Requisito obligatorio para usar Debuta.', 68, 38, { color: C.textDim, size: 12, width: W - 140 });
  txt(bannerF, '>', W - 56, 28, { color: C.primary, size: 20 });

  var sections = [
    {
      title: 'Cuenta', y: 214,
      items: [
        { label: 'Editar Perfil',       right: 'nav' },
        { label: 'Verificar Identidad', right: 'ok'  },
        { label: 'Visibilidad',         right: 'toggle-on' },
      ],
    },
    {
      title: 'Discovery', y: 408,
      items: [
        { label: 'Mostrarme a',     right: 'Todos'  },
        { label: 'Rango de Edad',   right: '18-40'  },
        { label: 'Distancia',       right: '50 km'  },
        { label: 'Solo verificados', right: 'toggle' },
      ],
    },
    {
      title: 'Notificaciones', y: 638,
      items: [
        { label: 'Matches',          right: 'toggle-on' },
        { label: 'Mensajes',         right: 'toggle-on' },
        { label: 'Recomendaciones',  right: 'toggle'    },
      ],
    },
  ];

  for (var s = 0; s < sections.length; s++) {
    var sec = sections[s];
    var headerRow = makeFrame(f, 20, sec.y, W - 40, 34, {
      fills: transparentFill(), name: 'section-' + sec.title,
    });
    circle(headerRow, 17, 17, 17, solidPaint(C.card));
    txt(headerRow, sec.title.toUpperCase(), 44, 10, {
      color: C.textLight, size: 12, weight: 'Bold', letterSpacing: 1.2,
    });

    var cardH = sec.items.length * 64;
    var secCard = makeFrame(f, 20, sec.y + 40, W - 40, cardH, {
      fills: solidPaint(C.card), radius: 22,
      strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], name: 'card-' + sec.title,
    });

    for (var ii = 0; ii < sec.items.length; ii++) {
      var item = sec.items[ii];
      var rowF = makeFrame(secCard, 0, ii * 64, W - 40, 64, {
        fills: transparentFill(), name: 'option-' + item.label,
      });
      txt(rowF, item.label, 20, 22, { color: C.white, size: 15, weight: 'Bold' });

      if (item.right === 'toggle' || item.right === 'toggle-on') {
        var on = (item.right === 'toggle-on');
        var tgF = makeFrame(rowF, W - 84, 20, 46, 26, {
          fills: on ? gradientPaint([[C.primary, 0], [C.secondary, 1]], 90) : solidPaint(C.cardBorder),
          radius: 13, name: 'toggle-' + ii,
        });
        circle(tgF, on ? 33 : 13, 13, 11, solidPaint(C.white));
      } else if (item.right === 'ok') {
        txt(rowF, 'Verificado', W - 110, 22, { color: C.success, size: 13, weight: 'Bold' });
      } else if (item.right === 'nav') {
        txt(rowF, '>', W - 36, 22, { color: C.cardBorder, size: 18 });
      } else {
        txt(rowF, item.right, W - 80, 22, { color: C.primary, size: 13, weight: 'Bold' });
        txt(rowF, '>', W - 36, 22, { color: C.cardBorder, size: 18 });
      }

      if (ii < sec.items.length - 1) {
        rect(rowF, 18, 63, W - 76, 1, solidPaint(C.cardBorder, 0.5));
      }
    }
  }
  return f;
}

// ═══════════════════════════════════════════════════════════════
// INCOMING CALL
// ═══════════════════════════════════════════════════════════════
async function buildIncomingCall(page, offsetX) {
  var f = makeFrame(page, offsetX, 0, W, H, {
    fills: gradientPaint([[C.bgGrad2, 0], ['#0D0D26', 0.5], [C.bgGrad1, 1]], 180),
    name: '10 - Incoming Call',
  });

  for (var ri = 3; ri >= 1; ri--) {
    circle(f, W / 2, H * 0.38, 80 + ri * 60, solidPaint(C.primary, 0.05 + ri * 0.02), { name: 'ring-' + ri });
  }

  var avSize = 120;
  var avRing = makeFrame(f, W / 2 - avSize / 2 - 4, H * 0.24, avSize + 8, avSize + 8, {
    fills: gradientPaint([[C.primary, 0], [C.secondary, 1]], 135),
    radius: (avSize + 8) / 2, name: 'caller-ring',
  });
  var avInner = makeFrame(avRing, 4, 4, avSize, avSize, {
    fills: solidPaint(C.bg), radius: avSize / 2,
  });
  avatarPlaceholder(avInner, 0, 0, avSize, 'V');

  txt(f, 'Llamada entrante...', 0, H * 0.42, { color: C.textLight, size: 14, weight: 'Medium', width: W, align: 'CENTER' });
  txt(f, 'Valentina', 0, H * 0.46, { color: C.white, size: 30, weight: 'Bold', width: W, align: 'CENTER' });
  txt(f, 'Video llamada - Debuta', 0, H * 0.50, { color: C.textDim, size: 14, width: W, align: 'CENTER' });

  var btnY = H * 0.72;
  var decF = makeFrame(f, W / 2 - 110, btnY, 80, 80, {
    fills: solidPaint(C.error), radius: 40, name: 'btn-decline',
  });
  txt(decF, 'X', 0, 24, { color: C.white, size: 26, weight: 'Bold', width: 80, align: 'CENTER' });
  txt(f, 'Rechazar', W / 2 - 110, btnY + 88, { color: C.textDim, size: 12, width: 80, align: 'CENTER' });

  var accF = makeFrame(f, W / 2 + 30, btnY, 80, 80, {
    fills: solidPaint(C.success), radius: 40, name: 'btn-accept',
  });
  txt(accF, 'OK', 0, 26, { color: C.white, size: 18, weight: 'Bold', width: 80, align: 'CENTER' });
  txt(f, 'Aceptar', W / 2 + 30, btnY + 88, { color: C.textDim, size: 12, width: 80, align: 'CENTER' });

  txt(f, 'Desliza para responder', 0, H - 80, { color: C.textLight, size: 12, width: W, align: 'CENTER' });
  return f;
}

// ═══════════════════════════════════════════════════════════════
// CALL SCREEN
// ═══════════════════════════════════════════════════════════════
async function buildCallScreen(page, offsetX) {
  var f = makeFrame(page, offsetX, 0, W, H, {
    fills: gradientPaint([[C.bgGrad2, 0], [C.bgGrad1, 1]], 180),
    name: '11 - Call Screen',
  });

  rect(f, 0, 0, W, H,
    gradientPaint([[C.primary, 0], [C.secondary, 0.5], [C.bgGrad2, 1]]),
    { name: 'remote-video', opacity: 0.75 });

  avatarPlaceholder(f, W / 2 - 70, H * 0.3, 140, 'V');
  txt(f, 'Valentina', 0, H * 0.52, { color: C.white, size: 24, weight: 'Bold', width: W, align: 'CENTER' });
  txt(f, '00:03:42', 0, H * 0.56, { color: C.textDim, size: 16, width: W, align: 'CENTER' });

  var pip = makeFrame(f, W - 124, 56, 104, 144, {
    fills: gradientPaint([[C.tertiary, 0], [C.primary, 1]]), radius: 16, name: 'pip-self',
    strokes: [{ type: 'SOLID', color: hexColor(C.white) }], strokeWeight: 2,
  });
  pip.strokes = [{ type: 'SOLID', color: hexColor(C.white), opacity: 0.3 }];
  txt(pip, 'Tu', 0, 60, { color: C.white, size: 14, width: 104, align: 'CENTER' });

  var ctrlY = H - 200;
  var ctrlData = [
    { icon: 'M', label: 'Silencio', x: W / 2 - 162, active: false },
    { icon: 'C', label: 'Camara',   x: W / 2 - 82,  active: true  },
    { icon: 'S', label: 'Altavoz',  x: W / 2 - 2,   active: false },
    { icon: 'V', label: 'Voltear',  x: W / 2 + 78,  active: false },
  ];
  for (var i = 0; i < ctrlData.length; i++) {
    var ct = ctrlData[i];
    var cf = makeFrame(f, ct.x, ctrlY, 60, 60, {
      fills: solidPaint(C.white, ct.active ? 0.9 : 0.15),
      radius: 30, name: 'btn-' + ct.label,
    });
    txt(cf, ct.icon, 0, 16, { color: ct.active ? C.black : C.white, size: 22, weight: 'Bold', width: 60, align: 'CENTER' });
    txt(f, ct.label, ct.x, ctrlY + 68, { color: C.textDim, size: 10, width: 60, align: 'CENTER' });
  }

  var hangF = makeFrame(f, W / 2 - 36, ctrlY + 90, 72, 72, {
    fills: solidPaint(C.error), radius: 36, name: 'btn-hang-up',
  });
  txt(hangF, 'X', 0, 20, { color: C.white, size: 26, weight: 'Bold', width: 72, align: 'CENTER' });
  txt(f, 'Colgar', W / 2 - 36, ctrlY + 168, { color: C.textDim, size: 12, width: 72, align: 'CENTER' });
  return f;
}

// ═══════════════════════════════════════════════════════════════
// REGLAS DE COMUNIDAD
// ═══════════════════════════════════════════════════════════════
async function buildRules(page, offsetX) {
  var f = makeFrame(page, offsetX, 0, W, H, {
    fills: gradientPaint([[C.bgGrad1, 0], [C.bgGrad2, 0.5], [C.bgGrad1, 1]], 135),
    name: '12 - Reglas',
  });

  circle(f, W / 2, 110, 44, solidPaint(C.primary, 0.18));
  txt(f, 'S', W / 2 - 14, 90, { color: C.primary, size: 30, weight: 'Bold' });
  txt(f, 'Reglas de la Comunidad', 0, 168, {
    color: C.white, size: 22, weight: 'Bold', width: W, align: 'CENTER',
  });
  txt(f, 'Para mantener Debuta seguro y divertido para todos', 0, 202, {
    color: C.textDim, size: 14, width: W - 60, align: 'CENTER', lineHeight: 20,
  }).x = 30;

  var rules = [
    { icon: 'U', title: 'Se tu mismo',       desc: 'Perfiles falsos seran eliminados.' },
    { icon: 'R', title: 'Respeto mutuo',      desc: 'No toleramos el acoso ni lenguaje ofensivo.' },
    { icon: 'F', title: 'Fotos reales',       desc: 'Asegurate de que tus fotos cumplan nuestras guias.' },
    { icon: 'S', title: 'Seguridad primero',  desc: 'Nunca compartas contrasenas o datos bancarios.' },
    { icon: '18', title: 'Edad minima',       desc: 'Debes tener mas de 18 anos para usar Debuta.' },
  ];

  for (var i = 0; i < rules.length; i++) {
    var r = rules[i];
    var ry = 248 + i * 70;
    var rowF = makeFrame(f, 24, ry, W - 48, 62, {
      fills: solidPaint(C.card), radius: 16,
      strokes: [{ type: 'SOLID', color: hexColor(C.cardBorder) }], name: 'rule-' + i,
    });
    var iconF = makeFrame(rowF, 12, 11, 40, 40, {
      fills: solidPaint(C.primary, 0.15), radius: 12,
    });
    txt(iconF, r.icon, 0, r.icon.length > 1 ? 12 : 10, {
      color: C.primary, size: r.icon.length > 1 ? 13 : 18,
      weight: 'Bold', width: 40, align: 'CENTER',
    });
    txt(rowF, r.title, 64, 10, { color: C.white, size: 14, weight: 'Bold' });
    txt(rowF, r.desc, 64, 32, { color: C.textDim, size: 12, width: W - 140 });
  }

  gradBtn(f, 24, H - 120, W - 48, 54, 'Entiendo y Acepto', { radius: 18, name: 'btn-accept-rules' });
  txt(f, 'Al aceptar confirmas que tienes 18 anos o mas.', 0, H - 54, {
    color: C.textLight, size: 11, width: W - 60, align: 'CENTER',
  }).x = 30;
  return f;
}

// ═══════════════════════════════════════════════════════════════
// CONEXIONES DE PROTOTIPO
// ═══════════════════════════════════════════════════════════════
function connect(sourceNode, targetFrame) {
  if (!sourceNode || !targetFrame) { return; }
  try {
    sourceNode.reactions = [{
      action: {
        type: 'NODE',
        destinationId: targetFrame.id,
        navigation: 'NAVIGATE',
        transition: {
          type: 'SMART_ANIMATE',
          easing: { type: 'EASE_OUT' },
          duration: 0.3,
        },
      },
      trigger: { type: 'ON_CLICK' },
    }];
  } catch(e) {
    // ignorar si el nodo no soporta reactions
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  await loadFont('Inter', 'Regular');
  await loadFont('Inter', 'Medium');
  await loadFont('Inter', 'SemiBold');
  await loadFont('Inter', 'Bold');
  await loadFont('Inter', 'ExtraBold');

  figma.currentPage.name = 'Debuta App - Prototype';

  var offsetX = 0;
  var splash       = await buildSplash(figma.currentPage, offsetX);       offsetX += W + GAP;
  var onboarding   = await buildOnboarding(figma.currentPage, offsetX);   offsetX += W + GAP;
  var login        = await buildLogin(figma.currentPage, offsetX);         offsetX += W + GAP;
  var discover     = await buildDiscover(figma.currentPage, offsetX);      offsetX += W + GAP;
  var likes        = await buildLikes(figma.currentPage, offsetX);         offsetX += W + GAP;
  var matches      = await buildMatches(figma.currentPage, offsetX);       offsetX += W + GAP;
  var chat         = await buildChat(figma.currentPage, offsetX);          offsetX += W + GAP;
  var profile      = await buildProfile(figma.currentPage, offsetX);       offsetX += W + GAP;
  var settings     = await buildSettings(figma.currentPage, offsetX);      offsetX += W + GAP;
  var incomingCall = await buildIncomingCall(figma.currentPage, offsetX);  offsetX += W + GAP;
  var callScreen   = await buildCallScreen(figma.currentPage, offsetX);    offsetX += W + GAP;
  var rules        = await buildRules(figma.currentPage, offsetX);

  // ── Navegación ────────────────────────────────────────────────
  var splashLogo = splash.findOne(function(n) { return n.name === 'logo-text'; });
  connect(splashLogo, rules);

  var rulesBtn = rules.findOne(function(n) { return n.name === 'btn-accept-rules'; });
  connect(rulesBtn, onboarding);

  var nextBtn = onboarding.findOne(function(n) { return n.name === 'btn-next'; });
  var skipBtn = onboarding.findOne(function(n) { return n.name === 'btn-skip'; });
  connect(nextBtn, login);
  connect(skipBtn, login);

  var loginBtn = login.findOne(function(n) { return n.name === 'btn-login'; });
  connect(loginBtn, discover);

  var discoverTabs = discover.findAll(function(n) { return n.name && n.name.indexOf('tab-') === 0; });
  for (var i = 0; i < discoverTabs.length; i++) {
    var tab = discoverTabs[i];
    if (tab.name === 'tab-Discover') { connect(tab, discover); }
    if (tab.name === 'tab-Likes')    { connect(tab, likes); }
    if (tab.name === 'tab-Matches')  { connect(tab, matches); }
    if (tab.name === 'tab-Perfil')   { connect(tab, profile); }
  }

  var matchesTabs = matches.findAll(function(n) { return n.name && n.name.indexOf('tab-') === 0; });
  for (var i = 0; i < matchesTabs.length; i++) {
    var tab = matchesTabs[i];
    if (tab.name === 'tab-Discover') { connect(tab, discover); }
    if (tab.name === 'tab-Likes')    { connect(tab, likes); }
    if (tab.name === 'tab-Matches')  { connect(tab, matches); }
    if (tab.name === 'tab-Perfil')   { connect(tab, profile); }
  }

  var profileTabs = profile.findAll(function(n) { return n.name && n.name.indexOf('tab-') === 0; });
  for (var i = 0; i < profileTabs.length; i++) {
    var tab = profileTabs[i];
    if (tab.name === 'tab-Discover') { connect(tab, discover); }
    if (tab.name === 'tab-Likes')    { connect(tab, likes); }
    if (tab.name === 'tab-Matches')  { connect(tab, matches); }
    if (tab.name === 'tab-Perfil')   { connect(tab, profile); }
  }

  var chatRow0 = matches.findOne(function(n) { return n.name === 'chat-row-0'; });
  connect(chatRow0, chat);

  var callBtn = chat.findOne(function(n) { return n.name === 'btn-call'; });
  var vidBtn  = chat.findOne(function(n) { return n.name === 'btn-video-call'; });
  connect(callBtn, incomingCall);
  connect(vidBtn,  incomingCall);

  var acceptBtn  = incomingCall.findOne(function(n) { return n.name === 'btn-accept'; });
  var declineBtn = incomingCall.findOne(function(n) { return n.name === 'btn-decline'; });
  connect(acceptBtn, callScreen);
  connect(declineBtn, chat);

  var hangBtn = callScreen.findOne(function(n) { return n.name === 'btn-hang-up'; });
  connect(hangBtn, chat);

  var settingsBtn = profile.findOne(function(n) { return n.name === 'btn-settings'; });
  connect(settingsBtn, settings);

  figma.viewport.scrollAndZoomIntoView([splash]);
  figma.notify('Prototipo Debuta generado - 12 pantallas listas!');
  figma.closePlugin();
}

main().catch(function(err) {
  figma.notify('Error: ' + err.message, { error: true });
  figma.closePlugin();
});
