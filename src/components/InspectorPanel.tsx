// ✅ InspectorPanel.tsx - hiển thị đầy đủ 4 nhóm thông số mọi lúc

import React from "react";

interface Props {
  activeTool: string;
  selectedModel: any;
  onChange: (field: string, axis: string, value: number) => void;
  showGrid: boolean;
  setShowGrid: (val: boolean) => void;
  placeOnFloor: () => void;
}

export default function InspectorPanel({
  selectedModel,
  onChange,
  showGrid,
  setShowGrid,
  placeOnFloor,
}: Props) {
  const renderVectorControls = (field: "position" | "rotation" | "scale") => {
    const step = field === "rotation" ? 1 : field === "scale" ? 0.1 : 0.1;
    return (
      <div className="field-group" style={{ display: "flex", gap: 8 }}>
        {(["x", "y", "z"] as const).map((axis) => (
          <label
            key={axis}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.8em", color: "#aaa" }}>
              {axis.toUpperCase()}
            </span>
            <input
              type="number"
              step={step}
              value={selectedModel ? selectedModel[field][axis].toFixed(2) : 0}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) onChange(field, axis, value);
              }}
              className="no-spin"
              style={{
                width: 50,
                padding: 4,
                background: "#1e1e1e",
                color: "#f4d35e",
                border: "1px solid #444",
              }}
            />
          </label>
        ))}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      <h2 style={{ margin: "0 0 10px" }}>PROPERTIES</h2>

      <h4 style={{ margin: "0 0 3px" }}>Position</h4>
      {renderVectorControls("position")}

      <h4 style={{ margin: "16px 0 3px" }}>Rotation</h4>
      {renderVectorControls("rotation")}

      <h4 style={{ margin: "16px 0 3px" }}>Scale</h4>
      {renderVectorControls("scale")}

      <h4 style={{ margin: "16px 0 3px" }}>Floor Options</h4>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
          lineHeight: 1,
        }}
      >
        <input
          type="checkbox"
          checked={showGrid}
          onChange={(e) => setShowGrid(e.target.checked)}
          className="gold-checkbox"
        />
        <span>Hiện mặt lưới sàn</span>
      </label>
    </div>
  );
}
