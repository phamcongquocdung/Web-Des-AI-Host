export class ScaleController {
  static scale(
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
            scale: {
              ...item.scale,
              [axis]: Math.max(0.1, item.scale[axis] + delta),
            },
          }
        : item
    );
  }
}
