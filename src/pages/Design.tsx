// MergedApp.tsx — all components in one TSX file
// Note: Adjust the import paths for your project structure where marked.
import React, { Suspense, useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import {
  configureGitHub,
  configureProjectUser,
  saveAllToGit,
  readGhToken,
} from "../controllers/ExportGit";
// External app-specific modules — adjust these paths to match your project:
import FileIOController from "../controllers/FileIOController"; // ← adjust path if needed
import { ModelController } from "../controllers/ModelController"; // ← adjust path if needed
import { modelsList } from "../modelsListFC"; // ← adjust path if needed

import "./design.css";

/* ==============================
   Tabs (from Tabs.tsx)
   ============================== */
const guessThumbFromUrl = (url?: string) =>
  url ? url.replace(/\.glb(\?.*)?$/i, ".png$1") : undefined;

function Tabs({ tabs }: { tabs: { label: string; content: JSX.Element }[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <div>
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
      <div style={{ padding: "10px" }}>{tabs[activeIndex].content}</div>
    </div>
  );
}

/* ==============================
   InspectorPanel (from InspectorPanel.tsx)
   ============================== */
type VecField = "position" | "rotation" | "scale";
function InspectorPanel({
  selectedModel,
  onChange,
  showGrid,
  setShowGrid,
  placeOnFloor,
}: {
  activeTool?: string;
  selectedModel: any;
  onChange: (field: string, axis: string, value: number) => void;
  showGrid: boolean;
  setShowGrid: (val: boolean) => void;
  placeOnFloor: () => void;
}) {
  const renderVectorControls = (field: VecField) => {
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

/* ==============================
   PreviewFollower (from PreviewFollower.tsx)
   ============================== */
function PreviewFollower({ object }: { object: THREE.Object3D }) {
  const { camera, mouse } = useThree();
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  useFrame(() => {
    if (object) {
      raycaster.setFromCamera(mouse, camera);
      const point = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, point);
      point.x = Math.round(point.x * 2) / 2;
      point.z = Math.round(point.z * 2) / 2;
      object.position.copy(point);
    }
  });

  return <primitive object={object} />;
}

/* ==============================
   ModelWrapper (from ModelWrapper.tsx)
   ============================== */
function ModelWrapper({
  model,
  position,
  isSelected,
  onClick,
}: {
  model: THREE.Object3D;
  position: { x: number; y: number; z: number };
  isSelected: boolean;
  onClick: () => void;
}) {
  const helperRef = useRef<THREE.BoxHelper | null>(null);

  useEffect(() => {
    model.position.set(position.x, position.y, position.z);
  }, [model, position.x, position.y, position.z]);

  useEffect(() => {
    if (isSelected) {
      if (!helperRef.current) {
        helperRef.current = new THREE.BoxHelper(model, 0xffd700);
      }
      helperRef.current.update();
    } else {
      if (helperRef.current) {
        (helperRef.current.geometry as any)?.dispose?.();
        (helperRef.current.material as any)?.dispose?.();
        helperRef.current = null;
      }
    }
  }, [isSelected, model]);

  return (
    <>
      <primitive
        object={model}
        onClick={(e: any) => {
          e.stopPropagation();
          onClick();
        }}
      />
      {isSelected && helperRef.current && (
        <primitive
          object={helperRef.current}
          onPointerDown={(e: any) => e.stopPropagation()}
        />
      )}
    </>
  );
}

/* ==============================
   ModelEditor (from ModelEditor.tsx)
   ============================== */
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

function ModelEditor() {
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

  const [gizmoSpace, setGizmoSpace] = useState<"world" | "local">("world");

  const transformRef = useRef<any>(null);
  const orbitRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const sizeRef = useRef<{ width: number; height: number } | null>(null);

  const canvasShellRef = useRef<HTMLDivElement | null>(null);

  const [isSelecting, setIsSelecting] = useState(false);
  const [selStart, setSelStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [selEnd, setSelEnd] = useState<{ x: number; y: number } | null>(null);

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
    return modelsList.filter((m: any) => normalizeVN(m.name).includes(q));
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete") {
        teardownSelectionGroup();
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

  const handleDragStart = (url: string) => {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      const model = gltf.scene;
      model.scale.set(0.01, 0.01, 0.01);
      setPreviewModel(model);
    });
  };

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

  const exportAll = async () => {
    if (!sceneRef.current || models.length === 0) return;

    const exportRoot = new THREE.Group();
    sceneRef.current.add(exportRoot);

    const moved: THREE.Object3D[] = [];
    models.forEach(({ model }) => {
      exportRoot.attach(model);
      moved.push(model);
    });

    await FileIOController.exportWithDialog(exportRoot, "scene");

    moved.forEach((obj) => sceneRef.current!.attach(obj));
    sceneRef.current.remove(exportRoot);
  };

  const exportGLB = () => {
    if (!sceneRef.current || models.length === 0) return;

    // Tạo group tạm để export
    const exportRoot = new THREE.Group();
    sceneRef.current.add(exportRoot);

    // Đưa TẠM các model thật vào exportRoot theo kiểu "attach" để giữ world transform
    const moved: THREE.Object3D[] = [];
    models.forEach(({ model }) => {
      exportRoot.attach(model); // giữ nguyên vị trí/scale/rotation theo thế giới
      moved.push(model);
    });

    // Xuất 1 file GLB chứa TẤT CẢ vật thể
    // (nếu FileIOController hỗ trợ đặt tên, bạn có thể truyền thêm option filename)
    FileIOController.exportGLB(exportRoot);

    // Đưa các object về lại scene như cũ (không phá bố cục UI)
    moved.forEach((obj) => sceneRef.current!.attach(obj));
    sceneRef.current.remove(exportRoot);
  };
  //------------------------save github-------------------
  const GITHUB = {
    owner: "phamhacmemory",
    repo: "Storage", // <-- ĐÚNG repo
    branch: "main",
    folder: "",
    token:
      "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", // dán token có Contents: Read & write
  };
  configureGitHub(GITHUB);
  configureProjectUser("test03", "user123"); // bạn đổi giá trị khi cần

  const Save = async () => {
    if (!sceneRef.current) return alert("Scene chưa sẵn sàng.");
    try {
      const { fileName } = await saveAllToGit(models, sceneRef.current);
      alert(`Đã lưu ${fileName} lên GitHub`);
    } catch (e: any) {
      console.error(e);
      alert("Save thất bại: " + (e?.message || e));
    }
  };

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
      (obj.model as any).position.y = 0;
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
                x: (obj.rotation as any).x,
                y: (obj.rotation as any).y,
                z: (obj.rotation as any).z,
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

  const getLocalXY = (e: React.MouseEvent) => {
    const rect = canvasShellRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const beginSelection = (e: React.MouseEvent) => {
    if (activeTool !== "select") return;
    const t = e.target as HTMLElement;
    if (t.closest("button") || t.closest(".inspector")) return;
    if ((transformRef.current as any)?.dragging) return;
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

    if (newly.size > 1) {
      createSelectionGroup([...newly]);
    } else {
      teardownSelectionGroup();
    }
  };

  const placeholderThumb =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="100%" height="100%" fill="#f9f9f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-size="12">thumb</text></svg>`
    );

  return (
    <div
      style={{
        position: "fixed",
        inset: "136px 0 0 0",
        display: "flex",
        overflow: "hidden",
      }}
    >
      <aside
        className=" scrollable"
        style={{
          width: "fit-content",
          minWidth: 240,
          padding: 10,
          background: "#111",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
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

        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          <div className="model-grid">
            {(filteredList.length ? filteredList : []).map((item: any) => (
              <div
                key={item.url + item.name}
                draggable
                onDragStart={() => handleDragStart(item.url)}
                className="model-card"
                style={{ width: "100px" }}
                title={item.name}
              >
                <img
                  src={
                    item.img || guessThumbFromUrl(item.url) || placeholderThumb
                  }
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    if (el.src !== placeholderThumb) el.src = placeholderThumb;
                  }}
                  alt={item.name}
                  className="model-thumb"
                />
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

      <div style={{ flex: 1, position: "relative" }} ref={canvasShellRef}>
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
              teardownSelectionGroup();
            }}
          >
            <img
              src="selection.png"
              alt="Select"
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
              src="move.png"
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
              setGizmoSpace("world");
            }}
          >
            <img
              src="scale.png"
              alt="Scale"
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
              setGizmoSpace("world");
            }}
          >
            <img
              src="360.png"
              alt="Rotate"
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
          <button style={toolButtonStyle} onClick={exportAll}>
            Export
          </button>
          <button style={toolButtonStyle} onClick={Save}>
            Save
          </button>
        </div>

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

          <OrbitControls ref={orbitRef as any} makeDefault />
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

          {activeTool !== "select" &&
            (selectionGroupRef.current ||
              selectedIndex !== null ||
              selectedSet.size === 1) && (
              <TransformControls
                ref={transformRef as any}
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
                  if (orbitRef.current)
                    (orbitRef.current as any).enabled = false;
                }}
                onPointerUp={() => {
                  setGizmoSpace("world");
                  if (orbitRef.current)
                    (orbitRef.current as any).enabled = true;
                }}
                onObjectChange={() => {
                  if (!selectionGroupRef.current) {
                    onTransformChange();
                  } else {
                    // for group selection, we keep transform visual only
                  }
                }}
              />
            )}
        </Canvas>
      </div>

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

/* ==============================
   TopBar (simple inline replacement)
   ============================== */
function TopBar() {
  return (
    <div className="top-bar">
      <strong>Model Editor</strong>
    </div>
  );
}

/* ==============================
   App (from App.tsx)
   ============================== */
export default function App() {
  const tabs = [
    { label: "Design", content: <ModelEditor /> },
    { label: "", content: <div> </div> },
    { label: "", content: <div> </div> },
  ];
  return (
    <div className="app-container" style={{ flexDirection: "column" }}>
      <TopBar />
      <Tabs tabs={tabs} />
    </div>
  );
}
