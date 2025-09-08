import React, { useEffect, useMemo, useState, Suspense } from "react";
import "./assets.css";
import { listGlbFilesFromGithub, GithubGlb } from "../lib/githubGlb";
import { NavLink } from "react-router-dom";
// ==== 3D Viewer ====
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Bounds,
  Center,
  Environment,
  Grid,
  Html,
  useGLTF,
} from "@react-three/drei";

// Demo khi chưa có model
function DemoModel() {
  return (
    <Center>
      <mesh castShadow receiveShadow>
        <torusKnotGeometry args={[1, 0.35, 256, 32]} />
        <meshStandardMaterial roughness={0.35} metalness={0.2} />
      </mesh>
    </Center>
  );
}
function ModelGLTF({ url }: { url: string }) {
  const gltf = useGLTF(url, true) as any; // drei tự dùng GLTFLoader
  return (
    <Center>
      {/* @ts-expect-error three primitive */}
      <primitive object={gltf.scene || gltf} />
    </Center>
  );
}
function ModelViewer3D({ url, keySeed }: { url?: string; keySeed: string }) {
  return (
    <div className="assets__3d">
      <Canvas shadows camera={{ position: [4, 3, 6], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 2]} intensity={1} castShadow />
        <Environment preset="city" />
        <Grid
          cellSize={0.5}
          cellThickness={0.8}
          infiniteGrid
          fadeDistance={40}
          fadeStrength={2}
        />

        <Bounds key={keySeed} fit clip observe margin={1.2}>
          <Suspense
            fallback={
              <Html center>
                <div className="assets__loader">Đang tải mô hình…</div>
              </Html>
            }
          >
            {url ? <ModelGLTF url={url} /> : <DemoModel />}
          </Suspense>
        </Bounds>

        <OrbitControls makeDefault enablePan enableZoom enableRotate />
      </Canvas>

      <div className="assets__hint">
        <span>🖱️ Kéo để xoay</span>
        <span>⇧ + kéo để pan</span>
        <span>Cuộn để zoom</span>
        <span>Double-click để refit</span>
      </div>
    </div>
  );
}

// ==== Types & helpers ====
type Project = {
  id: string;
  name: string;
  tag: string;
  assetsCount: number;
  prompt?: string;
  modelUrl?: string;
};

// Repo của bạn
const GITHUB = {
  owner: "phamhacmemory",
  repo: "Storage",
  branch: "main",
  pathPrefix: "", // quét toàn repo
  token: undefined as string | undefined, // public => không cần
};

export default function AssetsPage() {
  const [q, setQ] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Lấy tất cả .glb từ GitHub
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const glbs: GithubGlb[] = await listGlbFilesFromGithub(GITHUB);
        const mapped: Project[] = glbs.map((g) => ({
          id: g.id,
          name: g.name.replace(/\.glb$/i, ""),
          tag: "GLB",
          assetsCount: 1,
          prompt: g.path, // hiển thị path cho dễ nhìn
          modelUrl: g.downloadUrl, // dùng cho preview & edit
        }));
        setProjects(mapped);
        setSelectedId((prev) => prev ?? mapped[0]?.id ?? null);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(s) || p.prompt?.toLowerCase().includes(s)
    );
  }, [q, projects]);

  const current = list.find((x) => x.id === selectedId) ?? null;

  const onOpenRaw = () => {
    if (!current?.modelUrl) return;
    window.open(current.modelUrl, "_blank");
  };

  const onEdit = () => {
    if (!current?.modelUrl) return;
    // Nếu có react-router: điều hướng đến /design?import=...
    // navigate(`/design?import=${encodeURIComponent(current.modelUrl)}`);
    // Dùng API web chuẩn để không phụ thuộc router:
    window.location.href = `/design?import=${encodeURIComponent(
      current.modelUrl
    )}`;
  };

  return (
    <div className="assets">
      <main className="assets__wrap">
        {/* Top */}
        <div className="assets__top">
          <h2>My Projects</h2>
          <div className="assets__actions">
            <div className="assets__search">
              <span className="i">🔎</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search my generation"
                aria-label="Search projects"
              />
            </div>
            <button className="btn-green">
              <span className="i">⬆️</span> Upload
            </button>
            <NavLink to="/design" className="btn-green">
              <span className="i">⬆️</span> Create
            </NavLink>

            <button className="btn-icon" title="More">
              ⋯
            </button>
          </div>
        </div>

        {/* Grid: LEFT list | RIGHT preview */}
        <div className="assets__grid">
          {/* LEFT: list projects */}
          <aside className="assets__list" aria-label="Projects">
            {loading && <div className="dim">Đang tải từ GitHub…</div>}
            {err && <div className="dim">Lỗi: {err}</div>}
            {!loading && !err && list.length === 0 && (
              <div className="assets__emptyList">Không có file .glb nào.</div>
            )}

            {list.map((p) => (
              <button
                key={p.id}
                className={`assets__row ${
                  selectedId === p.id ? "is-active" : ""
                }`}
                onClick={() => setSelectedId(p.id)}
                title={p.name}
                aria-current={selectedId === p.id || undefined}
              >
                <div className="thumb" aria-hidden />
                <div className="meta">
                  <div className="name">{p.name}</div>
                  <div className="sub">
                    <span className="chip">{p.tag}</span>
                    <span className="dim">{p.prompt}</span>
                  </div>
                </div>
              </button>
            ))}
          </aside>

          {/* RIGHT: preview */}
          <section className="assets__preview">
            {!current ? (
              <div className="assets__placeholder">
                <div className="ttl">Select a project to view details</div>
                <div className="sub">Your project assets will appear here</div>
              </div>
            ) : (
              <div className="assets__detail">
                <header className="detail__hdr">
                  <div className="detail__title">{current.name}</div>
                  <div className="detail__right">
                    <button className="btn sm" onClick={onOpenRaw}>
                      Open
                    </button>
                    <button className="btn sm ghost" onClick={onOpenRaw}>
                      Download
                    </button>
                    <button className="btn sm ghost" onClick={onEdit}>
                      Edit
                    </button>
                  </div>
                </header>

                <div className="detail__content">
                  <div className="detail__thumb">
                    <ModelViewer3D
                      keySeed={current.id}
                      url={current.modelUrl}
                    />
                  </div>

                  <div className="detail__info">
                    <div className="row">
                      <span className="key">Category</span>
                      <span className="val">{current.tag}</span>
                    </div>
                    <div className="row">
                      <span className="key">Assets</span>
                      <span className="val">{current.assetsCount}</span>
                    </div>
                    <div className="row col">
                      <span className="key">Path</span>
                      <span className="val dim">{current.prompt ?? "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
