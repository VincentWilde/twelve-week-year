// Anno di 12 Settimane — widget per la schermata di blocco (app Scriptable).
// Cicli fissi sui trimestri (1 gen, 1 apr, 1 lug, 1 ott): settimane 1–12 di
// esecuzione, settimana 13 di revisione. Ogni settimana vale un mese.
//
// Riga intera della schermata di blocco (4 riquadri):
//   [ data — rettangolare ][ settimana — circolare ][ linee — circolare, parametro "linee" ]
// - rettangolare: data equivalente (nessun parametro); "giorno", "mese",
//                 "percentuale" (quota trascorsa), "linea" (striscia 12 settimane)
// - circolare:    numero della settimana; script "12 Linee" (o parametro "linee") → 12 settimane ad anello
// - in linea:     "19 luglio · S7/12"

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


// Anello di 12 tacche (una per settimana) con il giorno della settimana al centro.
function linesImage(c) {
  const S = 120, lw = 9, r = S / 2 - lw / 2 - 9, cx = S / 2, cy = S / 2;
  const ctx = new DrawContext();
  ctx.size = new Size(S, S);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const arc = (a0, a1, alpha) => {
    const steps = Math.max(2, Math.ceil((a1 - a0) * 200));
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
  };
  const gap = 0.028;
  for (let i = 1; i <= 12; i++) {
    const a0 = (i - 1) / 12 + gap / 2, a1 = i / 12 - gap / 2;
    const full = c.rest || i < c.week;
    arc(a0, a1, full ? 1 : 0.3);
    if (!c.rest && i === c.week) arc(a0, a0 + (a1 - a0) * Math.max(0.15, Math.min(1, c.weekFrac)), 1);
  }
  ctx.setTextAlignedCenter();
  ctx.setTextColor(new Color("#ffffff", 0.75));
  ctx.setFont(Font.semiboldSystemFont(13));
  ctx.drawTextInRect("GIORNO", new Rect(0, 34, S, 16));
  ctx.setTextColor(Color.white());
  ctx.setFont(Font.boldSystemFont(34));
  ctx.drawTextInRect(String(c.dow), new Rect(0, 50, S, 40));
  return ctx.getImage();
}

function weekLine(c) {
  return c.rest ? "Settimana 13 · revisione" : "Settimana " + c.week + " di 12 · giorno " + c.dow;
}

