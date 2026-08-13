function segment(value: string): string {
  return encodeURIComponent(value);
}

export const routes = {
  signIn: "/sign-in",
  workspace: (workspaceSlug: string) => `/w/${segment(workspaceSlug)}`,
  newIncident: (workspaceSlug: string) =>
    `/w/${segment(workspaceSlug)}/incidents/new`,
  incident: (workspaceSlug: string, incidentId: string) =>
    `/w/${segment(workspaceSlug)}/incidents/${segment(incidentId)}`,
  incidentsApi: (workspaceSlug: string) =>
    `/api/workspaces/${segment(workspaceSlug)}/incidents`,
  incidentApi: (workspaceSlug: string, incidentId: string) =>
    `/api/workspaces/${segment(workspaceSlug)}/incidents/${segment(incidentId)}`,
  commentsApi: (workspaceSlug: string, incidentId: string) =>
    `/api/workspaces/${segment(workspaceSlug)}/incidents/${segment(incidentId)}/comments`,
} as const;
