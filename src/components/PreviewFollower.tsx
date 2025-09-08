import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function PreviewFollower({ object }: { object: THREE.Object3D }) {
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
