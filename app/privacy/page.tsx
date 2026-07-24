import type { Metadata } from "next";
import { LegalCallout, LegalPage, LegalSection } from "@/src/ui/legal/LegalPage";

const LAST_UPDATED = "2026-07-24";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Decentroneum and Decent Wallet handle your data. We are non-custodial: your keys and recovery phrase never leave your device.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy • Decentroneum",
    description:
      "How Decentroneum and Decent Wallet handle your data. Non-custodial by design — your keys never leave your device.",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="Decentroneum and Decent Wallet are built to need as little of your data as possible. This page explains exactly what we do and don't handle."
      lastUpdated={LAST_UPDATED}
    >
      <LegalSection heading="The short version">
        <p>
          Decent Wallet is <strong className="text-foreground">non-custodial</strong>. Your private keys and
          recovery phrase are generated on your device, encrypted with a key derived from your passcode, and
          stored only in your device&apos;s secure hardware storage (iOS Keychain / Android Keystore). They are
          never transmitted to us or anyone else.
        </p>
        <LegalCallout>
          <p className="text-foreground">
            We cannot access your funds, and we cannot recover your wallet for you. If you lose your recovery
            phrase, no one — including us — can restore access. Back it up somewhere safe and offline.
          </p>
        </LegalCallout>
      </LegalSection>

      <LegalSection heading="What we don't collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>Your recovery phrase, private keys, or passcode. These never leave your device.</li>
          <li>Any account, email address, phone number, or identity document — none is required to use us.</li>
          <li>
            Analytics, advertising, or crash-reporting data. As of the date above we run no such SDKs in the
            mobile app. If that ever changes, this page will be updated first.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="What we do handle">
        <p>
          <strong className="text-foreground">Your wallet address.</strong> Public by the nature of a
          blockchain and not sensitive on its own. We use it to display your balances and activity, and — if you
          allow notifications — to know which address to watch.
        </p>
        <p>
          <strong className="text-foreground">Push notification registration.</strong> If you enable
          notifications in Decent Wallet, your wallet address and your device&apos;s push token (an
          Apple/Google-issued identifier that routes notifications to your specific device) are registered with
          our notification server so we can alert you about incoming transactions while the app is closed.
          Registration is authenticated with a signature from your wallet — this does not reveal your private
          key. This is the only data our servers retain.
        </p>
        <p>
          <strong className="text-foreground">Blockchain queries.</strong> Showing balances and history requires
          querying public Electroneum Smart Chain nodes and a block explorer. Those requests necessarily expose
          your IP address and the wallet address being queried to those infrastructure providers, exactly as any
          blockchain wallet does. Their own logging practices are outside our control.
        </p>
        <p>
          <strong className="text-foreground">This website.</strong> Connecting a wallet on decentroneum.com
          stores your address in your browser&apos;s local storage so the site remembers you between visits. It
          is not sent to us. Clearing your browser data or disconnecting removes it.
        </p>
        <p>
          <strong className="text-foreground">On-device data.</strong> The wallet keeps a local log of your
          notifications and a list of recently visited sites in its browser, both stored on your device only and
          clearable at any time.
        </p>
      </LegalSection>

      <LegalSection heading="Third-party apps you connect to">
        <p>
          Decent Wallet lets you connect to third-party decentralized applications, through its in-app browser or
          via WalletConnect. Anything you do on those sites is governed by that site&apos;s own privacy policy,
          not this one. We don&apos;t monitor or log your activity on them.
        </p>
      </LegalSection>

      <LegalSection heading="Your controls">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Remove one account</strong> — Settings → Accounts. Deletes that
            account&apos;s key material from your device, its push registration on our server, and its local
            notification history.
          </li>
          <li>
            <strong className="text-foreground">Erase everything</strong> — Settings → Erase wallet. Deletes all
            accounts from your device, every push registration tied to it, and your entire local notification
            history.
          </li>
          <li>
            <strong className="text-foreground">Disconnect a site</strong> — from the wallet&apos;s Connections
            list, or from the site itself.
          </li>
          <li>
            <strong className="text-foreground">Uninstall the app</strong> — removes all on-device data, subject
            to your phone&apos;s own backup settings.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="International use">
        <p>
          Our apps are available worldwide, and data-protection laws vary by country (GDPR in the EU and UK,
          CCPA/CPRA in California, and others). Because we deliberately collect so little personal data, the
          rights those laws grant — access, deletion, portability — are largely satisfied by the in-app controls
          above. If you need something beyond them, contact us using the links at the bottom of this page.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>
          Our apps are not directed at children, and should not be used by anyone below the age at which they
          can lawfully hold or transact in cryptocurrency without a guardian in their jurisdiction.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p>
          We&apos;ll revise the date at the top when this changes, and surface an in-app notice for anything
          material.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
