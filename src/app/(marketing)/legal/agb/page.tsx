import LegalShell from "@/components/LegalShell";
import { LEGAL } from "@/lib/legal";

export default function Page() {
  return (
    <LegalShell title="Allgemeine Geschäftsbedingungen" updated={LEGAL.updated}>
      <h2>§ 1 Geltungsbereich</h2>
      <p>Diese AGB gelten für die Nutzung von Wesh Star IA durch Verbraucher und Unternehmer.</p>
      <h2>§ 2 Vertragsgegenstand</h2>
      <p>Bereitstellung einer Software-as-a-Service-Plattform zur KI-gestützten Generierung von Videos (Abonnements: Gratis-Test sowie 5 €, 7 €, 10 €, 15 €, 20 €, 30 €, 40 € und 50 €/Monat).</p>
      <h2>§ 3 Abo, Preise, Laufzeit</h2>
      <ul>
        <li>Abos sind monatlich kündbar; es gilt das jeweils im Checkout ausgewiesene Entgelt.</li>
        <li>Nach Kündigung verfällt der Premium-Zugang zum Ende des Abrechnungszeitraums; der Account wechselt auf den Gratis-Tarif.</li>
        <li>Fair-Use: Gratis-Test plus steigende Monatsquoten je nach Tarif (5 € bis 50 €) (Details in den Planeinstellungen).</li>
      </ul>
      <h2>§ 4 Rechte an generierten Inhalten</h2>
      <p>Dem Nutzer werden diejenigen Nutzungsrechte an generierten Videos eingeräumt, die das jeweilige eingesetzte KI-Modell vergibt. Eine Garantie für Verfügbarkeit, Freigabe durch Drittplattformen oder bestimmte Inhalte besteht nicht.</p>
      <h2>§ 5 Verfügbarkeit, Störungen</h2>
      <p>Wir streben eine hohe Verfügbarkeit an, schulden jedoch keine bestimmte Erreichbarkeit. Störungen durch Drittanbieter (KI-API, Zahlungsdienstleister) sind uns nicht anzurechnen; entstandene Generierungsgutschriften werden bei Ausfall erstattet.</p>
      <h2>§ 6 Haftung</h2>
      <p>Unbeschränkte Haftung bei Vorsatz und grober Fahrlässigkeit; im Übrigen Beschränkung auf den dreifachen Monatsbeitrag, ausgenommen Verletzung von Leben, Körper, Gesundheit.</p>
      <h2>§ 7 Schlussbestimmungen</h2>
      <p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Anbieter: {LEGAL.name}, {LEGAL.address}.</p>
    </LegalShell>
  );
}
