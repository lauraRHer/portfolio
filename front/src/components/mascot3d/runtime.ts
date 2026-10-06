import type { Object3D } from "three";

/**
 * Registry of the character's animated nodes. Callback refs are created once
 * per name (stable identity), and the render loop reads the nodes every frame
 * without triggering React re-renders.
 */
export class CharacterRuntime {
  private nodes = new Map<string, Object3D>();
  private callbacks = new Map<string, (o: Object3D | null) => void>();

  /** Stable callback ref registering a node under `name`. */
  bind = (name: string) => {
    let cb = this.callbacks.get(name);
    if (!cb) {
      cb = (o) => {
        if (o) this.nodes.set(name, o);
        else this.nodes.delete(name);
      };
      this.callbacks.set(name, cb);
    }
    return cb;
  };

  get(name: string) {
    return this.nodes.get(name);
  }
}
