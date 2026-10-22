import LegalShell from "@/components/LegalShell";
import { LEGAL } from "@/lib/legal";

export default function Page() {
  return (
    <LegalShell title="Datenschutzerklärung" updated={LEGAL.updated}>
      <h2>1. Verantwortlicher</h2>
      <p>{LEGAL.name}, {LEGAL.address}, E-Mail: {LEGAL.email}</p>
      <h2>2. Datenverarbeitung im Überblick</h2>
      <p>Bei Nutzung von Wesh Star IA verarbeiten wir:</p>
      <ul>
        <li><strong>Kontodaten</strong> (E-Mail, Passwort-Hash) — gespeichert in unserer eigenen, selbst betriebenen PostgreSQL-Datenbank. Kein externer Auftragsverarbeiter.</li>
        <li><strong>Abodaten</strong> — Zahlungen werden über das integrierte Wesh Star IA Direct Zahlungsmodul abgewickelt. Wesh Star IA speichert Zahlungsreferenz, Betrag und Zahlungsstatus, aber keine vollständigen Kartendaten.</li>
        <li><strong>Generierte Inhalte</strong> (Prompts, Videos) — Speicherung im privaten Dateispeicher des eigenen Wesh-Star-Servers; Auslieferung nur per signierter URL nach Berechtigungsprüfung.</li>
        <li><strong>Technische Daten</strong> (IP, Zeitpunkt) in Server-Logs zur Absicherung (Rate-Limits, Missbrauchsprävention).</li>
      </ul>
      <h2>3. Rechtsgrundlagen</h2>
      <p>Art. 6 Abs. 1 lit. b DSGVO (Vertrag), lit. f (berechtigtes Interesse an Systemsicherheit), lit. a (Einwilligung, soweit erforderlich).</p>
      <h2>4. Auftragsverarbeiter</h2>
      <p>Der eigene Wesh Star IA-Server (Datenbank, Speicher, Anwendung) sowie der eigene Wesh Star IA GPU-Worker (KI-Rendering). Alles wird selbst betrieben — keine externen Auftragsverarbeiter für Kontodaten, Videos oder Bilder.</p>
      <h2>5. Ihre Rechte</h2>
      <p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch (Art. 15–21 DSGVO) sowie Beschwerde bei der Aufsichtsbehörde. Kontakt: {LEGAL.email}.</p>
      <h2>6. Speicherdauer</h2>
      <p>Kontodaten bis zur Kontolöschung; Abo- und Rechnungsdaten gemäß steuerrechtlicher Aufbewahrungsfristen (10 Jahre); Server-Logs maximal 30 Tage.</p>
    </LegalShell>
  );
}
