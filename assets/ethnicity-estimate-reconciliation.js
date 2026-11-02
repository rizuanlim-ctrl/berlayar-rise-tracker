/* Non-destructive, display-only ethnicity reconciliation.
 * Never writes to the tracker API, overrides or shortlist storage.
 * Quota differences are caps/indicators, not verified buyer identities.
 */
export function reconcileEstimatedEthnicity(units, opening, remaining) {
  const ethnicities = ["Malay", "Chinese", "Indian / Other"];
  const taken = units.filter(u => u.status === "Taken");
  const confirmed = taken.filter(u => ethnicities.includes(u.ethnicity));
  const unknown = taken.filter(u => !ethnicities.includes(u.ethnicity));
  const counts = Object.fromEntries(ethnicities.map(e => [e, confirmed.filter(u => u.ethnicity === e).length]));
  const differences = Object.fromEntries(ethnicities.map(e => [e, Number(opening[e]) - Number(remaining[e])]));
  if (ethnicities.some(e => !Number.isInteger(differences[e]) || differences[e] < 0 || counts[e] > differences[e])) {
    return { valid: false, reason: "Quota figures conflict with confirmed assignments", assignments: {} };
  }
  const needs = Object.fromEntries(ethnicities.map(e => [e, differences[e] - counts[e]]));
  if (ethnicities.reduce((sum, e) => sum + needs[e], 0) !== unknown.length) {
    return { valid: false, reason: "Quota differences cannot uniquely reconcile taken units", assignments: {} };
  }
  const assignments = {};
  const sorted = [...unknown].sort((a,b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
  for (const unit of sorted) {
    const ethnicity = ethnicities.find(e => needs[e] > 0);
    assignments[unit.id] = { ethnicity, estimated: true };
    needs[ethnicity]--;
  }
  return { valid: true, assignments, confirmedCount: confirmed.length, estimatedCount: unknown.length };
}
