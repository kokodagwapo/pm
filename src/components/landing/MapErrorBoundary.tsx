"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[MapErrorBoundary] Caught error in map component:", error?.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full w-full items-center justify-center bg-slate-50 text-sm text-slate-500">
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
              Map temporarily unavailable
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
