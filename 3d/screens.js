/* PullTopia 3D-Vorschau · nachgebaute Discord-Bildschirme (Canvas 2D).
   Nur PullTopia-eigene Inhalte, alle Alerts/Meldungen sind als Beispiel gekennzeichnet. Keine Emojis (Canvas-Fallback-sicher). */
export const SW = 600, SH = 1296;
const F = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const C = { bg: "#313338", side: "#2b2d31", embed: "#2b2d31", txt: "#dbdee1", mute: "#949ba4", head: "#f2f3f5", line: "#3f4147", blurple: "#5865f2", btn: "#4e5058", green: "#30d158", gold: "#f7c35c", cyan: "#2ee6ff", violet: "#9b6bff", orange: "#ff9f0a", blue: "#4ea1ff" };

const rr = (x, a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
const font = (x, s, w = 400) => { x.font = `${w} ${s}px ${F}`; };
const txt = (x, s, a, b, size, col, w = 400) => { font(x, size, w); x.fillStyle = col; x.fillText(s, a, b); return x.measureText(s).width; };
function wrap(x, s, a, b, maxW, size, col, w = 400, lh = 1.3) {
  font(x, size, w); x.fillStyle = col;
  let line = "", y = b;
  for (const word of s.split(" ")) {
    const t = line ? line + " " + word : word;
    if (x.measureText(t).width > maxW && line) { x.fillText(line, a, y); line = word; y += size * lh; } else line = t;
  }
  if (line) { x.fillText(line, a, y); y += size * lh; }
  return y;
}
function chip(x, label, a, b, bg, fg, size = 19, dot) {
  font(x, size, 700);
  const pad = 12, dw = dot ? 18 : 0, w = x.measureText(label).width + pad * 2 + dw, h = size + 14;
  x.fillStyle = bg; rr(x, a, b, w, h, h / 2); x.fill();
  if (dot) { x.fillStyle = dot; x.beginPath(); x.arc(a + pad + 6, b + h / 2, 6, 0, 7); x.fill(); }
  x.fillStyle = fg; x.textBaseline = "middle"; x.fillText(label, a + pad + dw, b + h / 2 + 1); x.textBaseline = "alphabetic";
  return w;
}
function button(x, label, a, b, bg = C.btn) {
  font(x, 21, 600);
  const w = x.measureText(label).width + 34, h = 46;
  x.fillStyle = bg; rr(x, a, b, w, h, 10); x.fill();
  x.fillStyle = "#fff"; x.textBaseline = "middle"; x.fillText(label, a + 17, b + h / 2 + 1); x.textBaseline = "alphabetic";
  return w;
}
function avatar(x, img, a, b, s = 58) {
  x.save(); x.beginPath(); x.arc(a + s / 2, b + s / 2, s / 2, 0, 7); x.clip();
  if (img) x.drawImage(img, a, b, s, s); else { x.fillStyle = C.violet; x.fillRect(a, b, s, s); }
  x.restore();
}
function msgHead(x, img, y, time = "Heute um 20:14") {
  avatar(x, img, 24, y);
  const w = txt(x, "PullTopia Nexus", 100, y + 24, 24, "#fff", 700);
  font(x, 15, 700); const aw = x.measureText("APP").width + 14;
  x.fillStyle = C.blurple; rr(x, 108 + w, y + 6, aw, 22, 5); x.fill();
  txt(x, "APP", 115 + w, y + 23, 15, "#fff", 700);
  txt(x, time, 100, y + 52, 18, C.mute, 500);
  return y + 70;
}
function embed(x, a, b, w, color, drawBody) {
  // measure pass then draw
  const h = drawBody(null);
  x.fillStyle = C.embed; rr(x, a, b, w, h, 10); x.fill();
  x.fillStyle = color; rr(x, a, b, 7, h, 4); x.fill(); x.fillRect(a + 3, b, 4, h);
  drawBody(x);
  return b + h;
}
function frame(x, channel, input) {
  x.fillStyle = C.bg; x.fillRect(0, 0, SW, SH);
  // status bar
  txt(x, "20:14", 44, 52, 24, "#fff", 600);
  x.fillStyle = "#fff"; [0, 1, 2, 3].forEach(i => { rr(x, 452 + i * 11, 48 - (i + 1) * 5, 7, (i + 1) * 5, 2); x.fill(); });
  x.strokeStyle = "#fff"; x.lineWidth = 2; rr(x, 504, 30, 46, 22, 6); x.stroke(); rr(x, 508, 34, 30, 14, 3); x.fill(); rr(x, 552, 37, 4, 8, 2); x.fill();
  x.fillStyle = "#000"; x.beginPath(); x.arc(SW / 2, 40, 15, 0, 7); x.fill();
  // channel header
  x.fillStyle = C.side; x.fillRect(0, 76, SW, 86);
  x.fillStyle = C.mute; [0, 1, 2].forEach(i => x.fillRect(28, 104 + i * 11, 26, 4));
  const hw = txt(x, "#", 74, 132, 34, C.mute, 500);
  txt(x, channel, 80 + hw, 131, 26, C.head, 700);
  chip(x, "BEISPIEL", SW - 150, 101, "rgba(247,195,92,.18)", C.gold, 16);
  x.fillStyle = C.line; x.fillRect(0, 162, SW, 2);
  // input
  x.fillStyle = "#383a40"; rr(x, 22, SH - 118, SW - 44, 66, 18); x.fill();
  x.fillStyle = C.mute; x.beginPath(); x.arc(58, SH - 85, 16, 0, 7); x.fill();
  x.fillStyle = "#383a40"; x.fillRect(51, SH - 87, 14, 4); x.fillRect(56, SH - 92, 4, 14);
  txt(x, input, 90, SH - 77, 21, C.mute, 500);
  x.fillStyle = "rgba(255,255,255,.5)"; rr(x, SW / 2 - 70, SH - 24, 140, 6, 3); x.fill();
}
function field(x, label, val, a, b, col = "#fff") { txt(x, label, a, b, 17, C.mute, 700); txt(x, val, a, b + 32, 24, col, 700); }

export function drawDrop(x, img) {
  frame(x, "drop-alerts", "Nachricht an #drop-alerts");
  // older message (dimmed)
  x.globalAlpha = .45;
  let y = msgHead(x, img, 188, "Heute um 19:52");
  y = embed(x, 100, y, 470, C.orange, c => { if (c) { chip(c, "RESTOCK", 122, y + 18, "rgba(255,159,10,.2)", C.orange, 16); txt(c, "Beispiel-Box · Restock", 122, y + 92, 24, "#fff", 700); txt(c, "beispiel-shop.de · fiktiv", 122, y + 124, 19, C.mute, 500); } return 146; });
  x.globalAlpha = 1;
  y += 34;
  x.fillStyle = "rgba(88,101,242,.08)"; x.fillRect(0, y - 14, SW, 740);
  x.fillStyle = C.gold; x.fillRect(0, y - 14, 5, 740);
  y = msgHead(x, img, y);
  // mention
  font(x, 22, 600); const mw = x.measureText("@Free-Alert · Pokémon").width + 16;
  x.fillStyle = "rgba(88,101,242,.32)"; rr(x, 100, y - 4, mw, 36, 6); x.fill();
  txt(x, "@Free-Alert · Pokémon", 108, y + 21, 22, "#c9cdfb", 600);
  y += 50;
  const ey = y;
  y = embed(x, 100, y, 470, C.green, c => {
    if (!c) return 330;
    let cx = 122; cx += chip(c, "Bestätigt", cx, ey + 20, "rgba(48,209,88,.18)", C.green, 17, C.green) + 8; chip(c, "NEU", cx, ey + 20, "rgba(46,230,255,.16)", C.cyan, 17);
    wrap(c, "Beispiel-Set · Booster-Display", 122, ey + 104, 420, 30, "#fff", 700);
    txt(c, "beispiel-shop.de · fiktives Produkt", 122, ey + 142, 20, C.mute, 500);
    c.fillStyle = C.line; c.fillRect(122, ey + 168, 426, 2);
    field(c, "PREIS", "129,90 €", 122, ey + 208); field(c, "BEWERTUNG", "fair", 270, ey + 208, "#7ef0a0"); field(c, "TYP", "Drop", 448, ey + 208);
    txt(c, "Beispiel · keine Kaufgarantie", 122, ey + 300, 17, C.mute, 500);
    return 330;
  });
  y += 18;
  let bx = 100; bx += button(x, "Zum Produkt", bx, y, C.blurple) + 10; button(x, "Preisvergleich", bx, y);
  y += 58; button(x, "Quellen / Details", 100, y);
  y += 66;
  [["14", C.orange], ["9", C.cyan], ["6", C.gold]].forEach(([n, col], i) => {
    const a = 100 + i * 96; x.fillStyle = i === 1 ? "rgba(88,101,242,.25)" : "#2b2d31"; rr(x, a, y, 84, 40, 12); x.fill();
    if (i === 1) { x.strokeStyle = C.blurple; x.lineWidth = 2; rr(x, a, y, 84, 40, 12); x.stroke(); }
    x.fillStyle = col; x.beginPath(); x.arc(a + 24, y + 20, 9, 0, 7); x.fill();
    txt(x, n, a + 42, y + 28, 20, "#fff", 700);
  });
}

export function drawNews(x, img) {
  frame(x, "pokemon-news", "Nachricht an #pokemon-news");
  let y = 190;
  const items = [
    ["OFFIZIELL", C.green, "Beispiel: Neues Set offiziell angekündigt", "offizielle Quelle · Beispielmeldung", "Heute um 18:02"],
    ["BERICHTET", C.blue, "Beispiel: Fanseite berichtet über Release-Termin", "Fanseite · berichtet, nicht offiziell", "Heute um 19:15"],
    ["GERÜCHT", C.orange, "Beispiel: Leak zu einer kommenden Promo-Box", "unbestätigt · als Gerücht markiert", "Heute um 20:09"]
  ];
  items.forEach(([lab, col, title, src, time]) => {
    y = msgHead(x, img, y, time);
    const ey = y;
    y = embed(x, 100, y, 470, col, c => {
      if (!c) return 200;
      chip(c, lab, 122, ey + 18, col + "33", col, 17, col);
      const ty = wrap(c, title, 122, ey + 92, 420, 26, "#fff", 700, 1.25);
      txt(c, src, 122, Math.min(ty + 6, ey + 180), 18, C.mute, 500);
      return 200;
    });
    y += 30;
  });
}

export function drawArchive(x, img, cards) {
  frame(x, "pokemon-archiv", "Nachricht an #pokemon-archiv");
  let y = msgHead(x, img, 188);
  const ey = y;
  y = embed(x, 100, y, 470, C.cyan, c => {
    if (!c) return 140;
    txt(c, "Pokémon-Archiv", 122, ey + 46, 28, "#fff", 700);
    txt(c, "31 Sets · 5.239 Karten", 122, ey + 82, 21, C.txt, 500);
    txt(c, "Stand 16.11.2026", 122, ey + 114, 18, C.mute, 500);
    return 140;
  });
  y += 16;
  let bx = 100; bx += button(x, "Karte suchen", bx, y, C.blurple) + 10; button(x, "Sammlung", bx, y);
  y += 58; bx = 100; bx += button(x, "Wunschliste", bx, y) + 10; button(x, "Set-Fortschritt", bx, y);
  y += 72;
  // card grid (own PullTopia creatures)
  const cw = 145, ch = 202, cols = ["#ff7a45", "#46d483", "#2ee6ff"];
  for (let i = 0; i < 3; i++) {
    const a = 100 + i * (cw + 15), b = y;
    const g = x.createLinearGradient(a, b, a + cw, b + ch); g.addColorStop(0, cols[i]); g.addColorStop(1, "#1a1530");
    x.fillStyle = g; rr(x, a, b, cw, ch, 12); x.fill();
    x.fillStyle = "#121018"; rr(x, a + 8, b + 30, cw - 16, ch - 74, 8); x.fill();
    if (cards[i]) { x.save(); rr(x, a + 8, b + 30, cw - 16, ch - 74, 8); x.clip(); const s = Math.max((cw - 16) / cards[i].width, (ch - 74) / cards[i].height); const iw = cards[i].width * s, ih = cards[i].height * s; x.drawImage(cards[i], a + 8 + (cw - 16 - iw) / 2, b + 30 + (ch - 74 - ih) / 2, iw, ih); x.restore(); }
    txt(x, "Beispielkarte", a + 10, b + 22, 15, "#fff", 700);
    txt(x, "PullTopia", a + 10, b + ch - 16, 14, "rgba(255,255,255,.8)", 600);
    if (i === 0) { x.fillStyle = C.green; x.beginPath(); x.arc(a + cw - 18, b + ch - 22, 13, 0, 7); x.fill(); x.strokeStyle = "#fff"; x.lineWidth = 3; x.beginPath(); x.moveTo(a + cw - 24, b + ch - 22); x.lineTo(a + cw - 19, b + ch - 17); x.lineTo(a + cw - 11, b + ch - 28); x.stroke(); }
  }
  y += ch + 30;
  txt(x, "Zur Sammlung hinzugefügt", 100, y, 21, C.green, 700);
  y += 34;
  x.fillStyle = C.embed; rr(x, 100, y, 470, 110, 12); x.fill();
  txt(x, "Set-Fortschritt · Beispiel", 122, y + 40, 20, C.txt, 600);
  txt(x, "47 / 165", 470, y + 40, 20, "#fff", 700);
  x.fillStyle = "#1e1f22"; rr(x, 122, y + 62, 426, 18, 9); x.fill();
  const g2 = x.createLinearGradient(122, 0, 548, 0); g2.addColorStop(0, C.cyan); g2.addColorStop(1, C.violet);
  x.fillStyle = g2; rr(x, 122, y + 62, 426 * 47 / 165, 18, 9); x.fill();
  y += 140;
  txt(x, "Nur du kannst das sehen", 100, y, 18, C.mute, 500);
}

export function drawPremium(x, img) {
  frame(x, "mitglieder-alerts", "Nachricht an #mitglieder-alerts");
  let y = 186;
  chip(x, "PREMIUM · SOFORT", 24, y, "rgba(247,195,92,.2)", C.gold, 18, C.gold);
  y += 54;
  y = msgHead(x, img, y, "Heute um 20:14");
  const ey = y;
  y = embed(x, 100, y, 470, C.gold, c => {
    if (!c) return 170;
    txt(c, "Beispiel-Set · Booster-Display", 122, ey + 46, 26, "#fff", 700);
    txt(c, "beispiel-shop.de · fiktiv", 122, ey + 80, 19, C.mute, 500);
    field(c, "PREIS", "129,90 €", 122, ey + 120); field(c, "BEI DIR", "sofort", 330, ey + 120, C.gold);
    return 170;
  });
  y += 46;
  // divider with time gap
  x.strokeStyle = "rgba(255,255,255,.16)"; x.setLineDash([8, 8]); x.lineWidth = 2; x.beginPath(); x.moveTo(24, y); x.lineTo(SW - 24, y); x.stroke(); x.setLineDash([]);
  font(x, 19, 700); const lw = x.measureText("15 Minuten später").width + 28;
  x.fillStyle = C.bg; x.fillRect(SW / 2 - lw / 2, y - 16, lw, 32);
  txt(x, "15 Minuten später", SW / 2 - lw / 2 + 14, y + 7, 19, C.mute, 700);
  y += 46;
  x.globalAlpha = .8;
  chip(x, "#drop-alerts · KOSTENLOS", 24, y, "rgba(46,230,255,.14)", C.cyan, 18, C.cyan);
  y += 54;
  y = msgHead(x, img, y, "Heute um 20:29");
  const fy = y;
  embed(x, 100, y, 470, C.green, c => {
    if (!c) return 170;
    txt(c, "Beispiel-Set · Booster-Display", 122, fy + 46, 26, "#fff", 700);
    txt(c, "beispiel-shop.de · fiktiv", 122, fy + 80, 19, C.mute, 500);
    field(c, "PREIS", "129,90 €", 122, fy + 120); field(c, "BEI DIR", "+15 Min", 330, fy + 120, C.cyan);
    return 170;
  });
  x.globalAlpha = 1;
}

export function drawWelcome(x, img, logo) {
  frame(x, "willkommen", "Nachricht an #willkommen");
  const g = x.createRadialGradient(SW / 2, 420, 20, SW / 2, 420, 300); g.addColorStop(0, "rgba(155,107,255,.45)"); g.addColorStop(1, "rgba(155,107,255,0)");
  x.fillStyle = g; x.fillRect(0, 170, SW, 520);
  if (logo) { x.save(); x.beginPath(); x.arc(SW / 2, 410, 150, 0, 7); x.clip(); x.drawImage(logo, SW / 2 - 150, 260, 300, 300); x.restore(); }
  font(x, 40, 800); x.textAlign = "center"; x.fillStyle = "#fff"; x.fillText("Willkommen bei", SW / 2, 650); 
  const tg = x.createLinearGradient(150, 0, 450, 0); tg.addColorStop(0, C.cyan); tg.addColorStop(1, C.violet);
  x.fillStyle = tg; font(x, 52, 800); x.fillText("PullTopia", SW / 2, 712);
  font(x, 21, 500); x.fillStyle = C.mute; x.fillText("Alles per Klick. Kein Befehl nötig.", SW / 2, 756);
  x.textAlign = "left";
  const labels = [["Portal betreten", C.blurple], ["Entdecken", C.btn], ["Interessen & Pings", C.btn], ["Regeln", C.btn]];
  let y = 800;
  labels.forEach(([l, col]) => { font(x, 23, 600); x.fillStyle = col; rr(x, 70, y, SW - 140, 58, 12); x.fill(); x.fillStyle = "#fff"; x.textAlign = "center"; x.fillText(l, SW / 2, y + 37); x.textAlign = "left"; y += 72; });
}

export function drawNotif(x, img, w, h) {
  x.clearRect(0, 0, w, h);
  x.fillStyle = "rgba(28,28,34,.96)"; rr(x, 4, 4, w - 8, h - 8, 34); x.fill();
  x.strokeStyle = "rgba(255,255,255,.14)"; x.lineWidth = 2; rr(x, 4, 4, w - 8, h - 8, 34); x.stroke();
  avatar(x, img, 34, h / 2 - 40, 80);
  txt(x, "PullTopia Nexus", 140, h / 2 - 16, 34, "#fff", 700);
  txt(x, "jetzt", w - 110, h / 2 - 16, 26, C.mute, 500);
  txt(x, "@Free-Alert · Neuer Drop (Beispiel)", 140, h / 2 + 30, 28, "#d2d2d8", 500);
}
export function drawBadge(x, w, h, label, col) {
  x.clearRect(0, 0, w, h);
  x.fillStyle = "rgba(14,14,18,.92)"; rr(x, 3, 3, w - 6, h - 6, (h - 6) / 2); x.fill();
  x.strokeStyle = col; x.lineWidth = 4; rr(x, 3, 3, w - 6, h - 6, (h - 6) / 2); x.stroke();
  x.fillStyle = col; x.beginPath(); x.arc(h / 2 + 6, h / 2, 12, 0, 7); x.fill();
  font(x, 40, 800); x.fillStyle = "#fff"; x.textBaseline = "middle"; x.fillText(label, h / 2 + 30, h / 2 + 2); x.textBaseline = "alphabetic";
}
