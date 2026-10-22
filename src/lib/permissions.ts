// Granular staff permissions. Admins implicitly have ALL permissions.
// Moderators/editors only get what the main admin explicitly grants.
export const MOD_PERMISSIONS = [
  { key: "review",   label: "Inhalte prüfen & freigeben" },
  { key: "remove",   label: "Inhalte entfernen" },
  { key: "warn",     label: "Verwarnungen aussprechen" },
  { key: "block",    label: "Benutzer sperren/entsperren" },
  { key: "viewLogs", label: "Protokolle einsehen" },
  { key: "autopilot", label: "Publication automatique pour son propre compte" },
  { key: "promotion", label: "Utiliser la promotion / outro automatique" }
] as const;

export type ModPermission = (typeof MOD_PERMISSIONS)[number]["key"];

export function hasPerm(perms: unknown, key: ModPermission): boolean {
  return Array.isArray(perms) && perms.includes(key);
}
