import { Canvas } from "@react-three/fiber";

export default function Canvas3D() {
  return (
    <div className="canvas-wrapper">
      <Canvas shadows camera={{ position: [5, 5, 5], fov: 60 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
        <gridHelper args={[20, 20]} />
        <axesHelper args={[5]} />
      </Canvas>
    </div>
  );
}
