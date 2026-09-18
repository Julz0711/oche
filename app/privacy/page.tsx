import { AppBar } from '@/components/molecules';

export const metadata = {
  title: 'Privacy Policy - Oche',
  description: 'Privacy policy for Oche darts scoring app',
};

export default function PrivacyPage() {
  return (
    <main className="legal-page page-gutters">
      <AppBar back={{ href: '/', label: 'Back to Oche' }} eyebrow="Oche" title="Privacy policy" />

      <div className="legal-copy">
          <section>
            <h2>Introduction</h2>
            <p>
              Oche ("we", "our", or "us") operates the Oche darts scoring application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our service.
            </p>
          </section>

          <section>
            <h2>Information Collection and Use</h2>
            <p>
              We collect information you provide directly to us when you sign in through Google or Discord. This information includes your name, email address, and profile picture from your OAuth provider. We use this information solely to create and maintain your account and to improve our service.
            </p>
          </section>

          <section>
            <h2>Data Storage</h2>
            <p>
              Your account information and game statistics are stored in our database. We do not share your personal information with third parties beyond what is necessary to operate the service.
            </p>
          </section>

          <section>
            <h2>Security</h2>
            <p>
              We take the security of your information seriously. We use industry-standard encryption and security measures to protect your data. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2>Your Rights</h2>
            <p>
              You have the right to access, update, or delete your account information at any time. You can also request deletion of your account and all associated data.
            </p>
          </section>

          <section>
            <h2>Changes to This Privacy Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes by updating the date at the bottom of this page.
            </p>
          </section>

          <section>
            <h2>Contact Us</h2>
            <p>
              If you have questions about this privacy policy, please contact us through our website.
            </p>
          </section>

          <div className="legal-updated">
            <p className="t-meta">Last updated: September 2026</p>
          </div>
        </div>
    </main>
  );
}
