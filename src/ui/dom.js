// The flight UI owns a fixed set of nodes. Read their current values before
// writing so event-driven updates elsewhere stay authoritative, while steady
// telemetry does not recreate text nodes and invalidate styles every frame.
export function createDomWriter(resolve) {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, resolve(id));
    return nodes.get(id);
  };
  const property = (id, key, value) => {
    const element = node(id);
    if (element[key] !== value) element[key] = value;
  };
  return {
    node, property,
    text: (id, value) => property(id, 'textContent', String(value)),
    html: (id, value) => property(id, 'innerHTML', String(value)),
    hidden: (id, value) => property(id, 'hidden', !!value),
    style(id, key, value) {
      const style = node(id).style;
      if (style[key] !== value) style[key] = value;
    },
    childStyle(id, key, value) {
      const style = node(id).firstElementChild.style;
      if (style[key] !== value) style[key] = value;
    },
    toggle(id, name, enabled) {
      const classes = node(id).classList;
      if (classes.contains(name) !== !!enabled) classes.toggle(name, !!enabled);
    }
  };
}
