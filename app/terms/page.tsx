import type { Metadata } from "next";
import { LegalCallout, LegalPage, LegalSection } from "@/src/ui/legal/LegalPage";

const LAST_UPDATED = "2026-07-24";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of Decentroneum and Decent Wallet — non-custodial software for the Electroneum Smart Chain.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service • Decentroneum",
    description:
      "The terms that govern your use of Decentroneum and Decent Wallet — non-custodial software for the Electroneum Smart Chain.",
    url: "/terms",
  },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms govern your use of the Decentroneum website, its tools, and the Decent Wallet mobile app."
      lastUpdated={LAST_UPDATED}
    >
      <LegalSection heading="1. What Decentroneum provides">
        <p>
          Decentroneum publishes web tools for the Electroneum Smart Chain and Decent Wallet, a non-custodial
          mobile wallet. All of it is <strong className="text-foreground">software</strong>, not a financial
          service. We never hold, control, or have access to your funds or private keys.
        </p>
        <LegalCallout>
          <p className="text-foreground">
            You are solely responsible for your recovery phrase. We cannot reset it, recover it, or restore your
            account. Anyone who obtains it can take your funds.
          </p>
        </LegalCallout>
      </LegalSection>

      <LegalSection heading="2. Eligibility">
        <p>
          You must be legally permitted to use cryptocurrency software where you live, and old enough to do so
          without a guardian&apos;s consent under your local law.
        </p>
      </LegalSection>

      <LegalSection heading="3. No custody, no advice">
        <p>
          We do not custody assets, execute trades on your behalf, or provide financial, investment, tax, or
          legal advice. Nothing on our site or in our apps is a recommendation to buy, sell, or hold any asset.
          Cryptocurrency prices are volatile, and blockchain transactions are generally irreversible once
          broadcast — you accept all risk of loss.
        </p>
      </LegalSection>

      <LegalSection heading="4. Our on-chain tools">
        <p>
          Tools such as the token creator, bulk sender, token locker, token burner, and approval revoker
          construct blockchain transactions that <em>you</em> sign and broadcast from your own wallet. Once a
          transaction is confirmed it cannot be reversed by us or anyone else. Verify every detail — recipient
          addresses, amounts, token contracts, lock durations — before you sign. Mistakes are permanent.
        </p>
      </LegalSection>

      <LegalSection heading="5. Third-party applications">
        <p>
          Decent Wallet can connect to third-party decentralized applications through its in-app browser or
          WalletConnect. We do not control, endorse, audit, or take responsibility for any dApp, smart contract,
          or website you interact with. Review what you are approving carefully — a malicious or buggy contract
          can drain funds you grant it access to.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your responsibilities">
        <ul className="list-disc space-y-2 pl-5">
          <li>Keep your recovery phrase, passcode, and device secure.</li>
          <li>Verify transaction details before confirming — we cannot reverse a broadcast transaction.</li>
          <li>Comply with all laws that apply to you, including any tax reporting obligations.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="7. Prohibited use">
        <p>
          You may not use our software for money laundering, terrorist financing, sanctions evasion, fraud, or
          any other unlawful purpose, nor in any jurisdiction where doing so would break local law.
        </p>
      </LegalSection>

      <LegalSection heading="8. Disclaimers and limitation of liability">
        <p className="uppercase text-sm tracking-wide">
          The software is provided &quot;as is&quot;, without warranties of any kind. To the maximum extent
          permitted by law, we are not liable for any loss of funds, data, or profits arising from your use of
          it — including losses caused by lost recovery phrases, third-party dApp or smart contract behaviour,
          network congestion or outages, or software defects.
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes">
        <p>
          We may update these terms. Continuing to use our software after an update means you accept the revised
          terms.
        </p>
      </LegalSection>

      <LegalSection heading="10. Contact">
        <p>Use the links below to reach us with any questions about these terms.</p>
      </LegalSection>
    </LegalPage>
  );
}
