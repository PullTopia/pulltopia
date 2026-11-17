/* PullTopia 3D-Vorschau v3 · nachgebautes Discord-artiges Fenster (Canvas 2D), eigenes Layout, keine Discord-Marken.
   Alle Inhalte stammen von der Live-Seite; Discord-Ansichten sind als BEISPIEL gekennzeichnet. Keine Emojis (Canvas-sicher). */
const F = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
export const C = { bg: "#313338", side: "#2b2d31", rail: "#1e1f22", embed: "#2b2d31", txt: "#dbdee1", mute: "#949ba4", head: "#f2f3f5", line: "#3f4147", blurple: "#5865f2", btn: "#4e5058", green: "#30d158", gold: "#f7c35c", cyan: "#2ee6ff", violet: "#9b6bff", orange: "#ff9f0a", yellow: "#ffd60a", blue: "#4ea1ff", pink: "#ff5fd2" };

export const LAYOUTS = {
  desk: { W: 1600, H: 1000, rail: 92, side: 300, mobile: false },
  mob: { W: 760, H: 1000, rail: 76, side: 0, mobile: true }
};
const rr = (x, a, b, w, h, r) => { r = Math.min(r, h / 2, w / 2); x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
const font = (x, s, w = 400) => { x.font = `${w} ${s}px ${F}`; };
const txt = (x, s, a, b, size, col, w = 400) => { font(x, size, w); x.fillStyle = col; x.fillText(s, a, b); return x.measureText(s).width; };
const tw = (x, s, size, w = 400) => { font(x, size, w); return x.measureText(s).width; };
function wrap(x, s, a, b, maxW, size, col, w = 400, lh = 1.3) {
  font(x, size, w); x.fillStyle = col; let line = "", y = b;
  for (const word of s.split(" ")) { const t = line ? line + " " + word : word; if (x.measureText(t).width > maxW && line) { x.fillText(line, a, y); line = word; y += size * lh; } else line = t; }
  if (line) { x.fillText(line, a, y); y += size * lh; } return y;
}
function chip(x, label, a, b, bg, fg, size = 18, dot) {
  font(x, size, 700); const pad = 11, dw = dot ? 18 : 0, w = x.measureText(label).width + pad * 2 + dw, h = size + 13;
  x.fillStyle = bg; rr(x, a, b, w, h, h / 2); x.fill();
  if (dot) { x.fillStyle = dot; x.beginPath(); x.arc(a + pad + 6, b + h / 2, 6, 0, 7); x.fill(); }
  x.fillStyle = fg; x.textBaseline = "middle"; x.fillText(label, a + pad + dw, b + h / 2 + 1); x.textBaseline = "alphabetic"; return w;
}
function button(x, label, a, b, bg = C.btn, size = 21) {
  font(x, size, 600); const w = x.measureText(label).width + 32, h = size + 25;
  x.fillStyle = bg; rr(x, a, b, w, h, 9); x.fill();
  x.fillStyle = "#fff"; x.textBaseline = "middle"; x.fillText(label, a + 16, b + h / 2 + 1); x.textBaseline = "alphabetic"; return w;
}
function buttons(x, list, a, b, maxW, size = 21) {
  let cx = a, y = b; const h = size + 25;
  list.forEach(([l, bg]) => { const w = tw(x, l, size, 600) + 32; if (cx + w > a + maxW && cx > a) { cx = a; y += h + 10; } button(x, l, cx, y, bg || C.btn, size); cx += w + 10; });
  return y + h;
}
function avatar(x, img, a, b, s) { x.save(); x.beginPath(); x.arc(a + s / 2, b + s / 2, s / 2, 0, 7); x.clip(); if (img) x.drawImage(img, a, b, s, s); else { x.fillStyle = C.violet; x.fillRect(a, b, s, s); } x.restore(); }
function hashIcon(x, a, b, s, col) { x.strokeStyle = col; x.lineWidth = Math.max(2, s / 9); x.beginPath(); x.moveTo(a + s * .38, b); x.lineTo(a + s * .25, b + s); x.moveTo(a + s * .75, b); x.lineTo(a + s * .62, b + s); x.moveTo(a + s * .08, b + s * .33); x.lineTo(a + s * .95, b + s * .33); x.moveTo(a + s * .03, b + s * .68); x.lineTo(a + s * .9, b + s * .68); x.stroke(); }
function speaker(x, a, b, s, col) { x.fillStyle = col; x.beginPath(); x.moveTo(a, b + s * .35); x.lineTo(a + s * .3, b + s * .35); x.lineTo(a + s * .6, b + s * .08); x.lineTo(a + s * .6, b + s * .92); x.lineTo(a + s * .3, b + s * .65); x.lineTo(a, b + s * .65); x.closePath(); x.fill(); x.strokeStyle = col; x.lineWidth = 2.5; x.beginPath(); x.arc(a + s * .62, b + s * .5, s * .3, -.9, .9); x.stroke(); }

const SIDEBAR = [
  ["NEWS · INFOS", [["drop-alerts"], ["pokemon-news"]]],
  ["START", [["start-hier"]]],
  ["CARDVERSE", [["minigames"], ["sammler-rangliste"]]],
  ["TAUSCH", [["karten-tauschboerse"]]],
  ["VOICE NEXUS · SPRACHZENTRALE", [["Nexus Lounge 1", 1], ["TCG Gaming", 1], ["Creator Lounge", 1], ["+ Eigenen Talk erstellen", 1]]],
  ["BEISPIEL-CREATOR · CREATOR", [["creator-cockpit"]]],
  ["PREMIUM", [["mitgliedschaften"], ["mitglieder-alerts"]]]
];

/* Grundgerüst; liefert die Chat-Geometrie zurück */
function frame(x, L, img, logo, active, title, sub) {
  const { W, H, rail, side, mobile } = L;
  x.fillStyle = C.bg; x.fillRect(0, 0, W, H);
  // server rail
  x.fillStyle = C.rail; x.fillRect(0, 0, rail, H);
  const ic = rail - 28, ix = 14;
  x.fillStyle = "#fff"; rr(x, 0, 26, 5, ic - 8, 3); x.fill();
  x.save(); rr(x, ix, 22, ic, ic, ic * .32); x.clip(); if (logo) x.drawImage(logo, ix - 4, 18, ic + 8, ic + 8); x.restore();
  x.fillStyle = C.line; x.fillRect(ix + 10, 34 + ic, ic - 20, 3);
  x.fillStyle = "#2b2d31"; rr(x, ix, 52 + ic, ic, ic, ic / 2); x.fill();
  x.strokeStyle = C.green; x.lineWidth = 4; x.beginPath(); x.moveTo(ix + ic / 2, 52 + ic + ic * .3); x.lineTo(ix + ic / 2, 52 + ic + ic * .7); x.moveTo(ix + ic * .3, 52 + ic * 1.5); x.lineTo(ix + ic * .7, 52 + ic * 1.5); x.stroke();
  // channel sidebar (desktop)
  if (side) {
    x.fillStyle = C.side; x.fillRect(rail, 0, side, H);
    const g = x.createLinearGradient(rail, 0, rail + side, 90); g.addColorStop(0, "rgba(155,107,255,.55)"); g.addColorStop(1, "rgba(46,230,255,.35)");
    x.fillStyle = g; x.fillRect(rail, 0, side, 84);
    txt(x, "PullTopia", rail + 20, 52, 26, "#fff", 800);
    let y = 120;
    SIDEBAR.forEach(([cat, chans]) => {
      txt(x, cat, rail + 18, y, 13.5, C.mute, 700); y += 14;
      chans.forEach(([name, voice]) => {
        const on = name === active;
        if (on) { x.fillStyle = "rgba(78,80,88,.6)"; rr(x, rail + 10, y, side - 20, 34, 6); x.fill(); }
        if (voice) { if (name[0] !== "+") speaker(x, rail + 22, y + 9, 16, on ? "#fff" : C.mute); } else hashIcon(x, rail + 22, y + 9, 16, on ? "#fff" : C.mute);
        txt(x, name, rail + 48, y + 23, 18, on ? "#fff" : (name[0] === "+" ? C.green : C.mute), on ? 700 : 500);
        y += 36;
      });
      y += 18;
    });
  }
  const cx = rail + side, cw = W - cx;
  // header
  x.fillStyle = mobile ? C.side : C.bg; x.fillRect(cx, 0, cw, 76);
  if (mobile) { x.fillStyle = C.mute; [0, 1, 2].forEach(i => x.fillRect(cx + 20, 26 + i * 10, 24, 4)); }
  const hx = cx + (mobile ? 58 : 26);
  if (title[0] === "~") speaker(x, hx, 26, 26, C.mute); else hashIcon(x, hx, 26, 24, C.mute);
  const tWd = txt(x, title.replace("~", ""), hx + 36, 48, 25, C.head, 700);
  if (sub && !mobile) { x.fillStyle = C.line; x.fillRect(hx + 52 + tWd, 26, 2, 26); txt(x, sub, hx + 68 + tWd, 47, 18, C.mute, 500); }
  chip(x, "BEISPIEL", W - 140, 22, "rgba(247,195,92,.18)", C.gold, 15);
  x.fillStyle = "rgba(0,0,0,.25)"; x.fillRect(cx, 76, cw, 2);
  // input
  x.fillStyle = "#383a40"; rr(x, cx + 20, H - 84, cw - 40, 60, 14); x.fill();
  txt(x, "Nachricht an " + (title[0] === "~" ? title.slice(1) : "#" + title), cx + 62, H - 46, 19, C.mute, 500);
  x.fillStyle = C.mute; x.beginPath(); x.arc(cx + 44, H - 54, 12, 0, 7); x.fill();
  const pad = mobile ? 18 : 30, ax = cx + pad, bx = ax + (mobile ? 64 : 76);
  return { cx, cw, ax, bx, bw: Math.min(W - bx - pad, mobile ? 9999 : 820), top: 104, avs: mobile ? 50 : 56, s: mobile ? 1.06 : 1 };
}
function msgHead(x, g, img, y, time = "Heute um 20:14") {
  avatar(x, img, g.ax, y, g.avs);
  const w = txt(x, "PullTopia Nexus", g.bx, y + 22, 23 * g.s, "#fff", 700);
  font(x, 14, 700); const aw = x.measureText("APP").width + 12;
  x.fillStyle = C.blurple; rr(x, g.bx + w + 8, y + 5, aw, 21, 5); x.fill(); txt(x, "APP", g.bx + w + 14, y + 21, 14, "#fff", 700);
  txt(x, time, g.bx + w + aw + 16, y + 21, 16, C.mute, 500);
  return y + 36;
}
function embed(x, a, b, w, h, color) { x.fillStyle = C.embed; rr(x, a, b, w, h, 10); x.fill(); x.fillStyle = color; rr(x, a, b, 6, h, 3); x.fill(); x.fillRect(a + 3, b, 3, h); }
const field = (x, l, v, a, b, col = "#fff", s = 1) => { txt(x, l, a, b, 15 * s, C.mute, 700); txt(x, v, a, b + 30 * s, 23 * s, col, 700); };

/* ---------- Szenen ---------- */
function sDrop(x, L, A) {
  const g = frame(x, L, A.av, A.logo, "drop-alerts", "drop-alerts", "Drop- & Restock-Radar · Beta");
  let y = g.top + 10;
  x.fillStyle = "rgba(247,195,92,.07)"; x.fillRect(g.cx, y - 14, g.cw, 560); x.fillStyle = C.gold; x.fillRect(g.cx, y - 14, 4, 560);
  y = msgHead(x, g, A.av, y);
  const mw = tw(x, "@Free-Alert · Pokémon", 21 * g.s, 600) + 16;
  x.fillStyle = "rgba(88,101,242,.32)"; rr(x, g.bx, y, mw, 34, 6); x.fill(); txt(x, "@Free-Alert · Pokémon", g.bx + 8, y + 24, 21 * g.s, "#c9cdfb", 600);
  y += 48;
  const ew = Math.min(g.bw, 620), eh = 300; embed(x, g.bx, y, ew, eh, C.green);
  let cx = g.bx + 22; cx += chip(x, "Bestätigt", cx, y + 18, "rgba(48,209,88,.18)", C.green, 16, C.green) + 8; chip(x, "NEU", cx, y + 18, "rgba(46,230,255,.16)", C.cyan, 16);
  txt(x, "Beispiel-Set · Booster-Display", g.bx + 22, y + 94, 29 * g.s, "#fff", 700);
  txt(x, "beispiel-shop.de · fiktives Produkt", g.bx + 22, y + 130, 19 * g.s, C.mute, 500);
  x.fillStyle = C.line; x.fillRect(g.bx + 22, y + 152, ew - 44, 2);
  const c3 = (ew - 44) / 3;
  field(x, "PREIS", "129,90 €", g.bx + 22, y + 190, "#fff", g.s); field(x, "BEWERTUNG", "fair", g.bx + 22 + c3, y + 190, "#7ef0a0", g.s); field(x, "TYP", "Drop", g.bx + 22 + c3 * 2, y + 190, "#fff", g.s);
  txt(x, "Beispiel · keine Kaufgarantie", g.bx + 22, y + 276, 16, C.mute, 500);
  y += eh + 16;
  buttons(x, [["Zum Produkt", C.blurple], ["Preisvergleich"], ["Quellen / Details"]], g.bx, y, g.bw, 20 * g.s);
}
function sPC(x, L, A) {
  const g = frame(x, L, A.av, A.logo, "start-hier", "start-hier", "Interessen & Pings");
  let y = msgHead(x, g, A.av, g.top + 10);
  const ew = Math.min(g.bw, 640);
  const rows = [[C.yellow, "Frühwarnung", "Ein erster Hinweis."], [C.orange, "Mehrfach gemeldet", "Mindestens zwei unabhängige, vertrauenswürdige Quellen."], [C.green, "Bestätigt", "Nur mit offizieller Quelle, Shop-Daten oder offizieller Ankündigung."]];
  const eh = 92 + rows.length * (L.mobile ? 118 : 96); embed(x, g.bx, y, ew, eh, C.yellow);
  txt(x, "Pokémon-Center-Frühwarnung", g.bx + 22, y + 46, 26 * g.s, "#fff", 700);
  txt(x, "Jeder Hinweis bekommt eine Stufe.", g.bx + 22, y + 78, 18 * g.s, C.mute, 500);
  let ry = y + 100;
  rows.forEach(([col, h, t]) => {
    x.fillStyle = col; x.beginPath(); x.arc(g.bx + 40, ry + 22, 13, 0, 7); x.fill();
    x.fillStyle = col + "55"; x.beginPath(); x.arc(g.bx + 40, ry + 22, 21, 0, 7); x.fill();
    txt(x, h, g.bx + 76, ry + 30, 22 * g.s, "#fff", 700);
    ry = wrap(x, t, g.bx + 76, ry + 60, ew - 110, 18 * g.s, C.txt, 500) + (L.mobile ? 26 : 22);
  });
  y += eh + 16;
  buttons(x, [["Pokémon-Center-Warteschlangen", C.blurple]], g.bx, y, g.bw, 20 * g.s);
  txt(x, "Pings nur per freiwilliger Interessenrolle, nie für alle.", g.bx, y + 80, 17 * g.s, C.mute, 500);
}
function sNews(x, L, A) {
  const g = frame(x, L, A.av, A.logo, "pokemon-news", "pokemon-news", "News-Radar · rund um die Uhr");
  let y = g.top + 6;
  const items = [["OFFIZIELL", C.green, "Beispiel: Neues Set offiziell angekündigt", "18:02"], ["GERÜCHT / LEAK", C.orange, "Beispiel: Leak zu einer kommenden Promo-Box", "19:15"], ["ANALYSE", C.blue, "Beispiel: Einordnung aus der Community", "20:09"]];
  const ew = Math.min(g.bw, 640);
  items.forEach(([lab, col, title, t]) => {
    y = msgHead(x, g, A.av, y, "Heute um " + t);
    const eh = L.mobile ? 150 : 124; embed(x, g.bx, y, ew, eh, col);
    chip(x, lab, g.bx + 22, y + 16, col + "33", col, 15, col);
    wrap(x, title, g.bx + 22, y + 86, ew - 44, 23 * g.s, "#fff", 700, 1.22);
    y += eh + 26;
  });
}
function sCardverse(x, L, A) {
  const g = frame(x, L, A.av, A.logo, "minigames", "minigames", "Cardverse First Edition");
  let y = msgHead(x, g, A.av, g.top + 10);
  const ew = Math.min(g.bw, 640); embed(x, g.bx, y, ew, 110, C.violet);
  txt(x, "Minigames · Cardverse Booster", g.bx + 22, y + 44, 25 * g.s, "#fff", 700);
  txt(x, "Free: 5 Öffnungen/Tag · Unterstützer: 10/Tag", g.bx + 22, y + 80, 18 * g.s, C.txt, 500);
  y += 126; y = buttons(x, [["Booster öffnen", C.blurple], ["Rangliste"], ["Mein Album"]], g.bx, y, g.bw, 20 * g.s) + 26;
  y = msgHead(x, g, A.av, y);
  embed(x, g.bx, y, ew, 104, C.violet);
  txt(x, "Booster-Zug: Lunafuchs", g.bx + 22, y + 40, 22 * g.s, "#fff", 700);
  wrap(x, "Nr. #016 · Normal · +5 Punkte · Heute noch 4/5", g.bx + 22, y + 74, ew - 44, 17 * g.s, C.txt, 500);
  txt(x, "Nur du kannst das sehen", g.bx, y + 140, 16, C.mute, 500);
}
function sTrade(x, L, A) {
  const g = frame(x, L, A.av, A.logo, "karten-tauschboerse", "karten-tauschboerse", "Tauschbörse mit TradeMatch");
  let y = msgHead(x, g, A.av, g.top + 10);
  const ew = Math.min(g.bw, 680), eh = L.mobile ? 330 : 280; embed(x, g.bx, y, ew, eh, C.cyan);
  txt(x, "TradeMatch #7 · Gegenseitiger Match", g.bx + 22, y + 44, 24 * g.s, "#fff", 700);
  txt(x, "Partner: @Tauschpartner (Beispiel)", g.bx + 22, y + 78, 18 * g.s, C.txt, 500);
  const half = (ew - 66) / 2, cy = y + 104;
  [["Du könntest geben", "Turtok-ex", "151 · 009/165", C.cyan], ["Partner könnte geben", "Glurak-ex", "151 · 006/165", C.orange]].forEach(([h, n, s, col], i) => {
    const a = g.bx + 22 + i * (half + 22);
    x.fillStyle = "#1e1f22"; rr(x, a, cy, half, eh - 124, 10); x.fill(); x.fillStyle = col; rr(x, a, cy, half, 4, 2); x.fill();
    txt(x, h, a + 16, cy + 36, 15 * g.s, C.mute, 700); txt(x, n, a + 16, cy + 74, 23 * g.s, "#fff", 700); txt(x, s, a + 16, cy + 106, 17 * g.s, C.txt, 500);
    txt(x, "Deutsch · Near Mint", a + 16, cy + 136, 16 * g.s, C.mute, 500);
  });
  y += eh + 16;
  y = buttons(x, [["Match ansehen"], ["Interesse zeigen", C.blurple], ["Tauschraum öffnen", "#248046"]], g.bx, y, g.bw, 19 * g.s);
  txt(x, "Beide haben zugestimmt. Euer Tauschraum ist bereit.", g.bx, y + 40, 17 * g.s, C.green, 600);
}
function sVoice(x, L, A) {
  const g = frame(x, L, A.av, A.logo, "+ Eigenen Talk erstellen", "~Eigener Talk", "Voice Nexus · Sprachzentrale");
  let y = msgHead(x, g, A.av, g.top + 10);
  const ew = Math.min(g.bw, 640); embed(x, g.bx, y, ew, 118, C.green);
  txt(x, "Dein eigener Talk ist bereit", g.bx + 22, y + 46, 25 * g.s, "#fff", 700);
  wrap(x, "Privater Raum per Klick. Leere Räume verschwinden automatisch.", g.bx + 22, y + 80, ew - 44, 18 * g.s, C.txt, 500);
  y += 134;
  y = buttons(x, [["Umbenennen"], ["Öffentlich / Privat"], ["Einladen", C.blurple], ["Entfernen"], ["Limit"], ["Besitz übertragen"], ["Schließen", "#da373c"]], g.bx, y, g.bw, 19 * g.s) + 34;
  txt(x, "VOICE NEXUS · SPRACHZENTRALE", g.ax, y, 15, C.mute, 700); y += 18;
  ["Nexus Lounge 1", "Nexus Lounge 2", "Nexus Lounge 3", "TCG Gaming", "Creator Lounge"].forEach(n => { speaker(x, g.ax + 6, y + 10, 18, C.mute); txt(x, n, g.ax + 40, y + 26, 19 * g.s, C.txt, 500); y += 38; });
}
function sRank(x, L, A) {
  const g = frame(x, L, A.av, A.logo, "sammler-rangliste", "sammler-rangliste", "Live-Sammler-Rangliste");
  let y = msgHead(x, g, A.av, g.top + 10, "aktualisiert sich selbst");
  const ew = Math.min(g.bw, 620), eh = 400; embed(x, g.bx, y, ew, eh, C.gold);
  txt(x, "Live-Sammler-Rangliste", g.bx + 22, y + 46, 26 * g.s, "#fff", 700);
  const cols = [C.gold, "#c7cbd6", "#d08a4e"];
  ["Sternenfuchs", "Kristallnova", "Nebelpilot"].forEach((n, i) => {
    const ry = y + 80 + i * 86;
    x.fillStyle = "#1e1f22"; rr(x, g.bx + 22, ry, ew - 44, 70, 12); x.fill();
    x.fillStyle = cols[i]; x.beginPath(); x.arc(g.bx + 58, ry + 35, 20, 0, 7); x.fill();
    font(x, 20, 800); x.fillStyle = "#111"; x.textAlign = "center"; x.fillText(String(i + 1), g.bx + 58, ry + 42); x.textAlign = "left";
    txt(x, n, g.bx + 96, ry + 43, 22 * g.s, "#fff", 700);
    chip(x, "Beispiel", g.bx + ew - 140, ry + 20, "rgba(255,255,255,.08)", C.mute, 14);
  });
  wrap(x, "Fiktive Namen. Punkte aus Cardverse-Boostern und Tausch, rein virtuell, ohne Echtgeldwert.", g.bx + 22, y + 350, ew - 44, 16 * g.s, C.mute, 500);
}
function sCreator(x, L, A) {
  const g = frame(x, L, A.av, A.logo, "creator-cockpit", "creator-cockpit", "privat · nur du, Owner und Team");
  let y = msgHead(x, g, A.av, g.top + 10);
  const ew = Math.min(g.bw, 660), eh = L.mobile ? 190 : 160; embed(x, g.bx, y, ew, eh, C.pink);
  txt(x, "CREATOR COCKPIT · Beispiel-Creator", g.bx + 22, y + 44, 23 * g.s, "#fff", 700);
  const ey = wrap(x, "Willkommen in deinem privaten Cockpit! Nur du, der Owner und das Team sehen diesen Kanal.", g.bx + 22, y + 80, ew - 44, 18 * g.s, C.txt, 500);
  wrap(x, "Du kannst nur deine eigene Creator-Rolle erwähnen, nie @everyone oder @here.", g.bx + 22, ey + 6, ew - 44, 16 * g.s, C.mute, 500);
  y += eh + 16;
  y = buttons(x, [["Ankündigung", C.blurple], ["Umfrage"], ["Übersicht"], ["Beschreibung"], ["Social-Links"], ["Benachrichtigungen"], ["Neuen Post teilen", "#248046"]], g.bx, y, g.bw, 19 * g.s) + 34;
  txt(x, "OFFIZIELLER PARTNER — 1", g.ax, y, 15, C.mute, 700); y += 16;
  x.fillStyle = C.pink; x.beginPath(); x.arc(g.ax + 22, y + 24, 20, 0, 7); x.fill();
  txt(x, "Beispiel-Creator", g.ax + 56, y + 32, 20 * g.s, C.gold, 700);
}
function sPremium(x, L, A) {
  const g = frame(x, L, A.av, A.logo, "mitgliedschaften", "mitgliedschaften", "PullTopia Premium");
  let y = msgHead(x, g, A.av, g.top + 10);
  const ew = Math.min(g.bw, 640); embed(x, g.bx, y, ew, 110, C.gold);
  txt(x, "PullTopia Premium", g.bx + 22, y + 44, 26 * g.s, "#fff", 700);
  txt(x, "Ein Paket, drei Laufzeiten. Gründerpreis", g.bx + 22, y + 80, 18 * g.s, C.txt, 500);
  y += 126; y = buttons(x, [["Monatlich · 4,99 €", C.btn], ["Quartal · 12,99 €", C.btn], ["Jährlich · 39,99 €", "#a87a1f"]], g.bx, y, g.bw, 20 * g.s) + 30;
  y = msgHead(x, g, A.av, y);
  embed(x, g.bx, y, ew, 96, C.green);
  txt(x, "Zahlung über Stripe bestätigt.", g.bx + 22, y + 40, 21 * g.s, "#fff", 700);
  txt(x, "Rolle erhalten: Premium · Jährlich", g.bx + 22, y + 72, 18 * g.s, C.gold, 600);
  txt(x, "Nur du kannst das sehen", g.bx, y + 130, 16, C.mute, 500);
}
export const SCREENS = { drop: sDrop, pc: sPC, news: sNews, cardverse: sCardverse, trade: sTrade, voice: sVoice, rank: sRank, creator: sCreator, premium: sPremium };

/* ---------- Karten & Badges ---------- */
export function drawPCard(x, w, h, A, name, set, type, col, creature) {
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, col); g.addColorStop(1, "#140f26");
  x.fillStyle = g; rr(x, 0, 0, w, h, 26); x.fill();
  x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 6; rr(x, 6, 6, w - 12, h - 12, 22); x.stroke();
  avatar(x, A.av, 24, 22, 44); chip(x, type.toUpperCase(), w - 150, 26, "rgba(0,0,0,.45)", "#fff", 18);
  x.fillStyle = "#0e0b18"; rr(x, 24, 84, w - 48, h * .5, 16); x.fill();
  if (creature) { x.save(); rr(x, 24, 84, w - 48, h * .5, 16); x.clip(); const s = Math.max((w - 48) / creature.width, (h * .5) / creature.height); const iw = creature.width * s, ih = creature.height * s; x.drawImage(creature, 24 + (w - 48 - iw) / 2, 84 + (h * .5 - ih) / 2, iw, ih); x.restore(); }
  txt(x, name, 28, h * .5 + 140, 46, "#fff", 800);
  txt(x, set, 28, h * .5 + 184, 28, "rgba(255,255,255,.8)", 600);
  txt(x, "PullTopia", 28, h - 34, 22, "rgba(255,255,255,.75)", 600);
  chip(x, "BEISPIEL", w - 150, h - 64, "rgba(0,0,0,.45)", C.gold, 18);
}
export function drawSecret(x, w, h, A) {
  x.fillStyle = "#0b0814"; rr(x, 0, 0, w, h, 26); x.fill();
  if (A.secBase) x.drawImage(A.secBase, 0, 0, w, h);
  if (A.secSil) { x.globalAlpha = .2; x.drawImage(A.secSil, 0, 0, w, h); x.globalAlpha = 1; }
  [A.fog1, A.fog2].forEach((f, i) => { if (f) { x.globalAlpha = .55; x.drawImage(f, -w * .3 + i * w * .2, h * (.15 + i * .3), w * 1.4, h * .6); x.globalAlpha = 1; } });
  const gg = x.createLinearGradient(0, 0, w, h); gg.addColorStop(0, C.gold); gg.addColorStop(.5, "#fff3c4"); gg.addColorStop(1, C.violet);
  x.strokeStyle = gg; x.lineWidth = 10; rr(x, 8, 8, w - 16, h - 16, 22); x.stroke();
  avatar(x, A.logo, w / 2 - 60, h * .38, 120);
  font(x, 40, 800); x.fillStyle = "#fff"; x.textAlign = "center"; x.fillText("1 / 1 · ???", w / 2, h - 60); x.textAlign = "left";
}
export function drawBadge(x, w, h, label, col, sub) {
  x.clearRect(0, 0, w, h);
  x.fillStyle = "rgba(14,14,20,.94)"; rr(x, 3, 3, w - 6, h - 6, (h - 6) / 2); x.fill();
  x.strokeStyle = col; x.lineWidth = 5; rr(x, 3, 3, w - 6, h - 6, (h - 6) / 2); x.stroke();
  x.fillStyle = col; x.beginPath(); x.arc(h / 2 + 4, h / 2, 13, 0, 7); x.fill();
  font(x, 40, 800); x.fillStyle = "#fff"; x.textBaseline = "middle"; x.fillText(label, h / 2 + 30, sub ? h / 2 - 14 : h / 2 + 2);
  if (sub) { font(x, 26, 500); x.fillStyle = C.mute; x.fillText(sub, h / 2 + 30, h / 2 + 24); }
  x.textBaseline = "alphabetic";
}
