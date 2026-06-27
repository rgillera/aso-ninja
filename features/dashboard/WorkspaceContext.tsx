"use client";

import { createContext, useContext } from "react";

const WorkspaceContext = createContext<string>("");

export const WorkspaceProvider = WorkspaceContext.Provider;

export function useWorkspaceId() {
  return useContext(WorkspaceContext);
}
