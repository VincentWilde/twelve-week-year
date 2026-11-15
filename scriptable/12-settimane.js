// Anno di 12 Settimane — widget per la schermata di blocco (app Scriptable).
// Cicli fissi sui trimestri (1 gen, 1 apr, 1 lug, 1 ott): settimane 1–12 di
// esecuzione, settimana 13 di revisione. Ogni settimana vale un mese.
//
// Formati supportati:
//  - in linea (sopra l'orologio):  "18 luglio · S7/12"
//  - rettangolare:                  data equivalente in grande, settimana, striscia 12 settimane
//      parametro "data"       → solo la data, grandissima
//      parametro "settimana"  → settimana + striscia
//  - circolare:  parametro "settimana" → numero settimana; "linee" → 12 tacche ad anello
//  Riga intera (4 riquadri): [data rettangolare][settimana circolare][linee circolare]
//  - circolare:                     giorno e mese equivalenti con anello di avanzamento

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

function eqLong(c) { return c.eq.d + " " + MESI[c.eq.m]; }

// Striscia come nella pagina: 12 tacche + un punto per la settimana 13.
function barImage(c, w, h) {
  const ctx = new DrawContext();
  ctx.size = new Size(w, h);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const gap = 3;
  const unit = (w - h - gap * 12) / 12;
  const pill = (x, sw, alpha) => {
    const p = new Path();
    p.addRoundedRect(new Rect(x, 0, sw, h), h / 2, h / 2);
    ctx.addPath(p);
    ctx.setFillColor(new Color("#ffffff", alpha));
    ctx.fillPath();
  };
  let x = 0;
  for (let i = 1; i <= 12; i++) {
    pill(x, unit, i < c.week ? 1 : 0.4);
    if (i === c.week) pill(x, Math.max(h, unit * Math.min(1, c.weekFrac)), 1);
    x += unit + gap;
  }
  const dot = new Path();
  dot.addEllipse(new Rect(x, 0, h, h));
  ctx.addPath(dot);
  ctx.setFillColor(new Color("#ffffff", c.rest ? 1 : 0.4));
  ctx.fillPath();
  return ctx.getImage();
}

// Circolare: giorno e mese equivalenti al centro, anello = avanzamento del ciclo.
function ringImage(c) {
  const S = 120, lw = 9, r = S / 2 - lw / 2 - 1, cx = S / 2, cy = S / 2;
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
  ctx.setFont(Font.heavyRoundedSystemFont(44));
  ctx.drawTextInRect(c.rest ? "13" : String(c.eq.d), new Rect(0, 26, S, 52));
  ctx.setFont(Font.semiboldRoundedSystemFont(18));
  ctx.drawTextInRect(c.rest ? "rev." : MESI[c.eq.m].slice(0, 3), new Rect(0, 76, S, 24));
  return ctx.getImage();
}

function newCanvas(S) {
  const ctx = new DrawContext();
  ctx.size = new Size(S, S);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  return ctx;
}

