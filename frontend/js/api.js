const API_BASE = localStorage.getItem("apiBase") || "http://localhost:3001/api";

async function apiGet(path) {
  const r = await fetch(API_BASE + path);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiPost(path, body) {
  const r = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiPut(path, body) {
  const r = await fetch(API_BASE + path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiDelete(path) {
  const r = await fetch(API_BASE + path, { method: "DELETE" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
