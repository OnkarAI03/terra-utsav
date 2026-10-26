/**
 * The first script in <head>, run while the page is still being parsed, before React starts.
 *
 * 1. Marks the document as script-enabled before first paint, so scroll reveals can hide content
 *    only when they will also be able to show it again.
 * 2. Clears comments and blank text that a host adds inside <head>. React builds <head> itself and
 *    checks it when the page starts; Netlify's free plan inserts an "hosted on Netlify" comment
 *    there, and React would stop at it, report a hydration error and rebuild the whole page on
 *    every visit. React never puts comments or text in <head>, so nothing of ours is touched, and
 *    the comment stays in the HTML that Netlify serves. Netlify's badge is a script at the end of
 *    the page and is left alone.
 * 3. Shows the splash (components/site/Splash.tsx) on the first page of a visit only: later pages
 *    in the same tab get `splash-seen` before they paint. A tap on the splash or Esc skips it.
 */
export const HEAD_SCRIPT =
  "document.documentElement.classList.add('js');" +
  "for(var n=document.head.firstChild,next;n;n=next){next=n.nextSibling;" +
  "if(n.nodeType===8||(n.nodeType===3&&!n.textContent.trim()))n.parentNode.removeChild(n)}" +
  "try{if(sessionStorage.getItem('tu-splash'))document.documentElement.classList.add('splash-seen');" +
  "else sessionStorage.setItem('tu-splash','1')}catch(e){}" +
  "addEventListener('click',function(e){var s=document.getElementById('splash');" +
  "if(s&&s.contains(e.target))document.documentElement.classList.add('splash-done')});" +
  "addEventListener('keydown',function(e){if(e.key==='Escape')document.documentElement.classList.add('splash-done')});";
