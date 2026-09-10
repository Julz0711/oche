import Link from 'next/link';
import { tokens } from '@/lib/theme';

export const metadata = {
  title: 'Terms of Service - Oche',
  description: 'Terms of service for Oche darts scoring app',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: tokens.oche }}>
      <div className="page-gutters max-w-2xl mx-auto px-3 py-3 md:px-4 md:py-12" style={{ color: tokens.chalk }}>
        <Link href="/" className="text-sm font-bold uppercase tracking-widest min-h-11 flex items-center mb-4 md:mb-8" style={{ color: tokens.wire }}>
          ← Back to Oche
        </Link>

        <h1 className="page-title mb-4 md:mb-8" style={{ color: tokens.wire }}>
          Terms of Service
        </h1>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: tokens.sisal }}>
          <section>
            <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3" style={{ color: tokens.chalk }}>1. Acceptance of Terms</h2>
            <p>
              By accessing and using Oche, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3" style={{ color: tokens.chalk }}>2. Use License</h2>
            <p>
              Permission is granted to temporarily download one copy of the materials (information or software) on Oche for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Modifying or copying the materials</li>
              <li>Using the materials for any commercial purpose or for any public display</li>
              <li>Attempting to decompile or reverse engineer any software contained on Oche</li>
              <li>Removing any copyright or other proprietary notations from the materials</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3" style={{ color: tokens.chalk }}>3. Disclaimer</h2>
            <p>
              The materials on Oche are provided on an "as is" basis. Oche makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3" style={{ color: tokens.chalk }}>4. Limitations</h2>
            <p>
              In no event shall Oche or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Oche.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3" style={{ color: tokens.chalk }}>5. Accuracy of Materials</h2>
            <p>
              The materials appearing on Oche could include technical, typographical, or photographic errors. Oche does not warrant that any of the materials on its website are accurate, complete, or current. Oche may make changes to the materials contained on its website at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3" style={{ color: tokens.chalk }}>6. Links</h2>
            <p>
              Oche has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Oche of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3" style={{ color: tokens.chalk }}>7. Modifications</h2>
            <p>
              Oche may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3" style={{ color: tokens.chalk }}>8. Governing Law</h2>
            <p>
              These terms and conditions are governed by and construed in accordance with the laws of your jurisdiction, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
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
