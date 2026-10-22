import LegalShell from "@/components/LegalShell";
import { LEGAL } from "@/lib/legal";

export default function Page() {
  return (
    <LegalShell title="Widerrufsbelehrung" updated={LEGAL.updated}>
      <h2>Widerrufsrecht für Verbraucher (EU)</h2>
      <p>Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Frist beginnt mit dem Tag des Vertragsabschlusses.</p>
      <h2>Ausübung des Widerrufs</h2>
      <p>{LEGAL.name}, {LEGAL.address}, E-Mail: {LEGAL.email} — mittels eindeutiger Erklärung (z. B. E-Mail).</p>
      <h2>Wichtig: Digitale Inhalte</h2>
      <p>Bei digitalen Inhalten, die nicht auf einem körperlichen Datenträger geliefert werden, erlischt das Widerrufsrecht vorzeitig, wenn Sie ausdrücklich zugestimmt haben, dass wir vor Ablauf der Widerrufsfrist mit der Ausführung beginnen, und Sie bestätigt haben, dass Sie durch diese Zustimmung Ihr Widerrufsrecht verlieren. Diese Zustimmung holen wir im Checkout ein.</p>
      <h2>Folgen des Widerrufs</h2>
      <p>Erstattung erhaltener Leistungen einschließlich Standard-Lieferkosten innerhalb von 14 Tagen.</p>
      <h2>Muster-Widerrufsformular</h2>
      <p>An {LEGAL.name}, {LEGAL.address}, E-Mail: {LEGAL.email} — Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung: [Abo-Angabe], Bestellt am: [Datum], Name: […], Anschrift: […], Datum.</p>
    </LegalShell>
  );
}
