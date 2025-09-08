// src/utils/exportAllToGit.ts
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

export type ModelEntry = { model: THREE.Object3D };

export type GithubConfig = {
  owner: string; // ví dụ: "phamhacmemory"
  repo: string; // ví dụ: "Storage"
  branch: string; // ví dụ: "main"
  folder?: string; // "" = root; "exports" = lưu vào /exports
  token: string; // PAT (fine-grained/classic) — bắt buộc để ghi
};

/* ================== state & config ================== */
const state = {
  nameProject: "test01",
  idUser: "user123",
  github: null as GithubConfig | null,
};

export function configureProjectUser(nameProject: string, idUser: string) {
  state.nameProject = nameProject;
  state.idUser = idUser;
}
export function configureGitHub(cfg: GithubConfig) {
  state.github = cfg;
}
export function buildFileName(nameProject?: string, idUser?: string) {
  const proj = (nameProject ?? (state.nameProject || "project")).trim();
  const user = (idUser ?? (state.idUser || "user")).trim();
  return `${proj}_${user}.glb`;
}

/* ================== helpers ================== */
function abToBase64(ab: ArrayBuffer) {
  const bytes = new Uint8Array(ab);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Encode từng segment, KHÔNG encode dấu '/' */
function encodeRepoPath(p: string) {
  return p.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

/* ================== export all to GLB ================== */
export function exportAllToGLBArrayBuffer(
  models: ModelEntry[],
  scene: THREE.Scene
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    if (!models?.length) return reject(new Error("Không có object để export."));

    const exporter = new GLTFExporter();
    const root = new THREE.Group();
    scene.add(root);

    const moved: THREE.Object3D[] = [];
    models.forEach(({ model }) => {
      root.attach(model); // giữ world transform
      moved.push(model);
    });

    root.updateMatrixWorld(true);
    exporter.parse(
      root,
      (res) => {
        moved.forEach((obj) => scene.attach(obj));
        scene.remove(root);
        if (res instanceof ArrayBuffer) resolve(res);
        else
          reject(
            new Error("Kỳ vọng ArrayBuffer (GLB), nhưng nhận JSON (GLTF).")
          );
      },
      (err) => {
        moved.forEach((obj) => scene.attach(obj));
        scene.remove(root);
        reject(err);
      },
      { binary: true, onlyVisible: true }
    );
  });
}

/* ================== preflight (token & quyền) ================== */
async function preflightAssert(cfg: GithubConfig) {
  const H = {
    Authorization: `token ${cfg.token}`, // KHÔNG dùng 'Bearer'
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const who = await fetch("https://api.github.com/user", { headers: H });
  if (!who.ok)
    throw new Error(`Token không hợp lệ: ${who.status} ${await who.text()}`);

  const r = await fetch(
    `https://api.github.com/repos/${cfg.owner}/${cfg.repo}`,
    { headers: H }
  );
  if (!r.ok)
    throw new Error(`Repo không truy cập được: ${r.status} ${await r.text()}`);

  const info = await r.json();
  if (!info?.permissions?.push) {
    throw new Error(
      `Token KHÔNG có quyền push vào ${cfg.owner}/${cfg.repo}. ` +
        `Hãy cấp "Repository permissions → Contents: Read and write" (fine-grained) ` +
        `hoặc dùng PAT classic với scope 'repo'.`
    );
  }
}

/* ================== GitHub upload (có retry 409) ================== */
async function getExistingFileSha(cfg: GithubConfig, path: string) {
  const headers = {
    Authorization: `token ${cfg.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const url = `https://api.github.com/repos/${cfg.owner}/${
    cfg.repo
  }/contents/${encodeRepoPath(path)}?ref=${encodeURIComponent(cfg.branch)}`;

  const r = await fetch(url, { headers });
  if (r.status === 404) return undefined;
  if (!r.ok) throw new Error(`GET contents lỗi: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return (j && j.sha) as string | undefined;
}

/** Upload (ghi đè nếu trùng tên bằng SHA; auto-retry 1 lần khi 409) */
export async function uploadToGitHub(
  fileName: string,
  contentAB: ArrayBuffer,
  cfg: GithubConfig,
  commitMessage = `export ${fileName}`
) {
  const headers = {
    Authorization: `token ${cfg.token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const path =
    (cfg.folder ? `${cfg.folder.replace(/^\/|\/$/g, "")}/` : "") + fileName;

  const putOnce = async (sha?: string) => {
    const body = {
      message: commitMessage,
      content: abToBase64(contentAB),
      branch: cfg.branch,
      ...(sha ? { sha } : {}),
    };
    const url = `https://api.github.com/repos/${cfg.owner}/${
      cfg.repo
    }/contents/${encodeRepoPath(path)}`;
    return fetch(url, { method: "PUT", headers, body: JSON.stringify(body) });
  };

  // Lấy SHA hiện tại (nếu có) rồi PUT
  let sha = await getExistingFileSha(cfg, path);
  let res = await putOnce(sha);

  // Nếu conflict (409) ⇒ refetch SHA và retry 1 lần
  if (res.status === 409) {
    console.warn("PUT 409: sha conflict, retrying with fresh sha…");
    sha = await getExistingFileSha(cfg, path);
    res = await putOnce(sha);
  }

  if (!res.ok)
    throw new Error(`PUT contents lỗi: ${res.status} ${await res.text()}`);
  return res.json();
}

/* ================== main API ================== */
export async function saveAllToGit(
  models: ModelEntry[],
  scene: THREE.Scene,
  options?: {
    nameProject?: string;
    idUser?: string;
    github?: GithubConfig;
    commitMessage?: string;
  }
) {
  const cfg = options?.github ?? state.github;
  if (!cfg) throw new Error("Chưa cấu hình GitHub (configureGitHub).");
  if (!cfg.token) throw new Error("Thiếu token GitHub trong cấu hình.");

  console.log(
    "[SAVE] repo:",
    `${cfg.owner}/${cfg.repo}`,
    "branch:",
    cfg.branch,
    "folder:",
    cfg.folder || "(root)"
  );
  console.log("[SAVE] token prefix:", cfg.token.slice(0, 8) + "…");

  await preflightAssert(cfg);

  const fileName = buildFileName(
    options?.nameProject ?? state.nameProject,
    options?.idUser ?? state.idUser
  );

  const ab = await exportAllToGLBArrayBuffer(models, scene);
  if (ab.byteLength > 95 * 1024 * 1024) {
    console.warn(
      `Cảnh báo: file ~${(ab.byteLength / (1024 * 1024)).toFixed(
        1
      )}MB; GitHub Contents API giới hạn ~100MB.`
    );
  }

  try {
    const res = await uploadToGitHub(
      fileName,
      ab,
      cfg,
      options?.commitMessage ?? `export ${fileName}`
    );
    return { fileName, response: res };
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes(" 401 ") || /Bad credentials/i.test(msg)) {
      throw new Error(
        "401 Bad credentials: token sai/hết hạn hoặc header không đúng (phải 'Authorization: token <PAT>')."
      );
    }
    if (msg.includes(" 403 ")) {
      throw new Error(
        "403: Token không có quyền ghi Contents vào repo/branch này. Với fine-grained PAT, cần bật 'Contents: Read and write' và bấm Update."
      );
    }
    if (msg.includes(" 409 ")) {
      throw new Error(
        "409: SHA conflict sau khi retry. Có thể có commit khác vừa ghi đè cùng tên file. Thử lại lần nữa."
      );
    }
    throw e;
  }
}
