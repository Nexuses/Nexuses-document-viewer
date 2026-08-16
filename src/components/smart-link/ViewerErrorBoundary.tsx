'use client';

import { Component, ReactNode } from 'react';

export default class ViewerErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center text-sm text-gray-600 bg-white">
          Unable to load the viewer. Refresh the page and try again.
        </div>
      );
    }
    return this.props.children;
  }
}
