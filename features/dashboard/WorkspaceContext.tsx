"use client";

import { createContext, useContext } from "react";

const WorkspaceContext = createContext<string>("");

export const WorkspaceProvider = WorkspaceContext.Provider;

export function useWorkspaceId() {
  return useContext(WorkspaceContext);
}

// Separate from WorkspaceContext (an id) so pages that need to display which
// workspace they're scoped to — e.g. App Explorer's connected/unconnected
// status, which is stored per-workspace but shows apps that aren't — can
// surface it without every existing useWorkspaceId() consumer having to
// switch off a plain string.
const WorkspaceNameContext = createContext<string>("");

export const WorkspaceNameProvider = WorkspaceNameContext.Provider;

export function useWorkspaceName() {
  return useContext(WorkspaceNameContext);
}
