/**
 * simulator.js v2 — Black × Purple Efficient
 */
const S = { algo:'FIFO', frames:3, refStr:'7 0 1 2 0 3 0 4 2 3 0 3 2', result:null, step:0, timer:null, running:false, totalSteps:0, logFaults:0, logHits:0 };

// ===== CANVAS GRID =====
(function() {
  const canvas = document.getElementById('gridCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
  resize(); window.addEventListener('resize', resize);
  function draw() {
    ctx.clearRect(0,0,W,H);
    const sz = 44;
    ctx.strokeStyle = 'rgba(139,92,246,0.5)'; ctx.lineWidth = 0.4;
    for (let x=0; x<W; x+=sz) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y=0; y<H; y+=sz) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ===== SCROLL HEADER =====
window.addEventListener('scroll', () => {
  document.getElementById('siteHeader')?.classList.toggle('scrolled', window.scrollY > 40);
  let cur = 'hero';
  ['hero','theory','simulator','compare'].forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 90) cur = id;
  });
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#'+cur));
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initHeroViz(); renderPips(3);
  document.getElementById('refString').addEventListener('input', e => { S.refStr = e.target.value; });
});

// ===== HERO VIZ =====
function initHeroViz() {
  const pages = [7,0,1,2,0,3,0,4,2,3,0,3,2];
  const result = runFIFO(pages.join(' '), 3);
  let si = 0;
  function renderStep(idx) {
    const step = result.steps[idx];
    const frEl = document.getElementById('hvcFrames');
    const qEl = document.getElementById('hvcQueue');
    if (!frEl || !qEl) return;
    frEl.innerHTML = '';
    for (let f=0; f<3; f++) {
      const v = step.frames[f];
      const row = document.createElement('div');
      row.className = 'hvc-frame-row';
      const isNew = step.isFault && v !== step.framesBefore[f];
      const isHit = !step.isFault && v === step.page;
      if (isNew) row.classList.add('has-fault');
      if (isHit) row.classList.add('has-hit');
      row.innerHTML = `<span class="hvc-frame-label">F${f+1}</span><span class="hvc-frame-val">${v!==undefined?v:'—'}</span>`;
      frEl.appendChild(row);
    }
    qEl.innerHTML = '';
    pages.forEach((p,i) => {
      const c = document.createElement('div');
      c.className = 'hvc-qcell'+(i===idx?' active':'');
      c.textContent = p; qEl.appendChild(c);
    });
    const fe = document.getElementById('hvcFaults'); const he = document.getElementById('hvcHits'); const re = document.getElementById('hvcRatio');
    if (fe) fe.textContent = step.runningFaults;
    if (he) he.textContent = step.runningHits;
    if (re) re.textContent = step.step>0 ? ((step.runningHits/step.step)*100).toFixed(0)+'%' : '—';
  }
  renderStep(0);
  setInterval(() => { si = (si+1)%result.steps.length; renderStep(si); }, 1300);
}

// ===== PIPS =====
function renderPips(n) {
  const el = document.getElementById('fcPips'); if (!el) return;
  el.innerHTML = '';
  for (let i=0;i<7;i++) { const d=document.createElement('div'); d.className='fc-pip'+(i<n?' on':''); el.appendChild(d); }
}

