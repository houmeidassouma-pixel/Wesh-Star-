import LegalShell from "@/components/LegalShell";
import { LEGAL } from "@/lib/legal";

export default function Page() {
  return (
    <LegalShell title="Kontakt" updated={LEGAL.updated}>
      <h2>So erreichen Sie uns</h2>
      <p>E-Mail: {LEGAL.email}<br />Antwortzeit: in der Regel innerhalb von 48 Stunden.</p>
      <h2>Support</h2>
      <p>Bitte nennen Sie Ihre Account-E-Mail und beschreiben Sie das Anliegen (Zahlung, Generation, Login). Für Moderationsanliegen wenden Sie sich über dieselbe Adresse an unser Moderationsteam.</p>
      <h2>Postanschrift</h2>
      <p>{LEGAL.name}, {LEGAL.address} — siehe auch Impressum.</p>
    </LegalShell>
  );
}
