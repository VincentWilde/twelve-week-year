// Anno di 12 Settimane — widget per la schermata di blocco (app Scriptable).
// Cicli fissi sui trimestri (1 gen, 1 apr, 1 lug, 1 ott): settimane 1–12 di
// esecuzione, settimana 13 di revisione. Ogni settimana vale un mese.
//
// Formati supportati:
//  - in linea (sopra l'orologio):  "S7/12 · ≈15 lug"
//  - rettangolare:                  settimana, data equivalente, barra 12 settimane
//  - circolare:                     numero della settimana con anello di avanzamento

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const DAY = 86400000;
const utc = (y, m, d) => Date.UTC(y, m, d);

function cycle(now) {
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const q = Math.floor(m / 3);
  const qs = utc(y, q * 3, 1), qe = utc(y, q * 3 + 3, 1);
  const qLen = Math.round((qe - qs) / DAY);
  const idx = Math.round((utc(y, m, d) - qs) / DAY);
  const week = Math.min(13, Math.floor(idx / 7) + 1);
  const sec = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
  const rest = week === 13;
  let eq = null;
  if (!rest) {
    const frac = (idx + sec) / 84;
    const yLen = Math.round((utc(y + 1, 0, 1) - utc(y, 0, 1)) / DAY);
    const e = new Date(utc(y, 0, 1) + Math.min(yLen - 1, Math.floor(frac * yLen)) * DAY);
    eq = { d: e.getUTCDate(), m: e.getUTCMonth() };
  }
  return {
    y, q, week, idx, qLen, rest, eq,
    dow: rest ? idx - 83 : idx % 7 + 1,
    weekFrac: rest ? (idx - 84 + sec) / (qLen - 84) : (idx % 7 + sec) / 7,
    totalFrac: rest ? 1 : (idx + sec) / 84,
  };
}

function eqShort(c) { return c.eq.d + " " + MESI[c.eq.m].slice(0, 3); }
function eqLong(c) { return c.eq.d + " " + MESI[c.eq.m]; }

// Barra: 12 segmenti + un segmento corto per la settimana 13.
function barImage(c, w, h) {
  const ctx = new DrawContext();
  ctx.size = new Size(w, h);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const gap = 3;
  const unit = (w - gap * 12) / 12.5;
  let x = 0;
  for (let i = 1; i <= 13; i++) {
    const sw = i === 13 ? unit * 0.5 : unit;
    const bg = new Path();
    bg.addRoundedRect(new Rect(x, 0, sw, h), h / 2, h / 2);
    ctx.addPath(bg);
    ctx.setFillColor(new Color("#ffffff", i < c.week ? 1 : 0.3));
    ctx.fillPath();
    if (i === c.week) {
      const fg = new Path();
      fg.addRoundedRect(new Rect(x, 0, Math.max(h, sw * Math.min(1, c.weekFrac)), h), h / 2, h / 2);
      ctx.addPath(fg);
      ctx.setFillColor(Color.white());
      ctx.fillPath();
    }
    x += sw + gap;
  }
  return ctx.getImage();
}

// Anello: avanzamento nelle 12 settimane, numero della settimana al centro.
function ringImage(c) {
  const S = 120, lw = 10, r = S / 2 - lw / 2 - 1, cx = S / 2, cy = S / 2;
  const ctx = new DrawContext();
  ctx.size = new Size(S, S);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  const track = new Path();
  track.addEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
  ctx.addPath(track);
  ctx.setStrokeColor(new Color("#ffffff", 0.3));
  ctx.setLineWidth(lw);
  ctx.strokePath();

  const end = Math.max(0.01, Math.min(1, c.totalFrac));
  const steps = Math.max(2, Math.ceil(end * 120));
  const pts = [];
  for (let k = 0; k <= steps; k++) {
    const a = -Math.PI / 2 + (k / steps) * end * 2 * Math.PI;
    pts.push(new Point(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  const arc = new Path();
  arc.addLines(pts);
  ctx.addPath(arc);
  ctx.setStrokeColor(Color.white());
  ctx.setLineWidth(lw);
  ctx.strokePath();

  ctx.setTextColor(Color.white());
  ctx.setTextAlignedCenter();
  ctx.setFont(Font.heavyRoundedSystemFont(46));
  ctx.drawTextInRect(String(c.week), new Rect(0, 26, S, 54));
  ctx.setFont(Font.semiboldRoundedSystemFont(17));
  ctx.drawTextInRect(c.rest ? "pausa" : "di 12", new Rect(0, 78, S, 22));
  return ctx.getImage();
}

function build(family, c) {
  const w = new ListWidget();
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);

  if (family === "accessoryInline") {
    w.addText(c.rest ? "S13 · revisione" : "S" + c.week + "/12 · ≈" + eqShort(c));
    return w;
  }

  if (family === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true;
    const img = w.addImage(ringImage(c));
    img.centerAlignImage();
    return w;
  }

  if (family === "accessoryRectangular") {
    const t1 = w.addText(c.rest ? "SETTIMANA 13 · PAUSA" : "SETTIMANA " + c.week + "/12 · G" + c.dow);
    t1.font = Font.semiboldRoundedSystemFont(12);
    t1.lineLimit = 1;
    t1.minimumScaleFactor = 0.7;
    const t2 = w.addText(c.rest ? "Rivedi e pianifica" : "≈ " + eqLong(c));
    t2.font = Font.boldRoundedSystemFont(18);
    t2.lineLimit = 1;
    t2.minimumScaleFactor = 0.6;
    w.addSpacer(4);
    w.addImage(barImage(c, 150, 6));
    return w;
  }

  // Widget della schermata Home (piccolo/medio).
  w.backgroundColor = new Color("#171a21");
  const l = w.addText("Q" + (c.q + 1) + " " + c.y);
  l.font = Font.semiboldRoundedSystemFont(12);
  l.textColor = new Color("#8d93a3");
  const n = w.addText(c.rest ? "Settimana 13" : "Settimana " + c.week);
  n.font = Font.heavyRoundedSystemFont(22);
  n.textColor = Color.white();
  n.minimumScaleFactor = 0.7;
  const e = w.addText(c.rest ? "Revisione e pausa" : "≈ " + eqLong(c));
  e.font = Font.boldRoundedSystemFont(16);
  e.textColor = new Color("#7c98ff");
  w.addSpacer();
  w.addImage(barImage(c, 130, 6));
  return w;
}

const c = cycle(new Date());

if (config.runsInWidget || config.runsInAccessoryWidget) {
  Script.setWidget(build(config.widgetFamily, c));
} else {
  // Aperto nell'app: mostra l'anteprima dei formati per la schermata di blocco.
  const choice = new Alert();
  choice.title = c.rest ? "Settimana 13 · pausa" : "Settimana " + c.week + " di 12 · ≈ " + eqLong(c);
  choice.message = "Anteprima del widget";
  choice.addAction("Rettangolare");
  choice.addAction("Circolare");
  choice.addAction("In linea");
  choice.addCancelAction("Chiudi");
  const i = await choice.presentSheet();
  if (i === 0) await build("accessoryRectangular", c).presentAccessoryRectangular();
  if (i === 1) await build("accessoryCircular", c).presentAccessoryCircular();
  if (i === 2) await build("accessoryInline", c).presentAccessoryInline();
}
Script.complete();
