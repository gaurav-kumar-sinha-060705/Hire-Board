export function jobTicketId(id) {
  return "JOB-" + String(id).padStart(4, "0");
}
