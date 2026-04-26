"use client";

import { Component } from "react";

export default class RoomErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
          <p className="text-[12px] font-mono text-white/30 uppercase tracking-wider">
            {this.props.label || "Feature"} unavailable
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-[11px] font-bold text-amber/60 hover:text-amber transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