// ===== CONTROLS =====
function selectAlgo(algo, btn) {
  S.algo = algo;
  document.querySelectorAll('.ag-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const al = document.getElementById('hvcAlgo'); if(al) al.textContent = algo;
}
function adjustFrames(d) {
  const nv = Math.max(1,Math.min(7,S.frames+d)); S.frames=nv;
  document.getElementById('framesVal').textContent=nv;
  document.getElementById('framesRange').value=nv; renderPips(nv);
}
function syncFrames(v) { S.frames=parseInt(v); document.getElementById('framesVal').textContent=v; renderPips(parseInt(v)); }
function generateRandom() {
  const arr = Array.from({length:12+Math.floor(Math.random()*8)},()=>Math.floor(Math.random()*8));
  const str = arr.join(' '); document.getElementById('refString').value=str; S.refStr=str;
}

// ===== SIMULATION =====
function getResult() {
  if (S.algo==='FIFO') return runFIFO(S.refStr,S.frames);
  if (S.algo==='LRU') return runLRU(S.refStr,S.frames);
  return runOptimal(S.refStr,S.frames);
}
function runSimulation() {
  stopSim();
  S.refStr = document.getElementById('refString').value;
  const pages = parseRefString(S.refStr);
  if (!pages.length) { alert('Enter a valid reference string.'); return; }
  S.result=getResult(); S.step=0; S.running=true; S.logFaults=0; S.logHits=0;
  clearLog(); clearViz(); renderRefCells(pages); updateFvwAlgo();
  const speed = 1800 - parseInt(document.getElementById('speedRange').value);
  function tick() {
    if (!S.running||S.step>=S.result.steps.length) { S.running=false; finalize(); return; }
    renderStep(S.step++); S.totalSteps++;
    const ts=document.getElementById('totalStepsRun'); if(ts) ts.textContent=S.totalSteps;
    S.timer = setTimeout(tick, speed);
  }
  tick();
}
function stepSimulation() {
  stopSim(); S.refStr=document.getElementById('refString').value;
  if (!S.result) {
    const pages=parseRefString(S.refStr);
    if (!pages.length) return;
    S.result=getResult(); S.step=0; S.logFaults=0; S.logHits=0;
    clearLog(); clearViz(); renderRefCells(pages); updateFvwAlgo();
  }
  if (S.step<S.result.steps.length) {
    renderStep(S.step++); S.totalSteps++;
    const ts=document.getElementById('totalStepsRun'); if(ts) ts.textContent=S.totalSteps;
    if (S.step>=S.result.steps.length) finalize();
  }
}
function resetSimulation() {
  stopSim(); S.result=null; S.step=0; S.logFaults=0; S.logHits=0;
  clearLog(); clearViz();
  const rc=document.getElementById('rdCells'); if(rc) rc.innerHTML='';
  const ft=document.getElementById('fvwTable'); if(ft) ft.innerHTML='';
  setBanner('idle','Configure settings and press Run'); updateMetrics(null);
}
function stopSim() { clearTimeout(S.timer); S.running=false; }

// ===== RENDER =====
function renderStep(si) {
  const step = S.result.steps[si];
  if (step.isFault) {
    const ev = step.evicted!==null?` — evicted <strong>${step.evicted}</strong>`:'';
    setBanner('fault-state',`<span class="sb-badge f-badge">PAGE FAULT</span> Step ${step.step}: page <strong>${step.page}</strong>${ev}`);
  } else {
    setBanner('hit-state',`<span class="sb-badge h-badge">PAGE HIT</span> Step ${step.step}: page <strong>${step.page}</strong> in frame`);
  }
  // Ref cells
  document.querySelectorAll('.rd-cell').forEach((c,i) => {
    c.classList.remove('current','pf','ph');
    if (i<si) { const ps=S.result.steps[i]; c.classList.add(ps.isFault?'pf':'ph'); }
    if (i===si) c.classList.add('current');
  });
  buildFrameTable(S.result.steps, si+1);
  addLog(step);
  if (step.isFault) S.logFaults++; else S.logHits++;
  const lf=document.getElementById('lpFaultCount'); if(lf) lf.textContent=S.logFaults+' fault'+(S.logFaults!==1?'s':'');
  const lh=document.getElementById('lpHitCount'); if(lh) lh.textContent=S.logHits+' hit'+(S.logHits!==1?'s':'');
  updateMetrics({faults:step.runningFaults,hits:step.runningHits,total:step.step});
}
function renderRefCells(pages) {
  const el=document.getElementById('rdCells'); if(!el) return;
  el.innerHTML='';
  pages.forEach((p,i) => { const c=document.createElement('div'); c.className='rd-cell'; c.id='rc'+i; c.textContent=p; el.appendChild(c); });
}
function buildFrameTable(steps, upTo) {
  const el=document.getElementById('fvwTable'); if(!el) return;
  const shown=steps.slice(0,upTo); const nF=S.frames;
  let h='<table>';
  h+='<tr><th style="text-align:left;padding-right:10px;color:var(--t4)">F</th>';
  shown.forEach(s => { h+=`<th style="color:${s.isFault?'var(--fault)':'var(--hit)'}">${s.page}</th>`; });
  h+='</tr>';
  for (let f=0;f<nF;f++) {
    h+='<tr>';
    h+=`<td style="font-size:10px;color:var(--t4);text-align:left;padding-right:10px">${f+1}</td>`;
    shown.forEach((s,si) => {
      const prev = si>0?shown[si-1].frames:[];
      const v=s.frames[f];
      if (v===undefined) { h+='<td class="cell-empty">—</td>'; return; }
      let cls='cell-page';
      if (s.isFault && v!==prev[f]) cls='cell-new';
      else if (!s.isFault && v===s.page) cls='cell-hit-active';
      else if (si>0 && s.isFault && prev[f]!==undefined && v!==prev[f]) cls='cell-evict';
      h+=`<td class="${cls}">${v}</td>`;
    });
    h+='</tr>';
  }
  h+='<tr><td style="font-size:10px;color:var(--t4)">—</td>';
  shown.forEach(s => { h+=`<td class="${s.isFault?'sf':'sh'}" style="font-size:10px">${s.isFault?'F':'H'}</td>`; });
  h+='</tr></table>';
  el.innerHTML=h;
}
function updateFvwAlgo() { const e=document.getElementById('fvwAlgo'); if(e) e.textContent=S.algo; }
function clearViz() { setBanner('idle','Configure settings and press Run'); updateMetrics(null); }
function setBanner(cls, html) {
  const el=document.getElementById('stepBanner'); if(!el) return;
  el.innerHTML=`<div class="sb-content ${cls}">${html}</div>`;
}
function updateMetrics(d) {
  ['mpFaults','mpHits','mpRate','mpRatio'].forEach(id => { const e=document.getElementById(id); if(e&&!d) e.textContent='—'; });
  const b=document.getElementById('mpBarFill'); if(b&&!d) { b.style.width='0%'; return; }
  if (!d) return;
  const {faults,hits,total}=d;
  const hr=total>0?((hits/total)*100).toFixed(1):0;
  const fr=total>0?((faults/total)*100).toFixed(1):0;
  const e1=document.getElementById('mpFaults'); if(e1) e1.textContent=faults;
  const e2=document.getElementById('mpHits'); if(e2) e2.textContent=hits;
  const e3=document.getElementById('mpRate'); if(e3) e3.textContent=fr+'%';
  const e4=document.getElementById('mpRatio'); if(e4) e4.textContent=hr+'%';
  if(b) b.style.width=hr+'%';
}
function finalize() {
  const r=S.result; if(!r) return;
  updateMetrics({faults:r.faults,hits:r.hits,total:r.total});
  setBanner('idle',`Done — <span style="color:var(--fault)">${r.faults} faults</span>, <span style="color:var(--hit)">${r.hits} hits</span>`);
}

// ===== LOG =====
function addLog(step) {
  const body=document.getElementById('lpBody'); if(!body) return;
  const emp=body.querySelector('.lp-empty'); if(emp) emp.remove();
  const fr='['+step.frames.join(', ')+']';
  const ev=step.evicted!==null?` <span class="le-evicted">evict:${step.evicted}</span>`:'';
  const d=document.createElement('div');
  d.className=`log-entry ${step.isFault?'le-f':'le-h'}`;
  d.innerHTML=`<span class="le-step">#${step.step}</span><span class="le-page">${step.page}</span><span class="le-type ${step.isFault?'f':'h'}">${step.isFault?'FAULT':'HIT'}</span><span class="le-frames">${fr}</span>${ev}`;
  body.appendChild(d); body.scrollTop=body.scrollHeight;
}
function clearLog() {
  const b=document.getElementById('lpBody'); if(!b) return;
  b.innerHTML='<div class="lp-empty">Events appear here…</div>';
  S.logFaults=0; S.logHits=0;
  const lf=document.getElementById('lpFaultCount'); if(lf) lf.textContent='0 faults';
  const lh=document.getElementById('lpHitCount'); if(lh) lh.textContent='0 hits';
}

// ===== THEORY MODAL =====
const TH = {
  fifo:{badge:'<span class="tc-badge badge-fifo">FIFO</span>',title:'First In First Out',body:`<p>FIFO maintains a strict queue. The page loaded <strong>longest ago</strong> is always the next victim when frames are full.</p><p><strong>Key rules:</strong></p><ul><li>Maintain a FIFO queue of loaded pages.</li><li>On a hit: queue unchanged.</li><li>On a fault + free frames: enqueue new page.</li><li>On a fault + full frames: dequeue oldest, load new.</li></ul><p><strong>Bélády's Anomaly:</strong> Adding frames can <em>increase</em> faults. Unique to FIFO.</p><div class="modal-example"><div class="modal-example-title">Ref: 1 2 3 4 1 2 5 | Frames = 3</div><p style="font-family:var(--f-mono);font-size:12px;color:#8fa8a8">1→[1]F | 2→[1,2]F | 3→[1,2,3]F<br>4→evict 1→[4,2,3]F | 1→evict 2→[4,1,3]F<br>2→evict 3→[4,1,2]F | 5→evict 4→[5,1,2]F<br><strong>Total: 7 faults</strong></p></div>`},
  lru:{badge:'<span class="tc-badge badge-lru">LRU</span>',title:'Least Recently Used',body:`<p>LRU evicts the page accessed <strong>furthest in the past</strong>, exploiting temporal locality.</p><p><strong>Key rules:</strong></p><ul><li>Track usage order; most recent at end.</li><li>On a hit: move page to end (most recent).</li><li>On a fault: evict page at front (least recent).</li></ul><p>Does <strong>not</strong> suffer Bélády's Anomaly. Requires HW support or Clock approximation.</p><div class="modal-example"><div class="modal-example-title">Ref: 1 2 3 4 1 2 5 | Frames = 3</div><p style="font-family:var(--f-mono);font-size:12px;color:#8fa8a8">1→[1]F | 2→[1,2]F | 3→[1,2,3]F<br>4→evict 1(LRU)→[2,3,4]F | 1→evict 2→[3,4,1]F<br>2→evict 3→[4,1,2]F | 5→evict 4→[1,2,5]F<br><strong>Total: 7 faults</strong></p></div>`},
  opt:{badge:'<span class="tc-badge badge-opt">OPT</span>',title:"Optimal — Bélády's Algorithm",body:`<p>OPT evicts the page whose next use is <strong>farthest in the future</strong>, giving the theoretical minimum faults.</p><p><strong>Key rules:</strong></p><ul><li>Look ahead in the reference string at each fault.</li><li>Compute next occurrence for each in-memory page.</li><li>Evict the page with farthest (or no) future reference.</li></ul><p>Not implementable in real OS — used as a <strong>lower-bound benchmark</strong>.</p><div class="modal-example"><div class="modal-example-title">Ref: 1 2 3 4 1 2 5 | Frames = 3</div><p style="font-family:var(--f-mono);font-size:12px;color:#8fa8a8">1→[1]F | 2→[1,2]F | 3→[1,2,3]F<br>4→evict 3(∞)→[1,2,4]F | 1→HIT | 2→HIT<br>5→evict 4→[1,2,5]F<br><strong>Total: 5 faults (minimum)</strong></p></div>`}
};
function openTheory(key) {
  const d=TH[key]; if(!d) return;
  document.getElementById('modalContent').innerHTML=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">${d.badge}<h2 style="font-size:20px;font-weight:700;margin:0">${d.title}</h2></div>${d.body}`;
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeTheory() { document.getElementById('modalOverlay').classList.remove('open'); document.body.style.overflow=''; }
document.addEventListener('keydown', e => { if(e.key==='Escape') closeTheory(); });

// ===== COMPARISON =====
let compChart=null;
function runComparison() {
  const refStr=document.getElementById('refString').value||S.refStr;
  const pages=parseRefString(refStr);
  if (!pages.length) { alert('Enter a reference string first.'); return; }
  const R=runAllAlgorithms(refStr,S.frames);
  const minF=Math.min(R.FIFO.faults,R.LRU.faults,R.OPT.faults);
  const algos=[{k:'FIFO',l:'First In First Out',cls:'cc-fifo',col:'#FB923C'},{k:'LRU',l:'Least Recently Used',cls:'cc-lru',col:'#60A5FA'},{k:'OPT',l:'Optimal (Bélády)',cls:'cc-opt',col:'#A78BFA'}];
  const cards=document.getElementById('compareCards'); cards.innerHTML='';
  algos.forEach(({k,l,cls,col},idx) => {
    const r=R[k]; const hr=r.total>0?((r.hits/r.total)*100).toFixed(1):0;
    const fr=r.total>0?((r.faults/r.total)*100).toFixed(1):0;
    const isBest=r.faults===minF;
    const card=document.createElement('div');
    card.className=`cc ${cls}`; card.style.animationDelay=(idx*0.08)+'s';
    card.innerHTML=`${isBest?'<div class="cc-best">BEST ✓</div>':''}<div class="cc-tag">${k}</div><div class="cc-name">${l}</div><div class="cc-stat"><span class="cc-stat-lbl">Page Faults</span><span class="cc-stat-val v-fault">${r.faults}</span></div><div class="cc-stat"><span class="cc-stat-lbl">Page Hits</span><span class="cc-stat-val v-hit">${r.hits}</span></div><div class="cc-stat"><span class="cc-stat-lbl">Fault Rate</span><span class="cc-stat-val v-neutral" style="font-size:16px">${fr}%</span></div><div class="cc-stat"><span class="cc-stat-lbl">Hit Ratio</span><span class="cc-stat-val v-neutral" style="font-size:16px">${hr}%</span></div><div class="cc-bar"><div class="cc-bar-fill" data-w="${hr}" style="width:0%;background:${col}"></div></div>`;
    cards.appendChild(card);
  });
  setTimeout(() => { document.querySelectorAll('.cc-bar-fill').forEach(b => b.style.width=b.getAttribute('data-w')+'%'); }, 100);
  const hint=document.getElementById('cmpHint'); if(hint) hint.textContent=`Ref: "${refStr.trim()}" | Frames: ${S.frames}`;
  const ca=document.getElementById('chartArea'); ca.style.display='block';
  const labels=pages.map((_,i)=>String(i+1));
  const cum=steps => { let c=0; return steps.map(s => { if(s.isFault) c++; return c; }); };
  if (compChart) { compChart.destroy(); compChart=null; }
  compChart=new Chart(document.getElementById('compareChart').getContext('2d'),{type:'line',data:{labels,datasets:[{label:'FIFO',data:cum(R.FIFO.steps),borderColor:'#FB923C',backgroundColor:'rgba(251,146,60,0.05)',borderWidth:2.5,pointRadius:3,tension:0.35,fill:false},{label:'LRU',data:cum(R.LRU.steps),borderColor:'#60A5FA',backgroundColor:'rgba(96,165,250,0.05)',borderWidth:2.5,pointRadius:3,tension:0.35,fill:false},{label:'Optimal',data:cum(R.OPT.steps),borderColor:'#A78BFA',backgroundColor:'rgba(167,139,250,0.05)',borderWidth:2.5,pointRadius:3,tension:0.35,fill:false}]},options:{responsive:true,plugins:{legend:{labels:{color:'#A89CC8',font:{family:"'Fira Code',monospace",size:12},boxWidth:16}},tooltip:{backgroundColor:'#17112C',borderColor:'#3D3460',borderWidth:1,titleColor:'#EDE9FE',bodyColor:'#A89CC8'}},scales:{x:{ticks:{color:'#6B5F8A',font:{family:"'Fira Code',monospace",size:10},maxTicksLimit:20},grid:{color:'rgba(139,92,246,0.07)'},title:{display:true,text:'Step',color:'#6B5F8A',font:{family:"'Fira Code',monospace",size:11}}},y:{ticks:{color:'#6B5F8A',font:{family:"'Fira Code',monospace",size:11},stepSize:1},grid:{color:'rgba(139,92,246,0.07)'},beginAtZero:true,title:{display:true,text:'Cumulative faults',color:'#6B5F8A',font:{family:"'Fira Code',monospace",size:11}}}}}}); 
}

// ===== KEYBOARD =====
document.addEventListener('keydown', e => {
  if (e.target.tagName==='INPUT') return;
  if (e.key===' '||e.key==='Enter') { e.preventDefault(); stepSimulation(); }
  if (e.key==='r'||e.key==='R') resetSimulation();
  if (e.key==='p'||e.key==='P') runSimulation();
});

let previewTimer = null;

function showPreview(algo) {
  const preview = document.getElementById('hoverPreview');
  const title = document.getElementById('previewTitle');
  const framesEl = document.getElementById('previewFrames');

  preview.classList.remove('hidden');
  title.innerText = algo + " Preview";

  const sample = "7 0 1 2 0 3 0";
  let result;

  if (algo === "FIFO") result = runFIFO(sample, 3);
  if (algo === "LRU") result = runLRU(sample, 3);
  if (algo === "OPT") result = runOptimal(sample, 3);

  let i = 0;

  previewTimer = setInterval(() => {
    const step = result.steps[i];
    framesEl.innerHTML = "";

    step.frames.forEach((f, idx) => {
      const div = document.createElement('div');
      div.className = "preview-row";
      div.innerText = `F${idx+1}: ${f ?? '-'}`;
      framesEl.appendChild(div);
    });

    i = (i + 1) % result.steps.length;
  }, 600);
}

function hidePreview() {
  const preview = document.getElementById('hoverPreview');
  preview.classList.add('hidden');
  clearInterval(previewTimer);
}