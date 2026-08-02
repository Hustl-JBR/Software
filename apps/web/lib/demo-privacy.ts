export function maskPhone(phone: string) {
  return `•••-•••-${phone.slice(-4)}`;
}
export function mayRevealDriverContact(role: string) {
  return role === "APPROVER" || role === "OPERATOR";
}
