import { useState, useEffect } from 'react';

const FEATURES = [
  { icon: '📅', title: 'Orario Settimanale', desc: 'Visualizza tutte le materie in una griglia chiara, personalizzata per i tuoi giorni e ore.' },
  { icon: '📝', title: 'Note per Lezione', desc: 'Aggiungi promemoria e note a ogni singola ora. Vengono eliminate automaticamente dopo la data.' },
  { icon: '🔄', title: 'Supplenze', desc: 'Registra le supplenze con nome del prof e data. Visibili direttamente nella cella.' },
  { icon: '🏖️', title: 'Vacanze', desc: 'Imposta periodi di vacanza con nome e colore. Ogni giorno in vacanza viene evidenziato.' },
  { icon: '🎨', title: 'Colori & Temi', desc: 'Personalizza ogni materia con un colore. Tema chiaro o scuro a tua scelta.' },
  { icon: '📤', title: 'Condivisione', desc: 'Genera un link sola lettura per condividere il tuo orario con chiunque, senza account.' },
];

const STEPS = [
  { n: '01', title: 'Crea l\'account', desc: 'Registrati in 30 secondi. Solo username, email e password.' },
  { n: '02', title: 'Configura l\'orario', desc: 'Scegli i giorni e il numero di ore massime. Si fa una volta sola.' },
  { n: '03', title: 'Riempi le materie', desc: 'Clicca su ogni cella e aggiungi la materia con il colore che preferisci.' },
];

// Mini mockup cell
function MockCell({ color, label, delay, hasNote }) {
  return (
    <div style={{
      background: color || 'var(--mock-bg)',
      borderRadius: 4,
      padding: '6px 4px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      minHeight: 52,
      animation: `fadeInUp 0.4s ease ${delay}s both`,
      border: color ? 'none' : '1px solid rgba(255,255,255,0.08)',
    }}>
      {label && (
        <span style={{ fontSize: 9, fontWeight: 700, color: 'white',
          textAlign: 'center', opacity: 0.95, lineHeight: 1.2,
          textShadow: '0 1px 3px rgba(0,0,0,0.4)', padding: '0 2px' }}>
          {label}
        </span>
      )}
      {hasNote && (
        <span style={{ fontSize: 8, background: 'rgba(0,0,0,0.25)',
          borderRadius: 2, padding: '1px 3px', color: 'white', fontFamily: 'monospace' }}>
          2n
        </span>
      )}
    </div>
  );
}