function build(family, c, param) {
  const w = new ListWidget();
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
  // Il nome dello script (WIDGET_MODE) vince su un eventuale parametro rimasto nel widget.
  const part = (globalThis.WIDGET_MODE || param || "").trim().toLowerCase();

  if (family === "accessoryInline") {
    w.addText(c.rest ? "Revisione · S13" : eqLong(c) + " · S" + c.week + "/12");
    return w;
  }

  // Circolare: settimana (predefinito) oppure anello delle 12 settimane ("linee").
  if (family === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true;
    if (part === "linee" || part === "linea") {
      const img = w.addImage(linesImage(c));
      img.imageSize = new Size(68, 68);
      img.centerAlignImage();
      return w;
    }
    if (part === "percentuale") {
      w.addSpacer();
      const n = w.addText(Math.floor(c.totalFrac * 100) + "%");
      n.font = Font.boldSystemFont(26);
      n.lineLimit = 1;
      n.minimumScaleFactor = 0.5;
      n.centerAlignText();
      w.addSpacer();
      return w;
    }
    w.addSpacer();
    const l = w.addText(c.rest ? "REV." : "SETT.");
    l.font = Font.semiboldSystemFont(10);
    l.textOpacity = 0.75;
    l.centerAlignText();
    const n = w.addText(String(c.week));
    n.font = Font.boldSystemFont(30);
    n.minimumScaleFactor = 0.6;
    n.centerAlignText();
    if (!c.rest) {
      const s = w.addText("di 12");
      s.font = Font.mediumSystemFont(10);
      s.textOpacity = 0.75;
      s.centerAlignText();
    }
    w.addSpacer();
    return w;
  }

  // Rettangolare: la data equivalente, grande.
  if (family === "accessoryRectangular") {
    const left = 84 - c.idx;

    // Metà sinistra ("giorno"): il numero del giorno enorme, allineato a destra
    // così si unisce al widget "mese" accanto.
    if (part === "giorno") {
      const row = w.addStack();
      row.layoutHorizontally();
      row.addSpacer();
      const n = row.addText(c.rest ? "13" : String(c.eq.d));
      n.font = Font.boldSystemFont(68);
      n.lineLimit = 1;
      n.minimumScaleFactor = 0.5;
      return w;
    }

    // Metà destra ("mese"): mese grande, settimana e giorni rimanenti sotto.
    if (part === "mese") {
      const m = w.addText(c.rest ? "Revisione" : MESI[c.eq.m]);
      m.font = Font.boldSystemFont(30);
      m.lineLimit = 1;
      m.minimumScaleFactor = 0.5;
      const s = w.addText(c.rest ? "Settimana 13 · G" + c.dow : "Sett. " + c.week + " · G" + c.dow);
      s.font = Font.semiboldSystemFont(13);
      s.lineLimit = 1;
      s.minimumScaleFactor = 0.7;
      const r = w.addText(c.rest ? "Nuovo ciclo tra " + (c.qLen - c.idx) + " g" : left + (left === 1 ? " giorno rimanente" : " giorni rimanenti"));
      r.font = Font.mediumSystemFont(12);
      r.textOpacity = 0.75;
      r.lineLimit = 1;
      r.minimumScaleFactor = 0.7;
      return w;
    }

    // "percentuale": quota del ciclo trascorsa, in grande.
    if (part === "percentuale") {
      const l = w.addText("TRASCORSO");
      l.font = Font.semiboldSystemFont(11);
      l.textOpacity = 0.75;
      const n = w.addText(Math.floor(c.totalFrac * 100) + "%");
      n.font = Font.boldSystemFont(52);
      n.lineLimit = 1;
      n.minimumScaleFactor = 0.5;
      return w;
    }

    // "linea": la striscia delle 12 settimane + punto per la 13.
    if (part === "linea" || part === "linee") {
      const l = w.addText(c.rest ? "SETTIMANA 13 · REVISIONE" : "SETTIMANA " + c.week + " DI 12");
      l.font = Font.semiboldSystemFont(12);
      l.textOpacity = 0.75;
      l.lineLimit = 1;
      l.minimumScaleFactor = 0.7;
      w.addSpacer(8);
      w.addImage(barImage(c, 150, 12));
      return w;
    }

    if (c.rest) {
      const t = w.addText("Revisione");
      t.font = Font.boldSystemFont(34);
      t.minimumScaleFactor = 0.5;
      t.lineLimit = 1;
      const l = w.addText("ANNO DI 12 SETTIMANE");
      l.font = Font.semiboldSystemFont(10);
      l.textOpacity = 0.75;
      return w;
    }
    const t = w.addText(eqLong(c));
    t.font = Font.boldSystemFont(40);
    t.lineLimit = 1;
    t.minimumScaleFactor = 0.4;
    const l = w.addText("ANNO DI 12 SETTIMANE");
    l.font = Font.semiboldSystemFont(10);
    l.textOpacity = 0.75;
    l.lineLimit = 1;
    return w;
  }

  // Widget della schermata Home: stessi colori della pagina (tema scuro).
  w.backgroundColor = new Color("#0d0f14");
  const l = w.addText("ANNO DI 12 SETTIMANE");
  l.font = Font.semiboldSystemFont(9);
  l.textColor = new Color("#8d93a3");
  l.centerAlignText();
  w.addSpacer(4);
  const e = w.addText(c.rest ? "Revisione" : eqLong(c));
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
  // Aperto nell'app: anteprima dei widget.
  globalThis.WIDGET_MODE = ""; // in anteprima comanda la scelta fatta qui
  const choice = new Alert();
  choice.title = (c.rest ? "Revisione" : eqLong(c)) + " — " + weekLine(c);
  choice.message = "Anteprima del widget";
  choice.addAction("Data (rettangolare)");
  choice.addAction("Settimana (circolare)");
  choice.addAction("Linee (circolare)");
  choice.addAction("Percentuale (rettangolare)");
  choice.addAction("Linea (rettangolare)");
  choice.addAction("Percentuale (circolare)");
  choice.addAction("In linea");
  choice.addCancelAction("Chiudi");
  const i = await choice.presentSheet();
  if (i === 0) await build("accessoryRectangular", c).presentAccessoryRectangular();
  if (i === 1) await build("accessoryCircular", c).presentAccessoryCircular();
  if (i === 2) await build("accessoryCircular", c, "linee").presentAccessoryCircular();
  if (i === 3) await build("accessoryRectangular", c, "percentuale").presentAccessoryRectangular();
  if (i === 4) await build("accessoryRectangular", c, "linea").presentAccessoryRectangular();
  if (i === 5) await build("accessoryCircular", c, "percentuale").presentAccessoryCircular();
  if (i === 6) await build("accessoryInline", c).presentAccessoryInline();
}
Script.complete();
