// Shared mock data + helpers for all 3 directions.

const SAMPLE_SLIDES = [
  {
    id: 's1',
    title: 'Q3 Investor Brief',
    subtitle: 'Building the future of compute',
    bullets: ['Revenue +47% YoY', '12 new enterprise logos', 'Path to profitability Q1'],
    prompt: 'Title slide with bold geometric pattern, navy gradient background, white serif typography',
    notes: "Open by thanking the room, then frame this as our strongest quarter on record. Hold for two beats before clicking through.",
    bg: 'linear-gradient(135deg, #0b2447 0%, #19376d 60%, #576cbc 100%)',
    accent: '#a5d7e8',
  },
  {
    id: 's2',
    title: 'The Market is Shifting',
    subtitle: '$84B opportunity by 2027',
    bullets: ['AI infra spend doubling', 'Margins compressing', 'Consolidation accelerating'],
    prompt: 'Editorial spread with abstract graph rising into the distance, muted teal palette, lots of whitespace',
    notes: "Don't read the bullets — pause on the $84B number. The room should feel the magnitude.",
    bg: 'linear-gradient(160deg, #f5f1eb 0%, #e8dfd1 100%)',
    accent: '#1a3a3a',
  },
  {
    id: 's3',
    title: 'Our Edge',
    subtitle: 'Three reasons we win',
    bullets: ['Owned silicon stack', '4× faster training', 'Customer NPS of 71'],
    prompt: 'Three-column comparison layout with iconography, dark background, electric green accent',
    notes: "Walk left to right. Land hard on customer NPS — competitors are in the 30s.",
    bg: 'linear-gradient(135deg, #0a0e0a 0%, #16241c 100%)',
    accent: '#7ee787',
  },
  {
    id: 's4',
    title: 'Customer Story',
    subtitle: 'Helix Robotics — 9 months in',
    bullets: ['$2.1M ARR', 'Replaced 3 vendors', 'Expanded to EU and APAC'],
    prompt: 'Editorial photograph of robotic arm, cinematic lighting, brand mark in lower left',
    notes: "This is the proof point. Pause and let people read the logo wall on the next slide.",
    bg: 'linear-gradient(135deg, #2a1810 0%, #5c3624 60%, #c89665 100%)',
    accent: '#fff4e6',
  },
  {
    id: 's5',
    title: 'The Ask',
    subtitle: '$32M Series B',
    bullets: ['18-month runway', 'Doubles AE headcount', 'Funds GPU pre-buy'],
    prompt: 'Minimal hero number $32M in extra-bold display type, subtle blueprint grid, small footer',
    notes: "Slow down. Say the number, then silence. Let them ask.",
    bg: 'linear-gradient(135deg, #050505 0%, #1a1a2e 100%)',
    accent: '#e94560',
  },
  {
    id: 's6',
    title: 'Roadmap',
    subtitle: 'Through end of FY26',
    bullets: ['Q1 — Inference v3', 'Q2 — Multi-region GA', 'Q3 — Enterprise SSO'],
    prompt: 'Horizontal timeline with quarter markers, dot grid background, two-tone color scheme',
    notes: "Keep this one quick. Anyone deep on roadmap can grab the appendix.",
    bg: 'linear-gradient(135deg, #1f1147 0%, #4b1248 100%)',
    accent: '#ffd166',
  },
];

const SAMPLE_PROJECTS = [
  { id: 'p1', name: 'Series B Pitch — Sequoia', updated: '12m ago', count: '6/8', thumb: SAMPLE_SLIDES[4].bg, accent: SAMPLE_SLIDES[4].accent },
  { id: 'p2', name: 'Q3 All-Hands', updated: '2h ago', count: '14/14', thumb: SAMPLE_SLIDES[0].bg, accent: SAMPLE_SLIDES[0].accent },
  { id: 'p3', name: 'Helix Customer QBR', updated: 'yesterday', count: '9/11', thumb: SAMPLE_SLIDES[3].bg, accent: SAMPLE_SLIDES[3].accent },
  { id: 'p4', name: 'Brand Refresh — Internal', updated: '3d ago', count: '5/12', thumb: SAMPLE_SLIDES[1].bg, accent: SAMPLE_SLIDES[1].accent },
  { id: 'p5', name: 'Roadmap Working Doc', updated: '5d ago', count: '7/7', thumb: SAMPLE_SLIDES[5].bg, accent: SAMPLE_SLIDES[5].accent },
  { id: 'p6', name: 'Investor Update — Nov', updated: '2w ago', count: '4/6', thumb: SAMPLE_SLIDES[2].bg, accent: SAMPLE_SLIDES[2].accent },
];

