import { useEffect, useRef, Fragment } from "react";
import * as THREE from "three";

export default function ModelWrapper({
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
  // BoxHelper để highlight model được chọn
  const helperRef = useRef<THREE.BoxHelper | null>(null);

  // ✅ Chỉ đồng bộ vị trí khi props position thay đổi (VD: nhập số trong PROPERTIES)
  useEffect(() => {
    model.position.set(position.x, position.y, position.z);
  }, [model, position.x, position.y, position.z]);

  // Tạo/huỷ helper khi chọn/bỏ chọn
  useEffect(() => {
    if (isSelected) {
      if (!helperRef.current) {
        helperRef.current = new THREE.BoxHelper(model, 0xffd700);
      }
      // update lần đầu
      helperRef.current.update();
    } else {
      if (helperRef.current) {
        // cleanup tài nguyên
        (helperRef.current.geometry as any)?.dispose?.();
        (helperRef.current.material as any)?.dispose?.();
        helperRef.current = null;
      }
    }
    // khi model đổi, helper cần cập nhật lại ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelected, model]);

  return (
    <Fragment>
      <primitive
        object={model}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      />
      {isSelected && helperRef.current && (
        <primitive
          object={helperRef.current}
          // tránh helper bắt sự kiện kéo/chọn
          onPointerDown={(e) => e.stopPropagation()}
        />
      )}
    </Fragment>
  );
}
