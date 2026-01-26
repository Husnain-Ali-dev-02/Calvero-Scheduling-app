"use client";

import { SanityApp } from "@sanity/sdk-react";
import { dataset, projectId } from "@/sanity/env";

/**
 * Wraps children with a SanityApp configured for the current Sanity project.
 *
 * @param children - React nodes to be rendered inside the SanityApp provider
 * @returns A JSX element that renders `children` inside a SanityApp configured with `projectId` and `dataset`
 */
function SanityAppProvider({ children }: { children: React.ReactNode }) {
  return (
    <SanityApp
      config={[
        {
          projectId,
          dataset,
        },
      ]}
      // We handle the loading state in the Providers component by showing a loading indicator via the dynamic import
      fallback={<div />}
    >
      {children}
    </SanityApp>
  );
}

export default SanityAppProvider;