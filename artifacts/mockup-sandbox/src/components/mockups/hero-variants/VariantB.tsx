const glowMulti = {
  textShadow: `
    0 0 10px rgba(255, 80, 180, 0.9),
    0 0 28px rgba(255, 80, 180, 0.55),
    0 0 70px rgba(255, 80, 180, 0.2),
    0 0 10px rgba(57, 255, 100, 0.9),
    0 0 28px rgba(57, 255, 100, 0.55),
    0 0 70px rgba(57, 255, 100, 0.2)
  `,
};

const glowPurple = {
  textShadow: `
    0 0 8px rgba(196, 84, 255, 0.95),
    0 0 22px rgba(196, 84, 255, 0.6),
    0 0 60px rgba(196, 84, 255, 0.25)
  `,
};

const songs = [
  { title: "Don't Stop Believin'", artist: "Journey", genre: "classic rock", spotify: true },
  { title: "Livin' on a Prayer", artist: "Bon Jovi", genre: "rock", spotify: true },
  { title: "Sweet Caroline", artist: "Neil Diamond", genre: "pop", spotify: false },
  { title: "Bohemian Rhapsody", artist: "Queen", genre: "rock", spotify: true },
];

export function VariantB() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#070710",
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Deep layered background atmosphere */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)",
          width: 500, height: 400,
          background: "radial-gradient(ellipse, rgba(140,40,255,0.18) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", top: 20, left: "20%",
          width: 200, height: 200,
          background: "radial-gradient(ellipse, rgba(255,80,180,0.08) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", top: 40, right: "15%",
          width: 200, height: 200,
          background: "radial-gradient(ellipse, rgba(57,255,100,0.07) 0%, transparent 70%)",
        }} />
      </div>

      {/* Sparkle dots */}
      {[
        { top: 24, left: "12%", color: "rgba(255,80,180,0.6)", size: 3 },
        { top: 60, left: "85%", color: "rgba(57,255,100,0.6)", size: 2 },
        { top: 100, left: "8%", color: "rgba(196,84,255,0.5)", size: 2 },
        { top: 44, left: "72%", color: "rgba(255,80,180,0.4)", size: 2 },
        { top: 130, left: "90%", color: "rgba(57,255,100,0.4)", size: 3 },
        { top: 18, left: "55%", color: "rgba(196,84,255,0.5)", size: 2 },
      ].map((dot, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            borderRadius: "50%",
            background: dot.color,
            boxShadow: `0 0 6px ${dot.color}`,
            zIndex: 1,
          }}
        />
      ))}

      {/* Hero */}
      <header
        style={{
          position: "relative",
          zIndex: 2,
          padding: "52px 20px 24px",
          textAlign: "center",
        }}
      >
        {/* Halo bloom behind title */}
        <div style={{
          position: "absolute",
          top: 30,
          left: "50%",
          transform: "translateX(-50%)",
          width: 280,
          height: 120,
          background: "radial-gradient(ellipse, rgba(196,84,255,0.14) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Title */}
        <h1 style={{ margin: 0, lineHeight: 1.08, position: "relative" }}>
          <span
            style={{
              display: "block",
              fontSize: 44,
              fontWeight: 900,
              letterSpacing: "-0.015em",
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
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "rgba(196, 84, 255, 1)",
              fontFamily: "'Oswald', 'Impact', sans-serif",
              marginTop: 4,
              textTransform: "uppercase",
              ...glowPurple,
            }}
          >
            Live Band Karaoke
          </span>
        </h1>

        {/* Tagline with flanking lines */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginTop: 14 }}>
          <div style={{ height: 1, width: 40, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.2))" }} />
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            We're the Band, You're the Star
          </p>
          <div style={{ height: 1, width: 40, background: "linear-gradient(to left, transparent, rgba(255,255,255,0.2))" }} />
        </div>

        {/* Action pills — two rows for breathing room */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { label: "🎸 Guest Guitarist", color: "rgba(196,84,255,0.12)", border: "rgba(196,84,255,0.4)", text: "rgba(196,84,255,1)", glow: "0 0 12px rgba(196,84,255,0.3)" },
              { label: "💚 Tip the Band!", color: "rgba(57,255,100,0.08)", border: "rgba(57,255,100,0.35)", text: "rgba(57,255,100,0.9)", glow: "0 0 12px rgba(57,255,100,0.2)" },
              { label: "📲 Share", color: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.14)", text: "rgba(255,255,255,0.65)", glow: "none" },
              { label: "📖 Song Book", color: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.14)", text: "rgba(255,255,255,0.65)", glow: "none" },
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
                  padding: "7px 15px",
                  cursor: "pointer",
                  boxShadow: btn.glow,
                  letterSpacing: "0.01em",
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Search + songs */}
      <div style={{ padding: "0 16px 24px", position: "relative", zIndex: 2 }}>
        {/* Search */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 16,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.35)" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 14 }}>Search artist or song…</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {["All Artists", "All Genres"].map((f) => (
            <div
              key={f}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "9px 12px",
                fontSize: 13,
                color: "rgba(255,255,255,0.35)",
              }}
            >
              {f}
            </div>
          ))}
        </div>

        {/* Count row */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 2px 8px", fontSize: 13 }}>
          <span style={{ color: "rgba(255,255,255,0.38)" }}>121 songs</span>
          <span style={{ color: "rgba(196,84,255,1)", fontWeight: 700 }}>0 / 3 selected</span>
        </div>

        {/* Song cards — setlist style */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {songs.map((s, i) => (
            <div
              key={s.title}
              style={{
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", minWidth: 18 }}>{i + 1}.</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>🎵 {s.artist}</span>
                  <span style={{ fontSize: 10, background: "rgba(255,255,255,0.07)", borderRadius: 4, padding: "1px 6px", color: "rgba(255,255,255,0.3)" }}>{s.genre}</span>
                  {s.spotify && (
                    <span style={{ fontSize: 10, background: "rgba(29,185,84,0.15)", border: "1px solid rgba(29,185,84,0.3)", borderRadius: 4, padding: "1px 6px", color: "rgba(29,185,84,0.9)" }}>
                      ▶ Preview
                    </span>
                  )}
                </div>
              </div>
              <button
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 18,
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
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
