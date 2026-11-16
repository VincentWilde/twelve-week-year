// 12 Settimane — incolla questo in Scriptable una volta sola.
globalThis.WIDGET_MODE = "";
// A ogni aggiornamento del widget scarica l'ultima versione dal sito;
// senza connessione usa l'ultima copia salvata.
const URL = "https://vincentwilde.github.io/twelve-week-year/scriptable/12-settimane.js";
const fm = FileManager.local();
const cache = fm.joinPath(fm.documentsDirectory(), "12-settimane-cache.js");
let code = null;
try {
  const r = new Request(URL + "?v=" + Date.now());
  r.timeoutInterval = 10;
  const t = await r.loadString();
  if (r.response.statusCode === 200 && t.includes("function cycle")) {
    code = t;
    fm.writeString(cache, t);
  }
} catch (e) {}
if (!code && fm.fileExists(cache)) code = fm.readString(cache);
if (!code) throw new Error("Serve la connessione per il primo avvio.");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
await new AsyncFunction(code)();
