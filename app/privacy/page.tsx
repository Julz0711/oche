import { tokens } from '@/lib/theme';
import { BackLink } from '@/components/atoms/BackLink';

export const metadata = {
  title: 'Privacy Policy - Oche',
  description: 'Privacy policy for Oche darts scoring app',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: tokens.oche }}>
      <div className="page-gutters max-w-2xl mx-auto px-3 py-3 md:px-4 md:py-12" style={{ color: tokens.chalk }}>
        <div className="mb-4 md:mb-8"><BackLink href="/" label="Back to Oche" /></div>

        <h1 className="page-title mb-4 md:mb-8" style={{ color: tokens.wire }}>
          Privacy Policy
        </h1>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: tokens.sisal }}>
          <section>
            <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3" style={{ color: tokens.chalk }}>Introduction</h2>
            <p>
              Oche ("we", "our", or "us") operates the Oche darts scoring application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3" style={{ color: tokens.chalk }}>Information Collection and Use</h2>
            <p>
              We collect information you provide directly to us when you sign in through Google or Discord. This information includes your name, email address, and profile picture from your OAuth provider. We use this information solely to create and maintain your account and to improve our service.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3" style={{ color: tokens.chalk }}>Data Storage</h2>
            <p>
              Your account information and game statistics are stored in our database. We do not share your personal information with third parties beyond what is necessary to operate the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3" style={{ color: tokens.chalk }}>Security</h2>
            <p>
              We take the security of your information seriously. We use industry-standard encryption and security measures to protect your data. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3" style={{ color: tokens.chalk }}>Your Rights</h2>
            <p>
              You have the right to access, update, or delete your account information at any time. You can also request deletion of your account and all associated data.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3" style={{ color: tokens.chalk }}>Changes to This Privacy Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes by updating the date at the bottom of this page.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3" style={{ color: tokens.chalk }}>Contact Us</h2>
            <p>
              If you have questions about this privacy policy, please contact us through our website.
            </p>
          </section>

          <div className="pt-6 border-t" style={{ borderColor: `${tokens.sisal}33` }}>
            <p className="text-xs" style={{ color: tokens.sisal }}>Last updated: September 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
