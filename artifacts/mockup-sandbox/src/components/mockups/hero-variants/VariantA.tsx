const glowMulti = {
  textShadow: `
    0 0 6px rgba(255, 80, 180, 0.95),
    0 0 18px rgba(255, 80, 180, 0.7),
    0 0 40px rgba(255, 80, 180, 0.35),
    0 0 6px rgba(57, 255, 100, 0.95),
    0 0 18px rgba(57, 255, 100, 0.7),
    0 0 40px rgba(57, 255, 100, 0.35)
  `,
};

const glowPurple = {
  textShadow: `
    0 0 10px rgba(196, 84, 255, 0.9),
    0 0 25px rgba(196, 84, 255, 0.55),
    0 0 55px rgba(196, 84, 255, 0.25)
  `,
};

const songs = [
  { title: "Don't Stop Believin'", artist: "Journey", genre: "classic rock" },
  { title: "Livin' on a Prayer", artist: "Bon Jovi", genre: "rock" },
  { title: "Sweet Caroline", artist: "Neil Diamond", genre: "pop" },
  { title: "Bohemian Rhapsody", artist: "Queen", genre: "rock" },
];

export function VariantA() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background: tight vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(140,60,255,0.13) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Hero */}
      <header
        style={{
          position: "relative",
          zIndex: 1,
          padding: "48px 20px 28px",
          textAlign: "center",
        }}
      >
        {/* Decorative rule above */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(196,84,255,0.4))" }} />
          <span style={{ fontSize: 10, letterSpacing: "0.25em", color: "rgba(196,84,255,0.7)", textTransform: "uppercase", fontWeight: 700 }}>
            Live Every Night
          </span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(196,84,255,0.4))" }} />
        </div>

        {/* Title */}
        <h1 style={{ margin: 0, lineHeight: 1.05 }}>
          <span
            style={{
              display: "block",
              fontSize: 46,
              fontWeight: 900,
              letterSpacing: "-0.01em",
              color: "#fff",
              fontFamily: "'Oswald', 'Impact', sans-serif",
              ...glowMulti,
            }}
          >
            Guilty Pleasures
          </span>
          <span
            style={{
              display: "block",
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: "0.04em",
              color: "rgba(196, 84, 255, 1)",
              fontFamily: "'Oswald', 'Impact', sans-serif",
              marginTop: 2,
              ...glowPurple,
            }}
          >
            LIVE BAND KARAOKE
          </span>
        </h1>

        <p
          style={{
            marginTop: 10,
            fontSize: 15,
            color: "rgba(255,255,255,0.5)",
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        >
          We're the Band, You're the Star!
        </p>

        {/* Decorative rule below */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginTop: 18 }}>
          <div style={{ flex: 1, maxWidth: 60, height: 1, background: "linear-gradient(to right, transparent, rgba(57,255,100,0.35))" }} />
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(57,255,100,0.6)" }} />
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,80,180,0.6)" }} />
          <div style={{ flex: 1, maxWidth: 60, height: 1, background: "linear-gradient(to left, transparent, rgba(255,80,180,0.35))" }} />
        </div>

        {/* Action pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 18 }}>
          {[
            { label: "🎸 Guest Guitarist", color: "rgba(196,84,255,0.15)", border: "rgba(196,84,255,0.35)", text: "rgba(196,84,255,1)" },
            { label: "💚 Tip the Band!", color: "rgba(57,255,100,0.1)", border: "rgba(57,255,100,0.3)", text: "rgba(57,255,100,0.9)" },
            { label: "📲 Share", color: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.18)", text: "rgba(255,255,255,0.7)" },
            { label: "📖 Song Book", color: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.18)", text: "rgba(255,255,255,0.7)" },
          ].map((btn) => (
            <button
              key={btn.label}
              style={{
                background: btn.color,
                border: `1px solid ${btn.border}`,
                borderRadius: 999,
                color: btn.text,
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 14px",
                cursor: "pointer",
                letterSpacing: "0.01em",
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </header>

      {/* Search */}
      <div style={{ padding: "0 16px 16px", position: "relative", zIndex: 1 }}>
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14,
            padding: "11px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Search artist or song…</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {["All Artists", "All Genres"].map((f) => (
            <div
              key={f}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "9px 12px",
                fontSize: 13,
                color: "rgba(255,255,255,0.4)",
              }}
            >
              {f}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 2px 8px", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          <span>121 songs</span>
          <span style={{ color: "rgba(196,84,255,1)", fontWeight: 700 }}>0/3 selected</span>
        </div>

        {/* Song cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {songs.map((s) => (
            <div
              key={s.title}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderLeft: "3px solid rgba(196,84,255,0.4)",
                borderRadius: 12,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                  🎵 {s.artist} · <span style={{ color: "rgba(255,255,255,0.3)" }}>{s.genre}</span>
                </div>
              </div>
              <button
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(196,84,255,0.12)",
                  border: "1px solid rgba(196,84,255,0.25)",
                  color: "rgba(196,84,255,0.8)",
                  fontSize: 20,
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
