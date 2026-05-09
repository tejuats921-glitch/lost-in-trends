export default function Home() {
  return (
    <main
      style={{
        background: "black",
        color: "white",
        minHeight: "100vh",
        padding: "40px",
      }}
    >
      <h1 style={{ fontSize: "48px", fontWeight: "bold" }}>
        🔥 LOST IN TRENDS
      </h1>

      <p style={{ marginTop: "20px", fontSize: "20px" }}>
        Turn Trending News Into Cinematic AI Visuals Instantly.
      </p>

      <button
        style={{
          marginTop: "30px",
          background: "red",
          color: "white",
          padding: "15px 30px",
          borderRadius: "10px",
          border: "none",
          fontSize: "18px",
        }}
      >
        Generate Viral Pack
      </button>
    </main>
  );
}