const SAMPLE_TEMPLATES = [
  { id: 't0', name: 'Blank Canvas', isBlank: true },
  { id: 't1', name: 'Editorial Serif', bg: 'linear-gradient(135deg, #f5f1eb, #e8dfd1)', accent: '#1a3a3a' },
  { id: 't2', name: 'Tech Blueprint', bg: 'linear-gradient(135deg, #070b14, #19376d)', accent: '#00d4ff' },
  { id: 't3', name: 'Bold Display', bg: 'linear-gradient(135deg, #050505, #1a1a2e)', accent: '#e94560' },
];

const SAMPLE_CHAT = [
  { id: 'c1', role: 'user', content: 'Make the headline feel more confident — heavier weight and tighter tracking.' },
  { id: 'c2', role: 'assistant', content: 'Increased to 900 weight at -2% tracking. Want me to push the subhead bigger too?' },
];

// Render a faux slide preview as a div (no AI calls).
function FauxSlide({ slide, scale = 1, showText = true, style }) {
  const s = slide || SAMPLE_SLIDES[0];
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: s.bg, color: s.accent, ...style,
    }}>
      {/* Decorative grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.08,
        backgroundImage: `linear-gradient(${s.accent} 1px, transparent 1px), linear-gradient(90deg, ${s.accent} 1px, transparent 1px)`,
        backgroundSize: `${40*scale}px ${40*scale}px`,
      }} />
      {showText && (
        <div style={{ position: 'absolute', inset: 0, padding: 40*scale, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: 11*scale, letterSpacing: 4*scale, textTransform: 'uppercase', opacity: 0.6, marginBottom: 12*scale, fontFamily: 'ui-monospace, monospace' }}>
            {s.subtitle}
          </div>
          <div style={{ fontSize: 44*scale, fontWeight: 700, letterSpacing: -1*scale, lineHeight: 1.05, marginBottom: 16*scale, fontFamily: '"Fraunces", "Georgia", serif' }}>
            {s.title}
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6*scale }}>
            {(s.bullets || []).map((b, i) => (
              <li key={i} style={{ fontSize: 14*scale, opacity: 0.85, display: 'flex', gap: 10*scale, alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'ui-monospace, monospace', opacity: 0.5 }}>{String(i+1).padStart(2,'0')}</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Tiny svg icons to avoid pulling lucide.
const Icon = {
  plus: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  sparkles: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 3l1.6 4.4L15 9l-4.4 1.6L9 15l-1.6-4.4L3 9l4.4-1.6z"/><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/></svg>,
  send: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>,
  image: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>,
  download: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>,
  search: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>,
  chat: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  layers: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  upload: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></svg>,
  trash: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>,
  grip: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><circle cx="9" cy="6" r=".5" fill="currentColor"/><circle cx="9" cy="12" r=".5" fill="currentColor"/><circle cx="9" cy="18" r=".5" fill="currentColor"/><circle cx="15" cy="6" r=".5" fill="currentColor"/><circle cx="15" cy="12" r=".5" fill="currentColor"/><circle cx="15" cy="18" r=".5" fill="currentColor"/></svg>,
  check: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6L9 17l-5-5"/></svg>,
  arrow: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  back: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  dollar: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>,
  wand: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M15 9h0M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5"/></svg>,
  more: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="6" cy="12" r="1.5" fill="currentColor"/><circle cx="18" cy="12" r="1.5" fill="currentColor"/></svg>,
  close: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M18 6L6 18M6 6l12 12"/></svg>,
  pencil: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4z"/></svg>,
  copy: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
};

window.SAMPLE_SLIDES = SAMPLE_SLIDES;
window.SAMPLE_PROJECTS = SAMPLE_PROJECTS;
window.SAMPLE_TEMPLATES = SAMPLE_TEMPLATES;
window.SAMPLE_CHAT = SAMPLE_CHAT;
window.FauxSlide = FauxSlide;
window.Icon = Icon;
