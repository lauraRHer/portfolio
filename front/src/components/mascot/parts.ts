import type { PartName } from "./AstronautSvg";

/**
 * Registry of the mascot's SVG nodes. Callback refs are created once per
 * part (stable identity), so React never re-attaches them.
 */
export class PartRegistry {
  private nodes = new Map<PartName, SVGElement>();
  private callbacks = new Map<PartName, (node: SVGElement | null) => void>();

  bind = (name: PartName) => {
    let cb = this.callbacks.get(name);
    if (!cb) {
      cb = (node) => {
        if (node) this.nodes.set(name, node);
        else this.nodes.delete(name);
      };
      this.callbacks.set(name, cb);
    }
    return cb;
  };

  attr(name: PartName, key: string, value: string) {
    this.nodes.get(name)?.setAttribute(key, value);
  }
}
