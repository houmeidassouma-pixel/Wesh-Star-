import LegalShell from "@/components/LegalShell";
import { LEGAL } from "@/lib/legal";

export default function Page() {
  return (
    <LegalShell title="Impressum" updated={LEGAL.updated}>
      <h2>Diensteanbieter</h2>
      <p>{LEGAL.name}<br />{LEGAL.address}</p>
      <h2>Kontakt</h2>
      <p>E-Mail: {LEGAL.email}</p>
      <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
      <p>{LEGAL.name}, Anschrift wie oben.</p>
      {LEGAL.vatId ? (<><h2>Umsatzsteuer</h2><p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {LEGAL.vatId}</p></>) : null}
      <h2>Verbraucherstreitbeilegung</h2>
      <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
    </LegalShell>
  );
}
