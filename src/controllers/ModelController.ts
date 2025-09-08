export const ModelController = {
  rotate(models, selectedIndex, axis, delta) {
    if (selectedIndex === null) return models;
    return models.map((item, i) => {
      if (i !== selectedIndex) return item;
      item.model.rotation[axis] += delta;
      return { ...item };
    });
  },
  setRotation(models, selectedIndex, axis, value) {
    if (selectedIndex === null) return models;
    return models.map((item, i) => {
      if (i !== selectedIndex) return item;
      item.model.rotation[axis] = value;
      return { ...item };
    });
  },
  delete(models, selectedIndex) {
    if (selectedIndex === null) return models;
    return models.filter((_, i) => i !== selectedIndex);
  },
};