// Arco da a0 a a1 (in giri, 0 = ore 12, senso orario).
function strokeArc(ctx, cx, cy, r, a0, a1, lw, alpha) {
  const steps = Math.max(2, Math.ceil((a1 - a0) * 160));
  const pts = [];
  for (let k = 0; k <= steps; k++) {
    const a = -Math.PI / 2 + (a0 + (k / steps) * (a1 - a0)) * 2 * Math.PI;
    pts.push(new Point(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  const p = new Path();
  p.addLines(pts);
  ctx.addPath(p);
  ctx.setStrokeColor(new Color("#ffffff", alpha));
  ctx.setLineWidth(lw);
  ctx.strokePath();
}

// Circolare "settimana": numero della settimana grande.
function weekCircle(c) {
  const S = 120, ctx = newCanvas(S);
  ctx.setTextColor(Color.white());
  ctx.setTextAlignedCenter();
  ctx.setFont(Font.semiboldRoundedSystemFont(15));
  ctx.drawTextInRect(c.rest ? "SETT." : "SETT.", new Rect(0, 14, S, 20));
  ctx.setFont(Font.heavyRoundedSystemFont(58));
  ctx.drawTextInRect(String(c.week), new Rect(0, 30, S, 64));
  ctx.setFont(Font.semiboldRoundedSystemFont(16));
  ctx.drawTextInRect(c.rest ? "revisione" : "di 12", new Rect(0, 90, S, 22));
  return ctx.getImage();
}

// Circolare "linee": le 12 settimane come 12 tacche su un anello, giorno al centro.
function linesCircle(c) {
  const S = 120, lw = 10, r = S / 2 - lw / 2 - 2, cx = S / 2, cy = S / 2, ctx = newCanvas(S);
  const gap = 0.03;
  for (let i = 1; i <= 12; i++) {
    const a0 = (i - 1) / 12 + gap / 2, a1 = i / 12 - gap / 2;
    const full = c.rest || i < c.week;
    strokeArc(ctx, cx, cy, r, a0, a1, lw, full ? 1 : 0.35);
    if (!c.rest && i === c.week) strokeArc(ctx, cx, cy, r, a0, a0 + (a1 - a0) * Math.max(0.08, Math.min(1, c.weekFrac)), lw, 1);
  }
  ctx.setTextColor(Color.white());
  ctx.setTextAlignedCenter();
  ctx.setFont(Font.semiboldRoundedSystemFont(14));
  ctx.drawTextInRect("GIORNO", new Rect(0, 32, S, 18));
  ctx.setFont(Font.heavyRoundedSystemFont(38));
  ctx.drawTextInRect(String(c.dow), new Rect(0, 48, S, 44));
  return ctx.getImage();
}

function weekLine(c) {
  return c.rest ? "Settimana 13 · revisione" : "Settimana " + c.week + " di 12 · giorno " + c.dow;
}

function build(family, c, param) {
  const w = new ListWidget();
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
  const big = c.rest ? "Revisione" : eqLong(c);

  if (family === "accessoryInline") {
    w.addText(c.rest ? "Revisione · S13" : eqLong(c) + " · S" + c.week + "/12");
    return w;
  }

  if (family === "accessoryCircular") {
    const part = (param || "").trim().toLowerCase();
    w.addAccessoryWidgetBackground = part !== "settimana" && part !== "linee";
    const img = w.addImage(part === "settimana" ? weekCircle(c) : part === "linee" ? linesCircle(c) : ringImage(c));
    img.centerAlignImage();
    return w;
  }

  if (family === "accessoryRectangular") {
    const part = (param || "").trim().toLowerCase();

    // Parametro "data": solo la data equivalente, più grande possibile.
    if (part === "data") {
      w.addSpacer();
      const t = w.addText(big);
      t.font = Font.heavyRoundedSystemFont(44);
      t.lineLimit = 1;
      t.minimumScaleFactor = 0.3;
      w.addSpacer();
      return w;
    }

    // Parametro "settimana": settimana, giorno e striscia a tutta larghezza.
    if (part === "settimana") {
      const t1 = w.addText(c.rest ? "Settimana 13" : "Settimana " + c.week + " di 12");
      t1.font = Font.heavyRoundedSystemFont(19);
      t1.lineLimit = 1;
      t1.minimumScaleFactor = 0.6;
      const t2 = w.addText(c.rest ? "Revisione · giorno " + c.dow : "Giorno " + c.dow + " · mancano " + (84 - c.idx) + " g");
      t2.font = Font.mediumRoundedSystemFont(13);
      t2.lineLimit = 1;
      t2.minimumScaleFactor = 0.7;
      w.addSpacer(6);
      w.addImage(barImage(c, 156, 8));
      return w;
    }

    // Senza parametro: tutto in un widget.
    const t1 = w.addText(big);
    t1.font = Font.heavyRoundedSystemFont(28);
    t1.lineLimit = 1;
    t1.minimumScaleFactor = 0.5;
    t1.centerAlignText();
    const t2 = w.addText(weekLine(c));
    t2.font = Font.mediumRoundedSystemFont(12);
    t2.lineLimit = 1;
    t2.minimumScaleFactor = 0.7;
    t2.centerAlignText();
    w.addSpacer(5);
    const bar = w.addImage(barImage(c, 156, 7));
    bar.centerAlignImage();
    return w;
  }

  // Widget della schermata Home: stessi colori della pagina (tema scuro).
  w.backgroundColor = new Color("#0d0f14");
  const l = w.addText("ANNO DI 12 SETTIMANE");
  l.font = Font.semiboldSystemFont(9);
  l.textColor = new Color("#8d93a3");
  l.centerAlignText();
  w.addSpacer(4);
  const e = w.addText(big);
  e.font = Font.heavyRoundedSystemFont(26);
  e.textColor = new Color(c.rest ? "#e0b25e" : "#7c98ff");
  e.lineLimit = 1;
  e.minimumScaleFactor = 0.5;
  e.centerAlignText();
  const n = w.addText(weekLine(c));
  n.font = Font.mediumRoundedSystemFont(11);
  n.textColor = new Color("#eef0f5");
  n.lineLimit = 1;
  n.minimumScaleFactor = 0.7;
  n.centerAlignText();
  w.addSpacer(10);
  const bar = w.addImage(barImage(c, 130, 6));
  bar.centerAlignImage();
  return w;
}

const c = cycle(new Date());

if (config.runsInWidget || config.runsInAccessoryWidget) {
  Script.setWidget(build(config.widgetFamily, c, args.widgetParameter));
} else {
  // Aperto nell'app: mostra l'anteprima dei formati per la schermata di blocco.
  const choice = new Alert();
  choice.title = (c.rest ? "Revisione" : eqLong(c)) + " — " + weekLine(c);
  choice.message = "Anteprima del widget";
  choice.addAction("Data (rettangolare)");
  choice.addAction("Settimana (circolare)");
  choice.addAction("Linee (circolare)");
  choice.addAction("Rettangolare singolo");
  choice.addAction("In linea");
  choice.addCancelAction("Chiudi");
  const i = await choice.presentSheet();
  if (i === 0) await build("accessoryRectangular", c, "data").presentAccessoryRectangular();
  if (i === 1) await build("accessoryCircular", c, "settimana").presentAccessoryCircular();
  if (i === 2) await build("accessoryCircular", c, "linee").presentAccessoryCircular();
  if (i === 3) await build("accessoryRectangular", c).presentAccessoryRectangular();
  if (i === 4) await build("accessoryInline", c).presentAccessoryInline();
}
Script.complete();
