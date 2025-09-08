// FloorManager.ts
import * as THREE from "three";

export class FloorManager {
  static align(models: any[], selectedIndex: number | null): any[] {
    if (selectedIndex === null) return models;
    const model = models[selectedIndex].model;
    const box = new THREE.Box3().setFromObject(model);
    const offsetY = box.min.y;
    const newY = models[selectedIndex].position.y - offsetY;
    return models.map((item, i) =>
      i === selectedIndex
        ? {
            ...item,
            position: {
              ...item.position,
              y: newY,
            },
          }
        : item
    );
  }
}
