// Direction B — "Atelier" — light editorial studio. Calm, generous typography.
// Multi-screen prototype: Home (full + empty), Template Gallery, Generating,
// Workspace (the editor), and Export modal.

const { useState: useStateB, useEffect: useEffectB, useRef: useRefB } = React;

// ─── shared chrome ─────────────────────────────────────────────────
function atlCSS(accent) {
  return `
    .atl-app { font-family: 'Inter', system-ui, sans-serif; background:#faf8f4; color:#1a1a1a; height:100%; display:flex; flex-direction:column; position:relative; }
    .atl-app * { box-sizing:border-box; }
    .atl-serif { font-family: 'Fraunces','Iowan Old Style',Georgia,serif; }
    .atl-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
    .atl-btn { display:inline-flex; align-items:center; gap:7px; padding:9px 16px; border-radius:6px; border:1px solid #d8d2c4; background:#fff; color:#1a1a1a; cursor:pointer; font-size:13px; font-family:inherit; transition: all .15s; white-space:nowrap; }
    .atl-btn:hover { background:#f3efe5; border-color:${accent}; }
    .atl-btn-pri { background:${accent}; color:#faf8f4; border:1px solid ${accent}; font-weight:500; }
    .atl-btn-pri:hover { background:${accent}; opacity:.92; box-shadow:0 4px 14px ${accent}30; }
    .atl-btn-ghost { border-color:transparent; background:transparent; }
    .atl-btn-ghost:hover { background:#f3efe5; border-color:transparent; }
    .atl-input, .atl-ta { background:#fff; border:1px solid #e2dccd; color:#1a1a1a; border-radius:6px; padding:10px 12px; font-size:13px; outline:none; width:100%; font-family:inherit; transition:border-color .15s; }
    .atl-input:focus, .atl-ta:focus { border-color:${accent}; box-shadow: 0 0 0 3px ${accent}20; }
    .atl-ta { line-height:1.55; resize:vertical; }
    .atl-label { font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#7a6f56; font-weight:600; margin-bottom:6px; display:flex; align-items:center; gap:6px; }
    .atl-card { background:#fff; border:1px solid #e8e1cf; border-radius:10px; }
    .atl-tab { padding:8px 0; border:none; background:transparent; color:#7a6f56; cursor:pointer; font-size:12px; font-weight:500; border-bottom:2px solid transparent; font-family:inherit; margin-right:18px; letter-spacing:.04em; }
    .atl-tab.on { color:${accent}; border-bottom-color:${accent}; }
    .atl-side { background:#f3efe5; }
    .atl-cost { display:inline-flex; align-items:center; gap:6px; padding:5px 10px; border-radius:14px; background:#1a1a1a; color:#faf8f4; font-family:'JetBrains Mono',ui-monospace,monospace; font-size:11px; }
    .atl-outline-row { padding:12px 14px; border-bottom:1px solid #e8e1cf; cursor:pointer; transition: background .12s; display:flex; gap:14px; align-items:flex-start; }
    .atl-outline-row:hover { background:#ede5d2; }
    .atl-outline-row.on { background:#fff; box-shadow: inset 3px 0 0 ${accent}; }
    .atl-chip { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:99px; font-size:11px; background:${accent}15; color:${accent}; }
    .atl-tile { transition:all .2s; cursor:pointer; }
    .atl-tile:hover { transform:translateY(-3px); box-shadow:0 14px 30px rgba(0,0,0,.06); }
    @keyframes atl-pulse { 0%,100% { opacity:.45; } 50% { opacity:1; } }
    @keyframes atl-spin { to { transform:rotate(360deg); } }
    @keyframes atl-shimmer { 0% { background-position:-400px 0; } 100% { background-position:400px 0; } }
    .atl-skel { background:linear-gradient(90deg,#ede5d2 0,#f3efe5 40%,#ede5d2 80%); background-size:800px 100%; animation:atl-shimmer 1.6s linear infinite; border-radius:6px; }
  `;
}

