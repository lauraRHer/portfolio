"use client";

import { Component, type ReactNode } from "react";

/**
 * Catches runtime failures of the 3D scene (e.g. the WebGL context is lost or
 * can't be created after the support check) and renders `fallback` instead
 * of breaking the whole page.
 */
export class SceneErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[hero] 3D scene disabled, using static fallback:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
