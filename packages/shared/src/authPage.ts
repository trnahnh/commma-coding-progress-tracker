export interface AuthPageOptions {
  ok: boolean
}

export function authPage({ ok }: AuthPageOptions): string {
  const statusLabel = ok ? 'Connected' : 'Sign-in failed'
  const heading = ok
    ? "You're signed in."
    : "That didn't go through."
  const message = ok
    ? 'Head back to your editor — your sessions, streaks, and heatmaps start filling in automatically. You can close this tab.'
    : 'The sign-in didn’t complete. Close this tab and try again from your editor.'
  const dotClass = ok ? 'dot dot-live' : 'dot dot-accent'

  const letters = ['c', 'o', 'm', 'm', 'm', 'a']
    .map(
      (ch, i) =>
        `<span style="animation-delay:${260 + i * 70}ms"><b>${ch}</b></span>`,
    )
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>commma</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>
:root{
  --ink:#efead8;--ink-soft:#c9c2ad;--ink-mute:#7a746a;
  --paper:#0c0b08;--rule:#221f1a;--rule-strong:#2d2922;
  --accent:#ff4d1a;--accent-soft:rgba(255,77,26,.14);--accent-line:rgba(255,77,26,.45);
  --live:#9cf76d;
  --serif:"Instrument Serif","Times New Roman",serif;
  --mono:"Geist Mono",ui-monospace,"SFMono-Regular",Consolas,monospace;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;height:100%}
body{
  background:var(--paper);color:var(--ink);
  font-family:var(--mono);
  display:grid;place-items:center;min-height:100vh;overflow:hidden;
  -webkit-font-smoothing:antialiased;
}
body::before{
  content:"";position:fixed;inset:0;z-index:-2;pointer-events:none;
  background-image:
    radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,77,26,.10), transparent 60%),
    radial-gradient(ellipse 70% 50% at 50% 110%, rgba(134,59,255,.06), transparent 60%),
    radial-gradient(130% 95% at 50% 6%, transparent 56%, rgba(0,0,0,.34) 88%, rgba(0,0,0,.5) 100%),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.045 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}
body::after{
  content:"";position:fixed;left:50%;top:38%;width:min(560px,80vw);aspect-ratio:1;
  transform:translate(-50%,-50%);z-index:-1;pointer-events:none;
  background:radial-gradient(circle,var(--accent-soft),transparent 68%);
  filter:blur(8px);opacity:0;animation:bloom 1200ms 200ms ease forwards;
}
main{
  position:relative;text-align:center;padding:40px 28px;max-width:520px;
  opacity:0;transform:translateY(20px);
  animation:fade-up 700ms cubic-bezier(.16,1,.3,1) forwards;
}
.badge{
  display:inline-flex;align-items:center;gap:9px;
  padding:7px 14px;border-radius:999px;
  border:1px solid var(--rule-strong);background:rgba(19,18,16,.6);
  font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-mute);
  opacity:0;animation:fade-up 600ms 120ms cubic-bezier(.16,1,.3,1) forwards;
}
.dot{width:9px;height:9px;border-radius:999px;flex:none}
.dot-live{background:var(--live);animation:pulse-live 1800ms ease-out infinite}
.dot-accent{background:var(--accent);animation:pulse-accent 1800ms ease-out infinite}
.word{
  margin:26px 0 0;font-family:var(--serif);font-weight:400;
  font-size:clamp(64px,16vw,128px);line-height:.9;letter-spacing:-.02em;
  display:flex;justify-content:center;align-items:flex-end;
}
.word span{display:inline-block;overflow:hidden;line-height:1}
.word .period-wrap{overflow:visible}
.word span b{
  display:inline-block;font-weight:400;transform:translateY(110%);opacity:0;
  animation:rise 720ms cubic-bezier(.16,1,.3,1) forwards;animation-delay:inherit;
}
.word .period{
  color:var(--accent);display:inline-block;transform:scale(0);
  animation:pop 520ms 760ms cubic-bezier(.34,1.56,.64,1) forwards;
}
.rule{
  height:2px;width:0;margin:30px auto 0;border-radius:2px;
  background:linear-gradient(90deg,transparent,var(--accent),transparent);
  animation:draw 760ms 700ms cubic-bezier(.16,1,.3,1) forwards;
}
.heading{
  margin:28px 0 0;font-family:var(--serif);font-weight:400;
  font-size:clamp(22px,4vw,32px);line-height:1.1;letter-spacing:-.01em;color:var(--ink);
  opacity:0;animation:fade-up 620ms 560ms cubic-bezier(.16,1,.3,1) forwards;
}
.sub{
  margin:14px auto 0;max-width:42ch;font-size:14px;line-height:1.6;color:var(--ink-soft);
  opacity:0;animation:fade-up 620ms 680ms cubic-bezier(.16,1,.3,1) forwards;
}
@keyframes fade-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes rise{from{transform:translateY(110%);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes pop{from{transform:scale(0)}60%{transform:scale(1.18)}to{transform:scale(1)}}
@keyframes draw{from{width:0;opacity:0}to{width:200px;opacity:1}}
@keyframes bloom{from{opacity:0}to{opacity:1}}
@keyframes pulse-live{0%{box-shadow:0 0 0 0 rgba(156,247,109,.5)}70%{box-shadow:0 0 0 9px rgba(156,247,109,0)}100%{box-shadow:0 0 0 0 rgba(156,247,109,0)}}
@keyframes pulse-accent{0%{box-shadow:0 0 0 0 rgba(255,77,26,.5)}70%{box-shadow:0 0 0 9px rgba(255,77,26,0)}100%{box-shadow:0 0 0 0 rgba(255,77,26,0)}}
@media (prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important}
  main,.badge,.heading,.sub{opacity:1;transform:none}
  .word span b{transform:none;opacity:1}
  .word .period{transform:none}
  .rule{width:200px;opacity:1}
  body::after{opacity:1}
}
</style>
</head>
<body>
<main>
  <div class="badge"><span class="${dotClass}"></span>${statusLabel}</div>
  <h1 class="word">${letters}<span class="period-wrap"><b class="period">.</b></span></h1>
  <div class="rule"></div>
  <p class="heading">${heading}</p>
  <p class="sub">${message}</p>
</main>
</body>
</html>`
}
