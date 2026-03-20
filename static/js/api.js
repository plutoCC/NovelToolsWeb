async function request(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === "string" ? payload : payload.detail || "请求失败";
    throw new Error(message);
  }

  return payload;
}

export function fetchBootstrap() {
  return request("/api/bootstrap");
}

export function fetchWorkspace() {
  return request("/api/workspace");
}

export function fetchState() {
  return request("/api/state");
}

export function saveState(state) {
  return request("/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
}

export function createProject(payload) {
  return request("/api/projects/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function switchProject(projectId) {
  return request("/api/projects/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: projectId }),
  });
}

export function importState(file, mode = "new_project", targetProjectId = null) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);
  if (targetProjectId) {
    formData.append("target_project_id", targetProjectId);
  }
  return request("/api/import", { method: "POST", body: formData });
}

export function exportState() {
  window.location.href = "/api/export";
}