function AppMockup() {
  const days = ['LUN', 'MAR', 'MER', 'GIO', 'VEN'];
  const rows = [
    ['#2563eb', '#7c3aed', '#16a34a', '#dc2626', '#ea580c'],
    ['#2563eb', '#7c3aed', '#ca8a04', '#dc2626', '#ea580c'],
    ['#0d9488', '#db2777', '#16a34a', null, '#ea580c'],
    ['#0d9488', '#db2777', '#ca8a04', '#dc2626', null],
    ['#2563eb', null, '#16a34a', '#dc2626', '#ea580c'],
    ['#2563eb', '#7c3aed', '#ca8a04', null, '#ea580c'],
  ];
  const labels = [
    ['Mat', 'Ita', 'Fis', 'Geo', 'Sto'],
    ['Mat', 'Ita', 'Lat', 'Geo', 'Sto'],
    ['Sci', 'Art', 'Fis', '', 'Sto'],
    ['Sci', 'Art', 'Lat', 'Geo', ''],
    ['Mat', '', 'Fis', 'Geo', 'Sto'],
    ['Mat', 'Ita', 'Lat', '', 'Sto'],
  ];

  return (
    <div style={{
      background: '#1e293b',
      borderRadius: 12,
      padding: 12,
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      maxWidth: 340,
      width: '100%',
    }}>
      {/* Mock header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.1em' }}>ORARIO</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['#ef4444','#f59e0b','#22c55e'].map((c,i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
          ))}
        </div>
      </div>
      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '20px repeat(5, 1fr)',
        gap: 2,
      }}>
        {/* Header */}
        <div />
        {days.map((d, i) => (
          <div key={d} style={{
            background: i === 1 ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
            borderRadius: 3, padding: '4px 2px', textAlign: 'center',
            border: i === 1 ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: 8, fontFamily: 'monospace', fontWeight: 700,
              color: i === 1 ? '#a78bfa' : 'rgba(255,255,255,0.5)' }}>{d}</span>
          </div>
        ))}
        {/* Rows */}
        {rows.map((row, ri) => (
          <>
            <div key={`h${ri}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.04)', borderRadius: 3 }}>
              <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)',
                fontWeight: 700 }}>{ri + 1}</span>
            </div>
            {row.map((color, ci) => (
              <MockCell key={`${ri}-${ci}`} color={color}
                label={labels[ri][ci]}
                delay={0.05 * (ri * 5 + ci)}
                hasNote={ri === 0 && ci === 0} />
            ))}
          </>
        ))}
      </div>
      {/* Mock stats */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, paddingTop: 8,
        borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {[['5','giorni'],['28','ore'],['8','materie']].map(([v,l]) => (
          <div key={l} style={{ display: 'flex', gap: 3, alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>{v}</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage({ onGetStarted }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: '#f1f5f9',
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59,130,246,0.3); }
          50% { box-shadow: 0 0 40px rgba(59,130,246,0.6); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        --mock-bg: rgba(255,255,255,0.04);
        
        .landing-btn-primary {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 28px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          animation: pulse-glow 3s ease-in-out infinite;
        }
        .landing-btn-primary:hover { background: #2563eb; transform: translateY(-1px); }
        
        .landing-btn-ghost {
          background: transparent;
          color: #94a3b8;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 12px 28px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .landing-btn-ghost:hover { border-color: #94a3b8; color: #f1f5f9; }
        
        .feature-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 24px;
          transition: all 0.2s;
        }
        .feature-card:hover {
          border-color: #3b82f6;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(59,130,246,0.1);
        }
        
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .hero-mockup { display: none !important; }
        }
      `}</style>

      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: '0 24px',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(15,23,42,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid #1e293b' : 'none',
        transition: 'all 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>📚</span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12,
            fontWeight: 600, color: '#f1f5f9', letterSpacing: '0.08em' }}>
            ORARIO SCOLASTICO
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="landing-btn-ghost" onClick={onGetStarted}
            style={{ padding: '8px 20px', fontSize: 14 }}>
            Accedi
          </button>
          <button className="landing-btn-primary" onClick={onGetStarted}
            style={{ padding: '8px 20px', fontSize: 14, animation: 'none' }}>
            Inizia gratis
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '80px 24px 60px', maxWidth: 1100, margin: '0 auto' }}>
        <div className="hero-grid" style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 60, alignItems: 'center'
        }}>
          <div style={{ animation: 'slideIn 0.6s ease both' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
              color: '#3b82f6', letterSpacing: '0.15em', marginBottom: 16,
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 4, padding: '4px 10px', display: 'inline-block' }}>
              IL TUO ORARIO DIGITALE
            </div>
            <h1 style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.15,
              marginBottom: 20, color: '#f8fafc' }}>
              Organizza il tuo{' '}
              <span style={{ color: '#3b82f6', display: 'inline-block' }}>
                anno scolastico
              </span>
            </h1>
            <p style={{ fontSize: 17, color: '#94a3b8', lineHeight: 1.7, marginBottom: 32 }}>
              Materie, supplenze, note, vacanze — tutto in un'app web gratuita, 
              accessibile da smartphone e computer senza installare nulla.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="landing-btn-primary" onClick={onGetStarted} style={{ fontSize: 16, padding: '14px 32px' }}>
                Crea il tuo orario →
              </button>
              <button className="landing-btn-ghost" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                style={{ fontSize: 15 }}>
                Scopri le funzioni
              </button>
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 32, paddingTop: 24,
              borderTop: '1px solid #1e293b' }}>
              {[['Gratuito', '100%'], ['Nessuna', 'installazione'], ['Sempre', 'sincronizzato']].map(([a,b]) => (
                <div key={a}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
                    fontWeight: 700, color: '#3b82f6' }}>{a}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{b}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-mockup" style={{ display: 'flex', justifyContent: 'center',
            animation: 'float 4s ease-in-out infinite' }}>
            <AppMockup />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
            color: '#3b82f6', letterSpacing: '0.12em', marginBottom: 12 }}>FUNZIONALITÀ</div>
          <h2 style={{ fontSize: 32, fontWeight: 700, color: '#f1f5f9' }}>
            Tutto quello che ti serve
          </h2>
        </div>
        <div className="features-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16
        }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} className="feature-card"
              style={{ animation: `fadeInUp 0.4s ease ${i * 0.08}s both` }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '60px 24px', background: '#0d1526', borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
              color: '#3b82f6', letterSpacing: '0.12em', marginBottom: 12 }}>COME FUNZIONA</div>
            <h2 style={{ fontSize: 32, fontWeight: 700, color: '#f1f5f9' }}>
              Pronto in 2 minuti
            </h2>
          </div>
          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {STEPS.map((s, i) => (
              <div key={s.n} style={{ textAlign: 'center', animation: `fadeInUp 0.5s ease ${i * 0.15}s both` }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 36,
                  fontWeight: 700, color: 'rgba(59,130,246,0.15)', marginBottom: 12, lineHeight: 1 }}>
                  {s.n}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download section */}
      <section id="download" style={{ padding: '60px 24px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
          color: '#94a3b8', letterSpacing: '0.12em', marginBottom: 12 }}>PROSSIMAMENTE</div>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>
          App Desktop & Mobile
        </h2>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 32, lineHeight: 1.7, maxWidth: 500, margin: '0 auto 32px' }}>
          Stiamo sviluppando app native per Linux, Windows e smartphone.
          Iscriviti per essere avvisato al lancio.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { icon: '🐧', label: 'Linux (Fedora)', soon: true },
            { icon: '🪟', label: 'Windows', soon: true },
            { icon: '📱', label: 'iOS & Android', soon: true },
          ].map(app => (
            <div key={app.label} style={{
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: 8, padding: '14px 20px',
              display: 'flex', alignItems: 'center', gap: 10,
              opacity: 0.7,
            }}>
              <span style={{ fontSize: 20 }}>{app.icon}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{app.label}</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
                  color: '#f59e0b', letterSpacing: '0.08em' }}>COMING SOON</div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#475569' }}>
          Nel frattempo, l'app web funziona perfettamente su tutti i dispositivi.
        </p>
      </section>

      {/* CTA finale */}
      <section style={{ padding: '60px 24px', background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
        borderTop: '1px solid #1e293b', textAlign: 'center' }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>
          Inizia adesso, è gratis
        </h2>
        <p style={{ fontSize: 15, color: '#64748b', marginBottom: 28 }}>
          Nessuna carta di credito. Nessuna pubblicità. Solo il tuo orario.
        </p>
        <button className="landing-btn-primary" onClick={onGetStarted} style={{ fontSize: 16, padding: '14px 40px' }}>
          Crea account gratuito →
        </button>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px', borderTop: '1px solid #1e293b',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📚</span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
            color: '#475569', letterSpacing: '0.08em' }}>ORARIO SCOLASTICO</span>
        </div>
        <span style={{ fontSize: 12, color: '#475569' }}>
          Fatto con ❤️ per gli studenti
        </span>
      </footer>
    </div>
  );
}