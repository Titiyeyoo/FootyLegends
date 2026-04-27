/* ════════════════════════════════════════════════════════════════════
   Footy Legends Quiz — Storage Helpers
   ════════════════════════════════════════════════════════════════════
   Extracted from index.html as part of Phase 4 Stage B file split.
   - safeStorage: localStorage wrapper with Safari Private Mode fallback
   - safeRun: error boundary wrapper for critical handlers
   ════════════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════════
// SAFE LOCALSTORAGE WRAPPER
// Handles Safari Private Mode, quota exceeded, etc. Falls back to in-memory.
// ══════════════════════════════════════════════════
var safeStorage = (function(){
  const memFallback = {};
  let lsAvailable = null;
  function probe(){
    if(lsAvailable !== null) return lsAvailable;
    try {
      const k = '__fl_probe__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      lsAvailable = true;
    } catch(e){ lsAvailable = false; }
    return lsAvailable;
  }
  return {
    get(key){
      try { return probe() ? localStorage.getItem(key) : (memFallback[key] || null); }
      catch(e){ return memFallback[key] || null; }
    },
    set(key, value){
      try {
        if(probe()) localStorage.setItem(key, value);
        else memFallback[key] = value;
      } catch(e){ memFallback[key] = value; }
    },
    remove(key){
      try {
        if(probe()) localStorage.removeItem(key);
        else delete memFallback[key];
      } catch(e){ delete memFallback[key]; }
    }
  };
})();

// ══════════════════════════════════════════════════
// SAFE RUN — wraps critical handlers, shows toast on error instead of crashing
// ══════════════════════════════════════════════════
function safeRun(fn, errorMsg){
  return function(){
    try { return fn.apply(this, arguments); }
    catch(err){
      console.error(errorMsg || 'Operation failed:', err);
      try { if(typeof toast === 'function') toast((errorMsg || 'OPERATION FAILED') + ' — TRY AGAIN', 'err'); } catch(e){}
    }
  };
}

// Expose to window scope explicitly
if (typeof window !== "undefined") {
  window.safeStorage = safeStorage;
  window.safeRun = safeRun;
}
