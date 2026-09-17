import type { ReactNode } from 'react';
import { MockProvider } from './provider';

export function DemoAppBoundary({ children }: { children: ReactNode }) {
  return <MockProvider>{children}</MockProvider>;
}
