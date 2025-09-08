// PositionController.ts
export default class PositionController {
  static move(
    models: any[],
    selectedIndex: number | null,
    axis: "x" | "y" | "z",
    delta: number
  ): any[] {
    if (selectedIndex === null) return models;
    return models.map((item, i) =>
      i === selectedIndex
        ? {
            ...item,
            position: {
              ...item.position,
              [axis]: item.position[axis] + delta,
            },
          }
        : item
    );
  }
}
