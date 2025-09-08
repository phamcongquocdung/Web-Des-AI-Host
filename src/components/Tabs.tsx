import React, { useState } from "react";

export default function Tabs({
  tabs,
}: {
  tabs: { label: string; content: JSX.Element }[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div>
      {/* Thanh Tab */}
      <div style={{ display: "flex", borderBottom: "1px solid #444" }}>
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            style={{
              padding: "8px 16px",
              background: index === activeIndex ? "#333" : "transparent",
              color: "#f4d35e",
              borderRadius: "6px",
              border: "none",
              borderBottom:
                index === activeIndex
                  ? "2px solid #f4d35e"
                  : "2px solid transparent",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Nội dung Tab */}
      <div style={{ padding: "10px" }}>{tabs[activeIndex].content}</div>
    </div>
  );
}