function AtelierTopbar({ accent, onHome, projectName, status, onOpenStyle, onOpenDiscuss, onOpenGallery, onOpenExport, costLabel }) {
  return (
    <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 24px', borderBottom:'1px solid #e8e1cf', background:'#faf8f4', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
        {onHome && <button onClick={onHome} className="atl-btn" style={{ padding:'6px 10px' }}><Icon.back size={13}/></button>}
        <div style={{ width:22, height:22, borderRadius:'50%', background:accent, flexShrink:0 }}/>
        <span className="atl-serif" style={{ fontSize:16, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{projectName}</span>
        {status && <span className="atl-chip">{status}</span>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {onOpenGallery && <button className="atl-btn" onClick={onOpenGallery}><Icon.layers size={13}/> Templates</button>}
        {onOpenStyle && <button className="atl-btn" onClick={onOpenStyle}><Icon.wand size={13}/> Style</button>}
        {onOpenDiscuss && <button className="atl-btn" onClick={onOpenDiscuss}><Icon.chat size={13}/> Discuss</button>}
        {onOpenExport && <button className="atl-btn-pri atl-btn" onClick={onOpenExport}><Icon.download size={13}/> Export</button>}
        <span className="atl-cost"><Icon.dollar size={11}/> {costLabel || '$0.42'}</span>
      </div>
    </header>
  );
}

// ─── HOME ──────────────────────────────────────────────────────────
function AtelierHome({ accent, density = 'comfortable', empty = false, onOpenProject, onNew }) {
  const projects = empty ? [] : SAMPLE_PROJECTS;
  return (
    <div className="atl-app">
      <style>{atlCSS(accent)}</style>
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 32px', borderBottom:'1px solid #e8e1cf' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:accent }}/>
          <span className="atl-serif" style={{ fontSize:18, letterSpacing:-.3 }}>Slidebuilder</span>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <button className="atl-btn atl-btn-ghost" style={{ fontSize:12 }}><Icon.upload size={12}/> Restore backup</button>
          <span className="atl-cost"><Icon.dollar size={11}/> $0.42</span>
          <button className="atl-btn-pri atl-btn" onClick={onNew}><Icon.plus size={14}/> New deck</button>
        </div>
      </header>
      <div style={{ flex:1, overflow:'auto' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'56px 32px 80px' }}>
          {empty ? (
            <div style={{ textAlign:'center', padding:'72px 0' }}>
              <div className="atl-mono" style={{ fontSize:11, letterSpacing:'.18em', textTransform:'uppercase', color:'#7a6f56', marginBottom:18 }}>Welcome</div>
              <h1 className="atl-serif" style={{ fontSize:54, fontWeight:400, letterSpacing:-1.2, margin:'0 0 14px', lineHeight:1.05 }}>
                Begin with an <em style={{ color:accent }}>empty page</em>.
              </h1>
              <p style={{ fontSize:15, lineHeight:1.65, color:'#7a6f56', maxWidth:520, margin:'0 auto 36px' }}>
                Slidebuilder turns rough notes and reference shots into finished decks. Pick a starting template, dictate the look, then let the editor do the heavy lifting.
              </p>
              <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                <button className="atl-btn-pri atl-btn" onClick={onNew} style={{ fontSize:14, padding:'12px 22px' }}><Icon.plus size={14}/> Start a new deck</button>
                <button className="atl-btn" style={{ fontSize:14, padding:'12px 18px' }}><Icon.upload size={14}/> Import .pptx</button>
              </div>
              <div style={{ marginTop:48, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, maxWidth:760, margin:'48px auto 0' }}>
                {SAMPLE_TEMPLATES.slice(1).map(t => (
                  <div key={t.id} className="atl-card atl-tile" style={{ overflow:'hidden' }} onClick={onNew}>
                    <div style={{ aspectRatio:'16/10', background:t.bg }} />
                    <div style={{ padding:'10px 14px' }}>
                      <div className="atl-serif" style={{ fontSize:14 }}>{t.name}</div>
                      <div style={{ fontSize:11, color:'#7a6f56', marginTop:2 }}>Start with this template</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom:48, display:'grid', gridTemplateColumns:'1fr auto', alignItems:'flex-end', gap:24 }}>
                <div>
                  <div className="atl-mono" style={{ fontSize:11, letterSpacing:'.18em', textTransform:'uppercase', color:'#7a6f56', marginBottom:14 }}>Editorial · pitch · narrative</div>
                  <h1 className="atl-serif" style={{ fontSize:56, fontWeight:400, letterSpacing:-1.5, margin:0, lineHeight:1.05, textWrap:'pretty' }}>
                    Six decks in flight, <em style={{ color:accent }}>three</em> due this week.
                  </h1>
                </div>
                <div className="atl-card" style={{ padding:18, minWidth:260 }}>
                  <div className="atl-label">This month</div>
                  <div className="atl-serif" style={{ fontSize:34, letterSpacing:-1, marginBottom:4 }}>$12.40</div>
                  <div style={{ fontSize:12, color:'#7a6f56' }}>Image gen — $9.10 · text — $3.30</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:20 }}>
                {projects.map(p => (
                  <div key={p.id} className="atl-card atl-tile" style={{ overflow:'hidden' }} onClick={()=>onOpenProject?.(p)}>
                    <div style={{ aspectRatio:'4/3', background:p.thumb }} />
                    <div style={{ padding:'14px 16px' }}>
                      <div className="atl-serif" style={{ fontSize:18, letterSpacing:-.3, marginBottom:6, lineHeight:1.2 }}>{p.name}</div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, color:'#7a6f56' }}>
                        <span className="atl-mono">{p.count}</span>
                        <span>{p.updated}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TEMPLATE GALLERY (full screen) ────────────────────────────────
function AtelierGallery({ accent, onBack, onPick }) {
  const [picked, setPicked] = useStateB(0);
  const [filter, setFilter] = useStateB('all');
  // expanded library — synthetic but evocative
  const lib = [
    { id:'g0', name:'Blank canvas', tag:'utility', isBlank:true },
    { id:'g1', name:'Editorial Serif', tag:'editorial', bg: SAMPLE_SLIDES[1].bg },
    { id:'g2', name:'Tech Blueprint', tag:'tech', bg: SAMPLE_SLIDES[0].bg },
    { id:'g3', name:'Bold Display', tag:'pitch', bg: SAMPLE_SLIDES[4].bg },
    { id:'g4', name:'Cinematic Hero', tag:'editorial', bg: SAMPLE_SLIDES[3].bg },
    { id:'g5', name:'Mono Roadmap', tag:'tech', bg: SAMPLE_SLIDES[5].bg },
    { id:'g6', name:'Forest Calm', tag:'editorial', bg: SAMPLE_SLIDES[2].bg },
    { id:'g7', name:'Risograph', tag:'pitch', bg:'linear-gradient(135deg,#ffe5d4,#f6a192)' },
    { id:'g8', name:'Ledger Grid', tag:'tech', bg:'linear-gradient(135deg,#0e1b1a,#234e4d)' },
    { id:'g9', name:'Aperture', tag:'editorial', bg:'linear-gradient(135deg,#1c1c1c,#3a3a3a)' },
    { id:'g10', name:'Bauhaus Block', tag:'pitch', bg:'linear-gradient(135deg,#fcd34d,#dc2626)' },
    { id:'g11', name:'Mineral', tag:'editorial', bg:'linear-gradient(135deg,#d6cfc4,#7a6f56)' },
  ];
  const filtered = filter === 'all' ? lib : lib.filter(l => l.tag === filter || l.isBlank);
  const tags = [
    { id:'all', label:'All templates' },
    { id:'editorial', label:'Editorial' },
    { id:'pitch', label:'Pitch & investor' },
    { id:'tech', label:'Tech / data' },
  ];
  return (
    <div className="atl-app">
      <style>{atlCSS(accent)}</style>
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 24px', borderBottom:'1px solid #e8e1cf' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={onBack} className="atl-btn" style={{ padding:'6px 10px' }}><Icon.back size={13}/></button>
          <span className="atl-serif" style={{ fontSize:16 }}>Pick a starting template</span>
          <span className="atl-chip">step 1 of 2 · style</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button className="atl-btn"><Icon.upload size={13}/> Upload reference</button>
          <button className="atl-btn-pri atl-btn" onClick={()=>onPick?.(filtered[picked])}>
            Use template <Icon.arrow size={13}/>
          </button>
        </div>
      </header>
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'240px 1fr', minHeight:0 }}>
        <aside className="atl-side" style={{ borderRight:'1px solid #e8e1cf', padding:'18px 14px', display:'flex', flexDirection:'column', gap:6 }}>
          <div className="atl-label">Filter</div>
          {tags.map(t => (
            <button key={t.id} onClick={()=>setFilter(t.id)} className="atl-btn" style={{ justifyContent:'flex-start', background: filter===t.id ? '#fff' : 'transparent', borderColor: filter===t.id ? accent : 'transparent', color: filter===t.id ? accent : '#1a1a1a' }}>{t.label}</button>
          ))}
          <div style={{ marginTop:18 }} className="atl-label">Or describe</div>
          <textarea className="atl-ta" rows={4} placeholder="“Editorial spread, generous whitespace, Fraunces serif, muted earth palette.”" />
          <button className="atl-btn-pri atl-btn" style={{ justifyContent:'center', marginTop:8 }}><Icon.sparkles size={13}/> Generate template</button>
        </aside>
        <div style={{ overflow:'auto', padding:'24px 28px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18 }}>
            {filtered.map((t,i) => (
              <div key={t.id} className="atl-card atl-tile" onClick={()=>setPicked(i)}
                   style={{ overflow:'hidden', border: i===picked ? `2px solid ${accent}` : '1px solid #e8e1cf', position:'relative' }}>
                <div style={{ aspectRatio:'16/10', background: t.isBlank ? '#faf8f4' : t.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {t.isBlank && <div className="atl-serif" style={{ color:'#bdb29a', fontSize:36 }}>+</div>}
                </div>
                <div style={{ padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div className="atl-serif" style={{ fontSize:15 }}>{t.name}</div>
                    <div className="atl-mono" style={{ fontSize:10, color:'#7a6f56', textTransform:'uppercase', letterSpacing:'.08em', marginTop:2 }}>{t.tag}</div>
                  </div>
                  {i===picked && <div style={{ width:20, height:20, borderRadius:'50%', background:accent, color:'#faf8f4', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon.check size={12}/></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GENERATING / LOADING STATE ────────────────────────────────────
function AtelierGenerating({ accent, onDone }) {
  const [done, setDone] = useStateB([true, true, true, false, false, false]);
  useEffectB(() => {
    const id = setInterval(() => {
      setDone(prev => {
        const idx = prev.findIndex(d => !d);
        if (idx === -1) return prev;
        const next = [...prev]; next[idx] = true; return next;
      });
    }, 1100);
    return () => clearInterval(id);
  }, []);
  const total = done.length;
  const completed = done.filter(Boolean).length;
  return (
    <div className="atl-app">
      <style>{atlCSS(accent)}</style>
      <AtelierTopbar accent={accent} projectName="Series B Pitch — Sequoia" status="generating · auto-saved" costLabel="$0.42" onOpenStyle={()=>{}} onOpenDiscuss={()=>{}} onOpenExport={onDone} onOpenGallery={()=>{}} onHome={()=>{}}/>
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'380px 1fr', minHeight:0 }}>
        <div className="atl-side" style={{ borderRight:'1px solid #e8e1cf', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid #e8e1cf', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div className="atl-label" style={{ marginBottom:0 }}>Outline · {total} slides</div>
            <span className="atl-mono" style={{ fontSize:11, color:accent }}>{completed}/{total}</span>
          </div>
          <div style={{ flex:1, overflow:'auto' }}>
            {SAMPLE_SLIDES.map((s,i) => (
              <div key={s.id} className={`atl-outline-row ${i===completed?'on':''}`}>
                <div style={{ width:64, height:40, borderRadius:4, flexShrink:0, marginTop:2, position:'relative', overflow:'hidden', background: done[i] ? s.bg : '#ede5d2' }}>
                  {!done[i] && <div className="atl-skel" style={{ position:'absolute', inset:0 }} />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="atl-mono" style={{ fontSize:10, color:'#7a6f56', letterSpacing:'.06em', marginBottom:3, display:'flex', alignItems:'center', gap:6 }}>
                    {String(i+1).padStart(2,'0')} ·
                    {done[i]
                      ? <span style={{ color:accent }}>rendered</span>
                      : i===completed
                          ? <span style={{ display:'inline-flex', alignItems:'center', gap:4, color:accent }}><span style={{ width:8, height:8, borderRadius:'50%', background:accent, animation:'atl-pulse 1s infinite' }}/> rendering…</span>
                          : <span>queued</span>}
                  </div>
                  <div className="atl-serif" style={{ fontSize:15, lineHeight:1.25, marginBottom:3 }}>{s.title}</div>
                  <div style={{ fontSize:12, color:'#7a6f56', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', overflow:'auto', alignItems:'center', justifyContent:'center', padding:32 }}>
          <div style={{ width:'100%', maxWidth:760, aspectRatio:'16/9', borderRadius:6, overflow:'hidden', position:'relative', boxShadow:'0 30px 60px rgba(26,26,26,.08), 0 0 0 1px #e8e1cf' }}>
            {done[completed] || completed >= total
              ? <FauxSlide slide={SAMPLE_SLIDES[Math.min(completed, total-1)]} scale={1.1} />
              : <>
                  <FauxSlide slide={SAMPLE_SLIDES[completed]} scale={1.1} />
                  <div style={{ position:'absolute', inset:0, background:'rgba(250,248,244,.86)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14 }}>
                    <div style={{ width:46, height:46, border:`3px solid ${accent}30`, borderTopColor:accent, borderRadius:'50%', animation:'atl-spin 0.9s linear infinite' }} />
                    <div className="atl-mono" style={{ fontSize:11, color:'#7a6f56', letterSpacing:'.12em', textTransform:'uppercase' }}>Rendering slide {completed+1}</div>
                    <div className="atl-serif" style={{ fontSize:22, color:'#1a1a1a' }}>{SAMPLE_SLIDES[completed].title}</div>
                  </div>
                </>}
          </div>
          <div style={{ marginTop:20, width:'100%', maxWidth:760 }}>
            <div style={{ height:4, background:'#ede5d2', borderRadius:2, overflow:'hidden' }}>
              <div style={{ width:`${(completed/total)*100}%`, height:'100%', background:accent, transition:'width .3s' }} />
            </div>
            <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', fontSize:12, color:'#7a6f56' }}>
              <span>Generating deck · {completed}/{total} rendered</span>
              <span className="atl-mono">+$0.18 this run</span>
            </div>
          </div>
          <button className="atl-btn" style={{ marginTop:20 }}>Stop and review what's done</button>
        </div>
      </div>
    </div>
  );
}

// ─── EXPORT MODAL ──────────────────────────────────────────────────
function AtelierExport({ accent, onClose }) {
  const [mode, setMode] = useStateB('hybrid');
  const [fmt, setFmt] = useStateB('pptx');
  return (
    <div className="atl-app">
      <style>{atlCSS(accent)}</style>
      <AtelierTopbar accent={accent} projectName="Series B Pitch — Sequoia" status="ready to export" costLabel="$0.42"
        onHome={()=>{}} onOpenGallery={()=>{}} onOpenStyle={()=>{}} onOpenDiscuss={()=>{}} />
      {/* dim backdrop */}
      <div style={{ position:'absolute', inset:0, top:55, background:'rgba(26,26,26,.42)', display:'flex', alignItems:'center', justifyContent:'center', padding:32, zIndex:40 }}>
        <div className="atl-card" style={{ width:'100%', maxWidth:680, padding:0, overflow:'hidden', boxShadow:'0 40px 80px rgba(0,0,0,.18)' }}>
          <div style={{ padding:'20px 26px', borderBottom:'1px solid #e8e1cf', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div className="atl-mono" style={{ fontSize:10, letterSpacing:'.18em', textTransform:'uppercase', color:'#7a6f56' }}>Export</div>
              <div className="atl-serif" style={{ fontSize:24, marginTop:4 }}>Send the deck out into the world</div>
            </div>
            <button className="atl-btn-ghost atl-btn" onClick={onClose}><Icon.close size={14}/></button>
          </div>
          <div style={{ padding:'22px 26px', display:'flex', flexDirection:'column', gap:18 }}>
            <div>
              <div className="atl-label">Format</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { id:'pptx', icon:<Icon.layers size={14}/>, name:'PowerPoint (.pptx)', sub:'Editable in Keynote, PowerPoint, Slides.' },
                  { id:'pdf', icon:<Icon.download size={14}/>, name:'PDF', sub:'Pixel-faithful, share-ready.' },
                ].map(f => (
                  <button key={f.id} onClick={()=>setFmt(f.id)} className="atl-card" style={{ padding:'14px 16px', textAlign:'left', cursor:'pointer', border: fmt===f.id ? `2px solid ${accent}` : '1px solid #e8e1cf', background: fmt===f.id ? `${accent}08` : '#fff' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, color: fmt===f.id ? accent : '#1a1a1a', marginBottom:4 }}>{f.icon}<span style={{ fontWeight:600, fontSize:13 }}>{f.name}</span></div>
                    <div style={{ fontSize:12, color:'#7a6f56' }}>{f.sub}</div>
                  </button>
                ))}
              </div>
            </div>
            {fmt === 'pptx' && (
              <div>
                <div className="atl-label">Layout fidelity</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { id:'hybrid', name:'Hybrid editable', sub:'Image background + native PowerPoint text boxes for title, subtitle, bullets. Best for collaborators who want to tweak copy.', rec:true },
                    { id:'image', name:'Image only', sub:'Each slide is a single image. Pixel-perfect but text is not editable.' },
                  ].map(m => (
                    <button key={m.id} onClick={()=>setMode(m.id)} className="atl-card" style={{ padding:'12px 14px', textAlign:'left', cursor:'pointer', border: mode===m.id ? `2px solid ${accent}` : '1px solid #e8e1cf', background: mode===m.id ? `${accent}08` : '#fff', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${mode===m.id?accent:'#d8d2c4'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {mode===m.id && <div style={{ width:8, height:8, borderRadius:'50%', background:accent }}/>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, display:'flex', gap:8, alignItems:'center' }}>{m.name} {m.rec && <span className="atl-chip">recommended</span>}</div>
                        <div style={{ fontSize:12, color:'#7a6f56', marginTop:3, lineHeight:1.5 }}>{m.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="atl-label">Filename</div>
              <input className="atl-input" defaultValue="Series-B-Pitch-Sequoia.pptx" />
            </div>
            <div className="atl-card" style={{ padding:'12px 14px', background:`${accent}08`, borderColor:`${accent}40`, fontSize:12, color:'#1a1a1a', lineHeight:1.55 }}>
              <strong>Ready when you are.</strong> 6 slides · 16:9 · 4.2 MB estimated. Export takes about 8 seconds.
            </div>
          </div>
          <div style={{ padding:'14px 26px', borderTop:'1px solid #e8e1cf', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#faf8f4' }}>
            <span style={{ fontSize:12, color:'#7a6f56' }}>Saved to your downloads folder.</span>
            <div style={{ display:'flex', gap:8 }}>
              <button className="atl-btn" onClick={onClose}>Cancel</button>
              <button className="atl-btn-pri atl-btn"><Icon.download size={13}/> Export {fmt.toUpperCase()}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WORKSPACE (the editor) ────────────────────────────────────────
function AtelierWorkspace({ accent, density = 'comfortable', activeProject, onHome, onGallery, onExport }) {
  const PAD = density === 'compact' ? 14 : 20;
  const [slides, setSlides] = useStateB(SAMPLE_SLIDES);
  const [activeIdx, setActiveIdx] = useStateB(0);
  const [drawer, setDrawer] = useStateB(null);
  const slide = slides[activeIdx];
  const proj = activeProject || SAMPLE_PROJECTS[0];

  return (
    <div className="atl-app">
      <style>{atlCSS(accent)}</style>
      <AtelierTopbar
        accent={accent} projectName={proj.name} status="draft · auto-saved" costLabel="$0.42"
        onHome={onHome}
        onOpenGallery={onGallery}
        onOpenStyle={()=>setDrawer(drawer==='style'?null:'style')}
        onOpenDiscuss={()=>setDrawer(drawer==='discuss'?null:'discuss')}
        onOpenExport={onExport}
      />

      <div style={{ flex:1, display:'grid', gridTemplateColumns:'380px 1fr', minHeight:0 }}>
        {/* outline */}
        <div className="atl-side" style={{ display:'flex', flexDirection:'column', borderRight:'1px solid #e8e1cf' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', borderBottom:'1px solid #e8e1cf' }}>
            <div className="atl-label" style={{ marginBottom:0 }}>Outline · {slides.length} slides</div>
            <button className="atl-btn" style={{ padding:'4px 8px', fontSize:11 }}><Icon.plus size={11}/> Add</button>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {slides.map((s,i) => (
              <div key={s.id} className={`atl-outline-row ${i===activeIdx?'on':''}`} onClick={()=>setActiveIdx(i)}>
                <div style={{ width:64, height:40, borderRadius:4, background:s.bg, flexShrink:0, marginTop:2 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="atl-mono" style={{ fontSize:10, color:'#7a6f56', letterSpacing:'.06em', marginBottom:3 }}>{String(i+1).padStart(2,'0')} · rendered</div>
                  <div className="atl-serif" style={{ fontSize:15, lineHeight:1.25, marginBottom:3, color:'#1a1a1a' }}>{s.title}</div>
                  <div style={{ fontSize:12, color:'#7a6f56', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* stage + inspector */}
        <div style={{ display:'flex', flexDirection:'column', minHeight:0, overflow:'auto' }}>
          <div style={{ padding:`32px ${PAD+12}px 12px`, display:'flex', justifyContent:'center' }}>
            <div style={{ width:'100%', maxWidth:880, aspectRatio:'16/9', borderRadius:6, overflow:'hidden', boxShadow:'0 30px 60px rgba(26,26,26,.08), 0 0 0 1px #e8e1cf' }}>
              <FauxSlide slide={slide} scale={1.1} />
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:18 }}>
            <button className="atl-btn"><Icon.sparkles size={12}/> Regenerate</button>
            <button className="atl-btn"><Icon.image size={12}/> Inpaint region</button>
            <button className="atl-btn"><Icon.copy size={12}/> Variations · 1</button>
            <button className="atl-btn"><Icon.trash size={12}/></button>
          </div>
          <div style={{ padding:`0 ${PAD+12}px ${PAD+12}px`, maxWidth:880, width:'100%', margin:'0 auto' }}>
            <div className="atl-card" style={{ padding:PAD+4 }}>
              <div className="atl-serif" style={{ fontSize:22, letterSpacing:-.5, marginBottom:18 }}>Slide {String(activeIdx+1).padStart(2,'0')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <div>
                  <div className="atl-label">Title</div>
                  <input className="atl-input" value={slide.title} onChange={e=>{const ns=[...slides];ns[activeIdx]={...slide,title:e.target.value};setSlides(ns);}} />
                </div>
                <div>
                  <div className="atl-label">Subtitle</div>
                  <input className="atl-input" value={slide.subtitle} onChange={e=>{const ns=[...slides];ns[activeIdx]={...slide,subtitle:e.target.value};setSlides(ns);}} />
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <div className="atl-label">Concept · what should this slide show?</div>
                <textarea className="atl-ta" value={slide.prompt} rows={3} onChange={e=>{const ns=[...slides];ns[activeIdx]={...slide,prompt:e.target.value};setSlides(ns);}} />
              </div>
              <div style={{ marginBottom:14 }}>
                <div className="atl-label">Bullets</div>
                <textarea className="atl-ta" value={slide.bullets.join('\n')} rows={4} onChange={e=>{const ns=[...slides];ns[activeIdx]={...slide,bullets:e.target.value.split('\n')};setSlides(ns);}} />
              </div>
              <details>
                <summary style={{ cursor:'pointer', fontSize:12, color:'#7a6f56', fontWeight:500 }}>Speaker notes</summary>
                <textarea className="atl-ta" value={slide.notes} rows={4} style={{ marginTop:10 }} onChange={e=>{const ns=[...slides];ns[activeIdx]={...slide,notes:e.target.value};setSlides(ns);}} />
              </details>
            </div>
          </div>
        </div>
      </div>

      {/* drawer */}
      {drawer && (
        <div style={{ position:'absolute', right:0, top:55, bottom:0, width:380, background:'#fff', borderLeft:'1px solid #e8e1cf', boxShadow:'-20px 0 40px rgba(0,0,0,.05)', zIndex:20, display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid #e8e1cf', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div className="atl-serif" style={{ fontSize:18 }}>{drawer === 'discuss' ? 'Discuss this slide' : 'Deck style'}</div>
            <button onClick={()=>setDrawer(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#7a6f56' }}><Icon.close size={16}/></button>
          </div>
          {drawer === 'discuss' && (
            <>
              <div style={{ flex:1, overflow:'auto', padding:18, display:'flex', flexDirection:'column', gap:10 }}>
                {SAMPLE_CHAT.map(m => (
                  <div key={m.id} style={{ alignSelf: m.role==='user'?'flex-end':'flex-start', maxWidth:'88%', padding:'10px 14px', borderRadius:14, background: m.role==='user'?accent:'#f3efe5', color: m.role==='user'?'#faf8f4':'#1a1a1a', fontSize:13, lineHeight:1.5 }}>
                    {m.content}
                  </div>
                ))}
              </div>
              <div style={{ padding:14, borderTop:'1px solid #e8e1cf', display:'flex', gap:6 }}>
                <input className="atl-input" placeholder="Make the headline tighter…" />
                <button className="atl-btn-pri atl-btn"><Icon.send size={13}/></button>
              </div>
            </>
          )}
          {drawer === 'style' && (
            <div style={{ padding:18, overflow:'auto' }}>
              <div className="atl-label">Direction</div>
              <textarea className="atl-ta" rows={4} defaultValue="Editorial spread, generous whitespace, Fraunces serif, muted earth palette." />
              <div style={{ height:14 }} />
              <div className="atl-label">Avoid</div>
              <input className="atl-input" defaultValue="cartoon, neon, clip art" />
              <div style={{ height:14 }} />
              <div className="atl-label">Aspect</div>
              <div style={{ display:'flex', gap:6 }}>
                {['16:9','4:3','9:16'].map((ar,i)=>(<button key={ar} className="atl-btn" style={{ flex:1, ...(i===0?{background:accent,color:'#fff',borderColor:accent}:{}) }}>{ar}</button>))}
              </div>
              <div style={{ height:14 }} />
              <div className="atl-label">Templates</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {SAMPLE_TEMPLATES.map((t,i)=>(<div key={t.id} style={{ aspectRatio:'16/10', borderRadius:6, border:`1px solid ${i===0?accent:'#e8e1cf'}`, background:t.isBlank?'#faf8f4':t.bg, cursor:'pointer' }}/>))}
              </div>
              <button className="atl-btn-pri atl-btn" style={{ width:'100%', marginTop:14, justifyContent:'center' }}><Icon.sparkles size={13}/> Apply to deck</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ROUTER (used in the prototype's home → workspace flow) ────────
function AtelierProto({ tweaks = {}, startView = 'home' }) {
  const accent = tweaks.accent || '#1a3a3a';
  const density = tweaks.density || 'comfortable';
  const [view, setView] = useStateB(startView);
  const [activeProject, setActiveProject] = useStateB(SAMPLE_PROJECTS[0]);

  if (view === 'home') return <AtelierHome accent={accent} density={density} onNew={()=>setView('gallery')} onOpenProject={p=>{setActiveProject(p); setView('workspace');}} />;
  if (view === 'home-empty') return <AtelierHome accent={accent} density={density} empty onNew={()=>setView('gallery')} />;
  if (view === 'gallery') return <AtelierGallery accent={accent} onBack={()=>setView('home')} onPick={()=>setView('generating')} />;
  if (view === 'generating') return <AtelierGenerating accent={accent} onDone={()=>setView('workspace')} />;
  if (view === 'export') return <AtelierExport accent={accent} onClose={()=>setView('workspace')} />;
  // workspace
  return <AtelierWorkspace accent={accent} density={density} activeProject={activeProject} onHome={()=>setView('home')} onGallery={()=>setView('gallery')} onExport={()=>setView('export')} />;
}

window.AtelierProto = AtelierProto;
window.AtelierHome = AtelierHome;
window.AtelierGallery = AtelierGallery;
window.AtelierGenerating = AtelierGenerating;
window.AtelierWorkspace = AtelierWorkspace;
window.AtelierExport = AtelierExport;
