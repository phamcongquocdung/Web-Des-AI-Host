// ✅ ModelEditor.tsx — Multi-select KHÔNG auto-switch tool, giữ “khung vàng” liên tục
// + selectionGroup tạm để gom các object khi multi-select (giữ đến khi chọn khác)
// + Scale/Rotate: khi kéo dùng Local, thả về World (y như trước)

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import ModelWrapper from "./ModelWrapper";
import { PreviewFollower } from "./PreviewFollower";
import { modelsList } from "../modelsList";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import FileIOController from "../controllers/FileIOController";
import { ModelController } from "../controllers/ModelController";
import InspectorPanel from "./InspectorPanel";
import * as THREE from "three";
import sutu from "../assets/sutu.jpg";

type Tool = "select" | "translate" | "scale" | "rotate" | "floor";

function ThreeRefs({
  onReady,
}: {
  onReady: (ctx: {
    camera: THREE.Camera;
    size: { width: number; height: number };
    scene: THREE.Scene;
  }) => void;
}) {
  const { camera, size, scene } = useThree();
  useEffect(
    () => void onReady({ camera, size, scene }),
    [camera, size, scene, onReady]
  );
  return null;
}

export default function ModelEditor() {
  const [models, setModels] = useState<
    {
      model: THREE.Object3D;
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      scale: { x: number; y: number; z: number };
      name?: string;
    }[]
  >([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedSet, setSelectedSet] = useState<Set<number>>(new Set());

  const [previewModel, setPreviewModel] = useState<THREE.Object3D | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("translate");
  const [showGrid, setShowGrid] = useState(true);
  const [query, setQuery] = useState<string>("");

  // kiểm soát “space” cho TransformControls
  const [gizmoSpace, setGizmoSpace] = useState<"world" | "local">("world");

  const transformRef = useRef<any>(null);
  const orbitRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const sizeRef = useRef<{ width: number; height: number } | null>(null);

  const canvasShellRef = useRef<HTMLDivElement | null>(null);

  // Selection box (local theo container)
  const [isSelecting, setIsSelecting] = useState(false);
  const [selStart, setSelStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [selEnd, setSelEnd] = useState<{ x: number; y: number } | null>(null);

  // Group tạm để “lên khung” khi multi-select
  const selectionGroupRef = useRef<THREE.Group | null>(null);

  const normalizeVN = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const filteredList = useMemo(() => {
    const q = normalizeVN(query);
    if (!q) return modelsList;
    return modelsList.filter((m) => normalizeVN(m.name).includes(q));
  }, [query]);

  // Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete") {
        teardownSelectionGroup(); // trả con về scene trước khi xóa
        if (selectedSet.size > 0) {
          setModels((prev) => prev.filter((_, i) => !selectedSet.has(i)));
          setSelectedSet(new Set());
          setSelectedIndex(null);
        } else if (selectedIndex !== null) {
          setModels((prev) => ModelController.delete(prev, selectedIndex));
          setSelectedIndex(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, selectedSet]);

  // Drag từ sidebar
  const handleDragStart = (url: string) => {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      const model = gltf.scene;
      model.scale.set(0.01, 0.01, 0.01);
      setPreviewModel(model);
    });
  };

  // Drop vào canvas
  const handleMouseUp = () => {
    if (previewModel) {
      teardownSelectionGroup();
      const clone = previewModel.clone(true);
      const rot = clone.rotation;
      const scale = clone.scale;
      setModels((prev) => [
        ...prev,
        {
          model: clone,
          position: {
            x: clone.position.x,
            y: clone.position.y,
            z: clone.position.z,
          },
          rotation: { x: rot.x, y: rot.y, z: rot.z },
          scale: { x: scale.x, y: scale.y, z: scale.z },
        },
      ]);
      const idx = models.length;
      setSelectedIndex(idx);
      setSelectedSet(new Set([idx]));
      setPreviewModel(null);
      setGizmoSpace("world");
    }
  };

  // File ops
  const importModel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      teardownSelectionGroup();
      const { model } = await FileIOController.importFile(file);
      setModels((prev) => [
        ...prev,
        {
          model,
          position: { x: 0, y: 0.5, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
      ]);
      const idx = models.length;
      setSelectedIndex(idx);
      setSelectedSet(new Set([idx]));
      setGizmoSpace("world");
    } catch (err) {
      console.error("Import error:", err);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const exportGLB = () => {
    if (selectionGroupRef.current && selectedSet.size > 0) {
      const first = [...selectedSet][0];
      FileIOController.exportGLB(models[first].model);
      return;
    }
    if (selectedIndex !== null) {
      FileIOController.exportGLB(models[selectedIndex].model);
    } else if (selectedSet.size === 1) {
      const only = [...selectedSet][0];
      FileIOController.exportGLB(models[only].model);
    }
  };

  // Properties
  const updateModelValue = (field: string, axis: string, value: number) => {
    const i =
      selectedIndex !== null ? selectedIndex : [...selectedSet][0] ?? null;
    if (i === null) return;
    const obj = models[i];
    (obj.model as any)[field][axis] = value;
    setModels((prev) =>
      prev.map((m, idx) =>
        idx === i
          ? { ...m, [field]: { ...(m as any)[field], [axis]: value } }
          : m
      )
    );
  };

  const placeOnFloor = () => {
    const i =
      selectedIndex !== null ? selectedIndex : [...selectedSet][0] ?? null;
    if (i === null) return;
    setModels((prev) => {
      const obj = { ...prev[i] };
      obj.model.position.y = 0;
      obj.position.y = 0;
      return prev.map((m, idx) => (idx === i ? obj : m));
    });
  };

  const handlePickOne = (i: number) => {
    teardownSelectionGroup();
    setSelectedIndex(i);
    setSelectedSet(new Set([i]));
    setGizmoSpace("world");
  };

  // Group / Degroup
  const computeCentroid = (indices: number[]) => {
    const c = new THREE.Vector3();
    if (!indices.length) return c;
    indices.forEach((i) =>
      c.add(models[i].model.getWorldPosition(new THREE.Vector3()))
    );
    return c.multiplyScalar(1 / indices.length);
  };

  const onGroup = () => {
    if (!sceneRef.current) return;
    if (selectedSet.size <= 1) return;
    teardownSelectionGroup();

    const indices = [...selectedSet];
    const centroid = computeCentroid(indices);
    const group = new THREE.Group();
    group.position.copy(centroid);
    sceneRef.current.add(group);

    indices.forEach((i) => {
      group.attach(models[i].model);
    });

    const newEntry = {
      model: group,
      position: {
        x: group.position.x,
        y: group.position.y,
        z: group.position.z,
      },
      rotation: {
        x: group.rotation.x,
        y: group.rotation.y,
        z: group.rotation.z,
      },
      scale: { x: group.scale.x, y: group.scale.y, z: group.scale.z },
      name: "Group",
    };

    const kept = models.filter((_, idx) => !selectedSet.has(idx));
    const next = [...kept, newEntry];

    setModels(next);
    const newIndex = next.length - 1;
    setSelectedIndex(newIndex);
    setSelectedSet(new Set([newIndex]));
    setActiveTool("translate");
    setGizmoSpace("world");
  };

  const onDegroup = () => {
    if (!sceneRef.current) return;
    const i =
      selectedIndex !== null ? selectedIndex : [...selectedSet][0] ?? null;
    if (i === null) return;

    const entry = models[i];
    if (
      !(entry.model instanceof THREE.Group) ||
      entry.model.children.length === 0
    )
      return;

    teardownSelectionGroup();

    const group = entry.model as THREE.Group;
    const childEntries: typeof models = [];
    const children = [...group.children];

    children.forEach((child) => {
      sceneRef.current!.attach(child);
      child.updateMatrixWorld(true);
      childEntries.push({
        model: child,
        position: {
          x: child.position.x,
          y: child.position.y,
          z: child.position.z,
        },
        rotation: {
          x: (child.rotation as any).x,
          y: (child.rotation as any).y,
          z: (child.rotation as any).z,
        },
        scale: { x: child.scale.x, y: child.scale.y, z: child.scale.z },
        name: child.name,
      });
    });

    sceneRef.current.remove(group);
    const next = models.filter((_, idx) => idx !== i).concat(childEntries);

    setModels(next);
    const base = next.length - childEntries.length;
    setSelectedIndex(base);
    setSelectedSet(new Set([base]));
    setGizmoSpace("world");
  };

  const onTransformChange = () => {
    const i =
      selectedIndex !== null ? selectedIndex : [...selectedSet][0] ?? null;
    if (i === null) return;
    const obj = models[i].model;
    setModels((prev) =>
      prev.map((item, idx) =>
        idx === i
          ? {
              ...item,
              position: {
                x: obj.position.x,
                y: obj.position.y,
                z: obj.position.z,
              },
              rotation: {
                x: obj.rotation.x,
                y: obj.rotation.y,
                z: obj.rotation.z,
              },
              scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
            }
          : item
      )
    );
  };

  const toolButtonStyle: React.CSSProperties = {
    backgroundColor: "#222",
    color: "#FFD700",
    border: "1px solid #FFD700",
    borderRadius: 6,
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: 16,
  };

  // Selection box helpers
  const getLocalXY = (e: React.MouseEvent) => {
    const rect = canvasShellRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const beginSelection = (e: React.MouseEvent) => {
    if (activeTool !== "select") return;
    const t = e.target as HTMLElement;
    if (t.closest("button") || t.closest(".inspector")) return;
    if (transformRef.current?.dragging) return;
    const p = getLocalXY(e);
    setIsSelecting(true);
    setSelStart(p);
    setSelEnd(p);
  };

  const updateSelection = (e: React.MouseEvent) => {
    if (activeTool !== "select" || !isSelecting) return;
    setSelEnd(getLocalXY(e));
  };

  const createSelectionGroup = (indices: number[]) => {
    if (!sceneRef.current || indices.length <= 1) return;
    teardownSelectionGroup();
    const centroid = computeCentroid(indices);
    const g = new THREE.Group();
    g.position.copy(centroid);
    sceneRef.current.add(g);
    indices.forEach((i) => g.attach(models[i].model));
    selectionGroupRef.current = g;
  };

  const teardownSelectionGroup = () => {
    const g = selectionGroupRef.current;
    if (!g || !sceneRef.current) return;
    const children = [...g.children];
    children.forEach((ch) => sceneRef.current!.attach(ch));
    sceneRef.current.remove(g);
    selectionGroupRef.current = null;
  };

  const finishSelection = () => {
    if (activeTool !== "select") return;
    if (
      !isSelecting ||
      !cameraRef.current ||
      !sizeRef.current ||
      !selStart ||
      !selEnd
    ) {
      setIsSelecting(false);
      return;
    }
    const cam = cameraRef.current as THREE.PerspectiveCamera;
    const { width, height } = sizeRef.current!;

    const x1 = Math.min(selStart.x, selEnd.x);
    const y1 = Math.min(selStart.y, selEnd.y);
    const x2 = Math.max(selStart.x, selEnd.x);
    const y2 = Math.max(selStart.y, selEnd.y);

    const newly = new Set<number>();
    models.forEach((item, idx) => {
      const wp = new THREE.Vector3();
      item.model.getWorldPosition(wp);
      wp.project(cam);
      const sx = (wp.x * 0.5 + 0.5) * width;
      const sy = (-wp.y * 0.5 + 0.5) * height;
      if (sx >= x1 && sx <= x2 && sy >= y1 && sy <= y2) newly.add(idx);
    });

    setSelectedSet(newly);
    setSelectedIndex(newly.size === 1 ? [...newly][0] : null);
    setGizmoSpace("world");
    setIsSelecting(false);

    // ✅ Giữ nguyên tool = "select" và “lên khung” nếu multi-select
    if (newly.size > 1) {
      createSelectionGroup([...newly]); // giữ group tạm để thấy khung ở cụm
      // KHÔNG auto-switch tool nữa — vẫn ở select để bạn thấy khung vàng liên tục
    } else {
      teardownSelectionGroup();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: "136px 0 0 0",
        display: "flex",
        overflow: "hidden",
      }}
    >
      {/* SIDEBAR */}
      <aside
        className=" scrollable"
        style={{
          width: "fit-content", // ✅ autosize theo nội dung
          minWidth: 240, // (không nhỏ hơn 240)
          padding: 10,
          background: "#111",
          height: "100vh",
          display: "flex",
          flexDirection: "column", // xếp dọc: Search ở trên, list ở dưới
        }}
      >
        {/* Search (không cuộn) */}
        <div style={{ marginBottom: 10 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search model ..."
            style={{
              width: "85%",
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid #333",
              background: "#1b1b1b",
              color: "#f4d35e",
              outline: "none",
            }}
          />
        </div>

        {/* Vùng cuộn cho danh sách */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          <div className="model-grid">
            {(filteredList.length ? filteredList : []).map((item) => (
              <div
                key={item.url + item.name}
                draggable
                onDragStart={() => handleDragStart(item.url)}
                className="model-card"
                style={{ width: "100px" }}
                title={item.name}
              >
                <img src={sutu} alt={item.name} className="model-thumb" />
                <div className="model-label">{item.name}</div>
              </div>
            ))}
            {filteredList.length === 0 && (
              <div
                style={{ color: "#aaa", fontSize: 12, gridColumn: "1 / -1" }}
              >
                Không tìm thấy mô hình phù hợp.
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, position: "relative" }} ref={canvasShellRef}>
        {/* Cột nút công cụ bên trái */}
        <div
          style={{
            position: "absolute",
            top: 80,
            left: 10,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            zIndex: 10,
          }}
        >
          <button
            style={{
              backgroundColor: activeTool === "translate" ? "#333" : "#222",
              width: 50,
              height: 50,
              padding: 0,
              borderRadius: "12px",
              borderColor: "#f4d35e",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Chế độ chọn vùng"
            onClick={() => {
              setActiveTool("select");
              setGizmoSpace("world");
              teardownSelectionGroup(); // bắt đầu chọn mới
            }}
          >
            <img
              src="selection.png" // đổi đường dẫn icon của bạn ở đây
              alt="Translate"
              style={{
                width: "60%",
                height: "60%",
                objectFit: "contain",
                pointerEvents: "none",
              }}
            />
          </button>

          <button
            style={{
              backgroundColor: activeTool === "translate" ? "#333" : "#222",
              width: 50,
              height: 50,
              padding: 0,
              borderRadius: "12px",
              borderColor: "#f4d35e",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => {
              setActiveTool("translate");
              setGizmoSpace("world");
            }}
          >
            <img
              src="move.png" // đổi đường dẫn icon của bạn ở đây
              alt="Translate"
              style={{
                width: "60%",
                height: "60%",
                objectFit: "contain",
                pointerEvents: "none",
              }}
            />
          </button>

          <button
            style={{
              backgroundColor: activeTool === "translate" ? "#333" : "#222",
              width: 50,
              height: 50,
              padding: 0,
              borderRadius: "12px",
              borderColor: "#f4d35e",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => {
              setActiveTool("scale");
              setGizmoSpace("world"); // bắt đầu world, kéo thì local
            }}
          >
            <img
              src="scale.png" // đổi đường dẫn icon của bạn ở đây
              alt="Translate"
              style={{
                width: "60%",
                height: "60%",
                objectFit: "contain",
                pointerEvents: "none",
              }}
            />
          </button>
          <button
            style={{
              backgroundColor: activeTool === "translate" ? "#333" : "#222",
              width: 50,
              height: 50,
              padding: 0,
              borderRadius: "12px",
              borderColor: "#f4d35e",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => {
              setActiveTool("rotate");
              setGizmoSpace("world"); // bắt đầu world, kéo thì local
            }}
          >
            <img
              src="360.png" // đổi đường dẫn icon của bạn ở đây
              alt="Translate"
              style={{
                width: "60%",
                height: "60%",
                objectFit: "contain",
                pointerEvents: "none",
              }}
            />
          </button>
        </div>

        <div className="tool-pair-container">
          <div className="tool-pair">
            <button className="tool-btn" onClick={placeOnFloor}>
              <img
                src="/snap.png"
                alt="Snap"
                style={{ width: "40px", height: "40px" }}
              />
            </button>

            <button className="tool-btn" onClick={() => setActiveTool("grid")}>
              <img
                src="/grid.png"
                alt="Grid"
                style={{ width: "70%", height: "100%", objectFit: "contain" }}
              />
            </button>
          </div>

          <div className="tool-pair">
            <button className="tool-btn" onClick={onGroup}>
              <img
                src="/group.png"
                alt="Group"
                style={{ width: "40px", height: "40px" }}
              />
            </button>
            <button className="tool-btn" onClick={onDegroup}>
              <img
                src="/ungroup.png"
                alt="Ungroup"
                style={{ width: "40px", height: "40px" }}
              />
            </button>
          </div>
        </div>

        {/* Nút file (ngang, góc phải trên) */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            display: "flex",
            flexDirection: "row",
            gap: 10,
            zIndex: 10,
          }}
        >
          <button style={toolButtonStyle}>Open</button>
          <button
            style={toolButtonStyle}
            onClick={() => inputRef.current?.click()}
          >
            Import
          </button>
          <input
            ref={inputRef}
            type="file"
            style={{ display: "none" }}
            accept=".glb,.stl,.obj"
            onChange={importModel}
          />
          <button style={toolButtonStyle} onClick={exportGLB}>
            Export
          </button>
        </div>

        {/* Overlay Select */}
        {activeTool === "select" && (
          <div
            onMouseDown={beginSelection}
            onMouseMove={updateSelection}
            onMouseUp={finishSelection}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 5,
              pointerEvents: "auto",
            }}
          >
            {isSelecting && selStart && selEnd && (
              <div
                style={{
                  position: "absolute",
                  left: Math.min(selStart.x, selEnd.x),
                  top: Math.min(selStart.y, selEnd.y),
                  width: Math.abs(selEnd.x - selStart.x),
                  height: Math.abs(selEnd.y - selStart.y),
                  border: "1px dashed #FFD700",
                  background: "rgba(255,215,0,0.1)",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        )}

        <Canvas
          camera={{ position: [5, 5, 5], fov: 60 }}
          shadows
          onMouseUp={handleMouseUp}
          onPointerMissed={() => {
            if (activeTool !== "select") {
              setSelectedIndex(null);
              setSelectedSet(new Set());
              teardownSelectionGroup();
              setGizmoSpace("world");
            }
          }}
        >
          <ThreeRefs
            onReady={({ camera, size, scene }) => {
              cameraRef.current = camera;
              sizeRef.current = { width: size.width, height: size.height };
              sceneRef.current = scene;
            }}
          />

          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 10, 5]} intensity={1} />
          {showGrid && <gridHelper args={[20, 20]} />}

          <OrbitControls ref={orbitRef} makeDefault />
          <Suspense fallback={null}>
            {models.map((item, i) => (
              <ModelWrapper
                key={i}
                model={item.model}
                position={item.position}
                isSelected={selectedSet.has(i) || i === selectedIndex}
                onClick={() => {
                  if (activeTool === "select") {
                    teardownSelectionGroup();
                    setSelectedIndex(i);
                    setSelectedSet(new Set([i]));
                  } else {
                    handlePickOne(i);
                  }
                }}
              />
            ))}
            {previewModel && <PreviewFollower object={previewModel} />}
          </Suspense>

          {/* ❗ Chỉ hiển thị TransformControls khi KHÔNG ở chế độ select
              (để multi-select giữ khung vàng liên tục, không bật gizmo) */}
          {activeTool !== "select" &&
            (selectionGroupRef.current ||
              selectedIndex !== null ||
              selectedSet.size === 1) && (
              <TransformControls
                ref={transformRef}
                object={
                  selectionGroupRef.current
                    ? selectionGroupRef.current
                    : selectedIndex !== null
                    ? models[selectedIndex].model
                    : models[[...selectedSet][0]].model
                }
                mode={
                  activeTool === "rotate"
                    ? "rotate"
                    : activeTool === "scale"
                    ? "scale"
                    : "translate"
                }
                space={gizmoSpace}
                showX
                showY
                showZ
                onPointerDown={() => {
                  if (activeTool === "scale" || activeTool === "rotate")
                    setGizmoSpace("local");
                  else setGizmoSpace("world");
                  if (orbitRef.current) orbitRef.current.enabled = false;
                }}
                onPointerUp={() => {
                  setGizmoSpace("world");
                  if (orbitRef.current) orbitRef.current.enabled = true;
                }}
                onObjectChange={() => {
                  if (!selectionGroupRef.current) {
                    onTransformChange();
                  } else {
                    // multi theo group tạm — không cần cập nhật từng item ngay
                  }
                }}
              />
            )}
        </Canvas>
      </div>

      {/* PROPERTIES */}
      <aside
        className="inspector"
        style={{ overflowY: "auto", maxHeight: "100vh" }}
      >
        <InspectorPanel
          activeTool="all"
          selectedModel={
            selectionGroupRef.current
              ? null
              : selectedIndex !== null
              ? models[selectedIndex]
              : selectedSet.size === 1
              ? models[[...selectedSet][0]]
              : null
          }
          onChange={updateModelValue}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          placeOnFloor={placeOnFloor}
        />
      </aside>
    </div>
  );
}
