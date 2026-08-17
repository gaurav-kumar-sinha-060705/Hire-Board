export const STATUS_OPTIONS = [
  { value: "applied", label: "Applied" },
  { value: "in-review", label: "In review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "rejected", label: "Rejected" },
  { value: "accepted", label: "Accepted" },
];

export function statusLabel(value) {
  const found = STATUS_OPTIONS.find((s) => s.value === value);
  return found ? found.label : "Applied";
}

export function statusClass(value) {
  const normalized = value || "applied";
  return "status-badge " + normalized.replace(/-/g, "_");
}
