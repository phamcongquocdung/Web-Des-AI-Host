export default function Sidebar() {
  const tools = [
    "👆",
    "🔄",
    "🔁",
    "✋",
    "🪄",
    "⭮",
    "💧",
    "🦾",
    "🧲",
    "🌀",
    "↩️",
  ];

  return (
    <div className="sidebar">
      {tools.map((icon, idx) => (
        <button key={idx} className="tool-btn">
          {icon}
        </button>
      ))}
    </div>
  );
}
