import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter";

type ExportFormat = "glb" | "gltf" | "stl";

/* ========= helpers ========= */
const supportsPicker = () =>
  typeof (window as any).showSaveFilePicker === "function" &&
  window.isSecureContext;

const getExtFromName = (name: string) =>
  (name.split(".").pop() || "").trim().toLowerCase();

const ensureExt = (name: string, fmt: ExportFormat) =>
  name.toLowerCase().endsWith("." + fmt) ? name : `${name}.${fmt}`;

function saveBlobFallback(blob: Blob, suggestedName: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = suggestedName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Ghi bằng showSaveFilePicker; nếu lỗi ngoài AbortError thì fallback tải về. */
async function writeWithPicker(
  blob: Blob,
  suggestedName: string,
  format: ExportFormat
) {
  const anyWindow = window as any;
  if (supportsPicker()) {
    try {
      const handle = await anyWindow.showSaveFilePicker({
        suggestedName: ensureExt(suggestedName, format),
        types: [
          {
            description: "glTF Binary (.glb)",
            accept: { "model/gltf-binary": [".glb"] },
          },
          {
            description: "glTF JSON (.gltf)",
            accept: { "model/gltf+json": [".gltf"] },
          },
          {
            description: "STL (.stl)",
            accept: { "model/stl": [".stl"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return; // done
    } catch (err: any) {
      // Người dùng cancel -> thoát êm, không fallback
      if (err && (err.name === "AbortError" || err.code === 20)) return;
      // Lỗi khác -> fallback
      console.error("writeWithPicker failed, fallback to download:", err);
    }
  }
  saveBlobFallback(blob, ensureExt(suggestedName, format));
}

/* ========= import ========= */

function gltfHasExternalURIs(json: any): boolean {
  const nonData = (uri?: string) => !!uri && !/^data:/i.test(uri);
  if (Array.isArray(json.buffers)) {
    for (const b of json.buffers) {
      if (nonData(b?.uri)) return true;
    }
  }
  if (Array.isArray(json.images)) {
    for (const im of json.images) {
      if (nonData(im?.uri)) return true;
    }
  }
  return false;
}

/** Import GLB / GLTF (embedded) / STL / OBJ (không MTL). */
const importFile = async (
  file: File
): Promise<{ model: THREE.Object3D } | null> => {
  const ext = getExtFromName(file.name);

  // GLB (ArrayBuffer)
  if (ext === "glb") {
    const buf = await file.arrayBuffer();
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.parse(
        buf,
        "",
        (gltf) => resolve({ model: gltf.scene }),
        (e) => reject(e)
      );
    });
  }

  // GLTF (JSON embedded-only)
  if (ext === "gltf") {
    const text = await file.text();
    try {
      const json = JSON.parse(text);
      if (gltfHasExternalURIs(json)) {
        throw new Error(
          "GLTF có tham chiếu file ngoài (.bin/.png...). Hãy dùng GLB hoặc GLTF embed."
        );
      }
    } catch (e) {
      // Nếu không parse JSON được, vẫn thử để GLTFLoader xử lý
    }
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.parse(
        text, // GLTFLoader.accepts string JSON
        "",
        (gltf) => resolve({ model: gltf.scene }),
        (e) => reject(e)
      );
    });
  }

  // STL (ArrayBuffer)
  if (ext === "stl") {
    const buf = await file.arrayBuffer();
    const geometry = new STLLoader().parse(buf);
    const material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const mesh = new THREE.Mesh(geometry, material);
    return { model: mesh };
  }

  // OBJ (text, không MTL)
  if (ext === "obj") {
    const text = await file.text();
    const object = new OBJLoader().parse(text);
    // Bảo đảm có material tối thiểu để render
    object.traverse((child: any) => {
      if (child.isMesh && !child.material) {
        child.material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
      }
    });
    return { model: object };
  }

  throw new Error(
    "Unsupported file format (chỉ hỗ trợ: .glb, .gltf, .stl, .obj)"
  );
};

/* ========= export core (ra Blob theo format) ========= */

async function toBlob(
  object: THREE.Object3D,
  format: ExportFormat
): Promise<{ blob: Blob; mime: string; ext: ExportFormat }> {
  object.updateMatrixWorld(true);

  if (format === "stl") {
    const stl = new STLExporter().parse(object, {
      binary: true,
    }) as ArrayBuffer;
    return {
      blob: new Blob([stl], { type: "model/stl" }),
      mime: "model/stl",
      ext: "stl",
    };
  }

  if (format === "glb") {
    const exporter = new GLTFExporter();
    const ab = await new Promise<ArrayBuffer>((resolve, reject) => {
      exporter.parse(
        object,
        (res) => {
          if (res instanceof ArrayBuffer) resolve(res);
          else reject(new Error("Expected ArrayBuffer for GLB export"));
        },
        (err) => reject(err),
        {
          binary: true,
          onlyVisible: true,
          includeCustomExtensions: false,
          trs: false,
          forcePowerOfTwoTextures: false,
          maxTextureSize: 4096,
        }
      );
    });
    return {
      blob: new Blob([ab], { type: "model/gltf-binary" }),
      mime: "model/gltf-binary",
      ext: "glb",
    };
  }

  // GLTF (JSON)
  const exporter = new GLTFExporter();
  const json = await new Promise<object>((resolve, reject) => {
    exporter.parse(
      object,
      (res) => resolve(res as object),
      (err) => reject(err),
      {
        binary: false,
        onlyVisible: true,
        includeCustomExtensions: false,
        // embed textures bằng data-uri (mặc định của exporter ở JSON)
      }
    );
  });
  return {
    blob: new Blob([JSON.stringify(json, null, 2)], {
      type: "model/gltf+json",
    }),
    mime: "model/gltf+json",
    ext: "gltf",
  };
}

/* ========= API xuất ========= */

/** Cho phép chọn TÊN + ĐỊNH DẠNG (GLB/GLTF/STL); có save dialog + fallback tải file */
const exportWithDialog = async (
  object: THREE.Object3D,
  defaultBaseName = "scene"
) => {
  object.updateMatrixWorld(true);

  if (supportsPicker()) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${defaultBaseName}.glb`,
        types: [
          {
            description: "glTF Binary (.glb)",
            accept: { "model/gltf-binary": [".glb"] },
          },
          {
            description: "glTF JSON (.gltf)",
            accept: { "model/gltf+json": [".gltf"] },
          },
          {
            description: "STL (.stl)",
            accept: { "model/stl": [".stl"] },
          },
        ],
      });

      const chosenName: string = handle.name || `${defaultBaseName}.glb`;
      const ext = (
        ["glb", "gltf", "stl"].includes(getExtFromName(chosenName))
          ? (getExtFromName(chosenName) as ExportFormat)
          : "glb"
      ) as ExportFormat;

      const { blob } = await toBlob(object, ext);

      try {
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return; // done
      } catch (writeErr) {
        console.error(
          "SaveFilePicker write failed; fallback to download:",
          writeErr
        );
        saveBlobFallback(blob, ensureExt(chosenName, ext));
        return;
      }
    } catch (err: any) {
      if (err && (err.name === "AbortError" || err.code === 20)) {
        // user canceled -> do nothing
        return;
      }
      console.error(
        "showSaveFilePicker failed; fallback to prompt/download:",
        err
      );
      // continue to fallback below
    }
  }

  // Fallback: hỏi nhanh qua prompt rồi tải xuống
  const base =
    prompt("Đặt tên file (không kèm đuôi):", defaultBaseName) ||
    defaultBaseName;
  const fmtIn =
    prompt('Chọn loại: "glb", "gltf" hay "stl"?', "glb")?.toLowerCase() ||
    "glb";
  const fmt: ExportFormat = (
    ["glb", "gltf", "stl"].includes(fmtIn) ? (fmtIn as ExportFormat) : "glb"
  ) as ExportFormat;

  const { blob, ext } = await toBlob(object, fmt);
  saveBlobFallback(blob, `${base}.${ext}`);
};

/** Xuất định dạng cố định (vẫn ưu tiên save dialog, có fallback) */
const exportGLB = async (object: THREE.Object3D, filename = "model.glb") => {
  const { blob } = await toBlob(object, "glb");
  await writeWithPicker(blob, filename, "glb");
};

const exportGLTF = async (object: THREE.Object3D, filename = "model.gltf") => {
  const { blob } = await toBlob(object, "gltf");
  await writeWithPicker(blob, filename, "gltf");
};

const exportSTL = async (object: THREE.Object3D, filename = "model.stl") => {
  const { blob } = await toBlob(object, "stl");
  await writeWithPicker(blob, filename, "stl");
};

const FileIOController = {
  importFile,
  exportWithDialog,
  exportGLB,
  exportGLTF,
  exportSTL,
};

export default FileIOController;
