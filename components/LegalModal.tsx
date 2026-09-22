import React, { useState } from 'react';

export type LegalTab = 'privacy' | 'terms';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy',
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const [copied, setCopied] = useState(false);

  // Sync initial tab when modal opens or initialTab changes
  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="legal-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div
        id="legal-modal-container"
        className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-default rounded-2xl shadow-2xl flex flex-col overflow-hidden text-main"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-default bg-card-secondary/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h2 id="legal-modal-title" className="font-cinzel text-lg font-bold text-main">
                Legal &amp; Privacy Policies
              </h2>
              <p className="text-xs text-muted">
                Sacred Steps to Redemption &bull; Kya Daisy Publishing (2026 Edition)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Print policy"
              className="p-2 rounded-lg text-muted hover:text-main hover:bg-card border border-default/60 transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              id="legal-modal-close-btn"
              onClick={onClose}
              className="p-2 rounded-lg text-muted hover:text-main hover:bg-card border border-default/60 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex border-b border-default bg-card px-6 pt-2 gap-3">
          <button
            id="tab-btn-privacy"
            onClick={() => setActiveTab('privacy')}
            className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'privacy'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-main'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Privacy Policy</span>
          </button>

          <button
            id="tab-btn-terms"
            onClick={() => setActiveTab('terms')}
            className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'terms'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-main'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>Terms &amp; Conditions</span>
          </button>
        </div>

        {/* Modal Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 text-sm leading-relaxed text-muted">
          {activeTab === 'privacy' ? (
            /* PRIVACY POLICY CONTENT */
            <article id="privacy-policy-body" className="space-y-6">
              <div className="border-b border-default pb-4">
                <span className="text-[11px] font-mono uppercase tracking-widest text-primary font-bold">
                  Official Policy Document
                </span>
                <h3 className="font-cinzel text-xl font-bold text-main mt-1">
                  Privacy Policy &amp; Confidentiality Guarantee
                </h3>
                <p className="text-xs text-muted mt-1">
                  <strong>Effective Date:</strong> January 1, 2026 &bull; <strong>Publisher:</strong> Kya Daisy Publishing &bull; <strong>Author:</strong> C. Lamont Patrick
                </p>
              </div>

              {/* Strict Confidentiality Banner */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/25 space-y-1 text-main text-xs">
                <div className="flex items-center gap-2 font-bold text-primary text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>Our Sacred Commitment to Your Confidentiality</span>
                </div>
                <p className="text-muted leading-relaxed">
                  Recovery requires absolute psychological safety. We hold your thoughts, prayers, moral inventories, urge reflections, and struggles as sacred and confidential. We never monetize, sell, advertise against, or expose your recovery data to third parties.
                </p>
              </div>

              {/* 1. Introduction */}
              <section className="space-y-2">
                <h4 className="font-bold text-main text-base font-cinzel">1. Introduction</h4>
                <p>
                  This Privacy Policy governs the <strong>Sacred Steps to Redemption</strong> application, guided journal, and digital companion platform (&ldquo;the Application&rdquo; or &ldquo;the Service&rdquo;), published by <strong>Kya Daisy Publishing</strong> and written by <strong>C. Lamont Patrick</strong>. This policy describes how we collect, store, protect, and handle information when you interact with our digital tools.
                </p>
              </section>

              {/* 2. Nature of Data & Sensitive Information */}
              <section className="space-y-2">
                <h4 className="font-bold text-main text-base font-cinzel">2. Sensitive Recovery Data You Provide</h4>
                <p>
                  Because this application is a dedicated 52-week addiction recovery and spiritual journal, you may choose to enter sensitive personal information, including:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Scribal Responses &amp; Reflections:</strong> Your written entries for daily reflections, weekly thematic questions, and spiritual aspirations.</li>
                  <li><strong>Ledger of Light Entries:</strong> Gratitude items, blessings, and emotional shifts logged over time.</li>
                  <li><strong>Trigger Tracker Data:</strong> Environmental, emotional, or cognitive cravings and urges, as well as coping strategies.</li>
                  <li><strong>Sobriety Date &amp; Streaks:</strong> Milestones, recovery anniversaries, and day counters.</li>
                  <li><strong>Audio &amp; Voice Transcripts:</strong> Audio recordings or dictated reflections created within the voice reflection tools.</li>
                </ul>
              </section>

              {/* 3. Local-First Architecture & Storage */}
              <section className="space-y-2">
                <h4 className="font-bold text-main text-base font-cinzel">3. Local-First Architecture &amp; Offline Persistence</h4>
                <p>
                  To maximize privacy and guarantee uninterrupted access anywhere—even without an internet connection—the Application is built with a <em>local-first</em> architecture:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your journal reflections, streak counts, and settings are stored directly on your personal device using standard browser storage mechanisms (LocalStorage and IndexedDB).</li>
                  <li>You are not required to create an account or provide an email address to use the full 52-week journal, daily prayers, audio soundscapes, or trigger trackers.</li>
                  <li>A personal 4-digit PIN lock feature is provided to protect your screen from casual inspection by others who may handle your device.</li>
                </ul>
              </section>

              {/* 4. Firebase Authentication & Cloud Sync */}
              <section className="space-y-2">
                <h4 className="font-bold text-main text-base font-cinzel">4. Optional Cloud Synchronization (Firebase)</h4>
                <p>
                  If you voluntarily choose to sign in using Firebase Authentication (e.g., via Google Sign-In or Email/Password):
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Purpose:</strong> Cloud synchronization allows your journal reflections and recovery milestones to backup securely and sync across your phone, tablet, and computer.</li>
                  <li><strong>Data Isolation:</strong> Your data is stored in Google Cloud Firestore in isolated user documents tagged with your unique User Identifier (UID).</li>
                  <li><strong>Strict Security Rules:</strong> Our Firestore security rules strictly prohibit any user from reading, writing, or querying another user&apos;s data. All data transfers are encrypted in transit using industry-standard TLS/SSL (HTTPS).</li>
                </ul>
              </section>

              {/* 5. Artificial Intelligence & Gemini API Processing */}
              <section className="space-y-2">
                <h4 className="font-bold text-main text-base font-cinzel">5. Artificial Intelligence &amp; Prompt Privacy</h4>
                <p>
                  When you utilize on-demand AI features (such as generating reflective poetry, scripture grounding, or parable study):
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Requests are processed via secure server-side connections to Google&apos;s Gemini API.</li>
                  <li><strong>No Training on Your Personal Journal:</strong> Your private journal entries, moral inventories, and personal admissions are <strong>never</strong> used to train public machine learning foundation models.</li>
                  <li>Generative queries are processed ephemerally and returned to your active session.</li>
                </ul>
              </section>

              {/* 6. No Third-Party Trackers or Advertising */}
              <section className="space-y-2">
                <h4 className="font-bold text-main text-base font-cinzel">6. Tracking, Cookies &amp; Advertising Disclosures</h4>
                <p>
                  We believe commercial advertising and invasive behavioral telemetry have no place in recovery and spiritual healing:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>We do <strong>not</strong> display third-party behavioral advertisements or commercial affiliate banners.</li>
                  <li>We do <strong>not</strong> sell, license, or exchange your personal information with data brokers, ad networks, or commercial pharmaceutical entities.</li>
                  <li>Cookies and local web storage are utilized strictly for functional session preferences (e.g., active week, sound volume, PIN security, and color theme).</li>
                </ul>
              </section>

              {/* 7. Data Retention & Export Rights */}
              <section className="space-y-2">
                <h4 className="font-bold text-main text-base font-cinzel">7. Your Rights: Exporting &amp; Deleting Your Data</h4>
                <p>
                  You hold full autonomy over your recovery records:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Right to Export:</strong> You may print or export your weekly reflections, completed stages, and gratitude journal entries at any time using the built-in Print Preview.</li>
                  <li><strong>Right to Erase:</strong> You can purge your local browser cache at any time via your browser settings or application controls. If synced to Firebase, you may request permanent deletion of your cloud account and associated records by contacting us.</li>
                </ul>
              </section>

              {/* 8. Children's Privacy */}
              <section className="space-y-2">
                <h4 className="font-bold text-main text-base font-cinzel">8. Children&apos;s Privacy (COPPA)</h4>
                <p>
                  The Application is designed for adult individuals navigating substance use recovery, spiritual growth, and personal development. It is not directed toward children under 13 years of age, and we do not knowingly collect personal information from minors.
                </p>
              </section>

              {/* 9. Contact Information */}
              <section className="space-y-2 pt-2 border-t border-default">
                <h4 className="font-bold text-main text-base font-cinzel">9. Contacting Kya Daisy Publishing</h4>
                <p>
                  For privacy inquiries, data requests, or feedback regarding this policy, please reach out directly:
                </p>
                <div className="p-3 bg-card-secondary rounded-lg border border-default text-xs space-y-1">
                  <p><strong className="text-main">Publisher:</strong> Kya Daisy Publishing (2026 Edition)</p>
                  <p><strong className="text-main">Author &amp; Curriculum Director:</strong> C. Lamont Patrick</p>
                  <p><strong className="text-main">Email:</strong> <a href="mailto:clamontpatrick@gmail.com" className="text-primary underline">clamontpatrick@gmail.com</a></p>
                </div>
              </section>
            </article>
          ) : (
            /* TERMS AND CONDITIONS CONTENT */
            <article id="terms-conditions-body" className="space-y-6">
              <div className="border-b border-default pb-4">
                <span className="text-[11px] font-mono uppercase tracking-widest text-primary font-bold">
                  User Agreement &amp; Disclaimers
                </span>
                <h3 className="font-cinzel text-xl font-bold text-main mt-1">
                  Terms &amp; Conditions of Use
                </h3>
                <p className="text-xs text-muted mt-1">
                  <strong>Last Revised:</strong> January 1, 2026 &bull; <strong>Publisher:</strong> Kya Daisy Publishing &bull; <strong>Author:</strong> C. Lamont Patrick
                </p>
              </div>

              {/* CRITICAL MEDICAL EMERGENCY DISCLAIMER BOX */}
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-main space-y-2">
                <div className="flex items-center gap-2 font-bold text-red-500 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>IMPORTANT: Not Medical, Psychiatric, or Emergency Advice</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  <strong>Sacred Steps to Redemption</strong> is a faith-based spiritual curriculum, reflective journaling companion, and educational aid. <strong>It is not a licensed healthcare provider, medical clinic, hospital, or crisis center.</strong>
                </p>
                <div className="text-xs bg-card p-3 rounded-lg border border-default space-y-1 text-muted">
                  <p className="font-semibold text-main">If you are facing an urgent crisis or severe withdrawal:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Call or text <strong className="text-main font-mono">988</strong> to reach the Suicide &amp; Crisis Lifeline (Available 24/7, free &amp; confidential in the US &amp; Canada).</li>
                    <li>Call <strong className="text-main font-mono">1-800-662-4357</strong> for the SAMHSA National Treatment Helpline.</li>
                    <li>In acute medical emergencies or risk of overdose, dial <strong className="text-main font-mono">911</strong> immediately.</li>
                  </ul>
                </div>
              </div>

              {/* 1. Acceptance of Terms */}
              <section className="space-y-2">
                <h4 className="font-bold text-main text-base font-cinzel">1. Acceptance of Terms</h4>
                <p>
                  By accessing, viewing, creating reflections in, or downloading materials from the <strong>Sacred Steps to Redemption</strong> application (&ldquo;the Service&rdquo;), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree, please do not use the Service.
                </p>
              </section>

              {/* 2. Educational & Spiritual Companion Scope */}
              <section className="space-y-2">
                <h4 className="font-bold text-main text-base font-cinzel">2. Nature of the Service &amp; User Discretion</h4>
                <p>
                  The reflections, 52-week thematic progressions, biblical passages, and audio soundscapes are designed to supplement personal spiritual growth and complement traditional mutual-aid recovery programs (such as Alcoholics Anonymous, Narcotics Anonymous, Celebrate Recovery, or licensed clinical therapies). You acknowledge that:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Addiction recovery involves complex physiological and psychological processes. You should always seek the advice of a qualified physician, psychiatrist, or licensed addiction counselor with any questions regarding medical detoxification, mental health symptoms, or pharmaceutical interventions.</li>
                  <li>Never disregard professional clinical guidance or delay seeking professional medical treatment because of something you have read, heard, or contemplated in this application.</li>
                </ul>
              </section>

              {/* 3. Intellectual Property Rights */}
              <section className="space-y-2">
                <h4 className="font-bold text-main text-base font-cinzel">3. Intellectual Property &amp; Copyright Notice</h4>
                <p>
                  All materials contained in this application—including but not limited to the curriculum text of <em>&ldquo;Sacred Steps to Redemption: A Prayerful Path to Addiction Recovery&rdquo;</em>, 52-week devotional themes, biblical aspirations, original music compositions, lyrics, graphic art, brand marks, and digital code—are protected by copyright, trademark, and other applicable intellectual property laws:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Copyright Holders:</strong> Copyright &copy; 2025–2026 by <strong>Kya Daisy Publishing</strong> and <strong>C. Lamont Patrick</strong>. All worldwide rights reserved.</li>
                  <li><strong>Limited License:</strong> You are granted a revocable, non-exclusive, non-transferable personal license to view, read, play audio, and record your personal journaling entries for individual, non-commercial use.</li>
                  <li><strong>Prohibited Uses:</strong> You may not commercially reproduce, resell, broadcast, redistribute, or create derivative commercial works from the curriculum text, songs, or proprietary materials without express written authorization from Kya Daisy Publishing.</li>
                </ul>
              </section>

              {/* 4. User-Generated Journal Entries */}
              <section className="space-y-2">
                <h4 className="font-bold text-main text-base font-cinzel">4. Ownership of Your Journal Responses</h4>
                <p>
                  You retain 100% full and unencumbered ownership of all personal writings, reflections, moral inventories, and gratitude entries that you compose within the application. We do not claim any proprietary interest in your private expressions of recovery.
                </p>
              </section>

              {/* 5. User Conduct & Security */}
              <section className="space-y-2">
                <h4 className="font-bold text-main text-base font-cinzel">5. Security, Passcodes &amp; Acceptable Use</h4>
                <p>
                  When using the application, you agree to:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Maintain personal responsibility for the confidentiality of any PIN code or login credentials you establish.</li>
                  <li>Not attempt to disrupt, reverse-engineer, inject harmful code, or compromise the stability of the application infrastructure.</li>
                  <li>Treat fellow recovery participants with dignity and respect whenever interacting in community spaces or shared meetings.</li>
                </ul>
              </section>

              {/* 6. Disclaimer of Warranties */}
              <section className="space-y-2">
                <h4 className="font-bold text-main text-base font-cinzel">6. Disclaimer of Warranties</h4>
                <p>
                  THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF TITLE, NON-INFRINGEMENT, OR FITNESS FOR A PARTICULAR HEALING OR MEDICAL PURPOSE. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR COMPLETELY ERROR-FREE.
                </p>
              </section>

              {/* 7. Limitation of Liability */}
              <section className="space-y-2">
                <h4 className="font-bold text-main text-base font-cinzel">7. Limitation of Liability</h4>
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER KYA DAISY PUBLISHING, AUTHOR C. LAMONT PATRICK, NOR ANY AFFILIATES SHALL BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR ACCESS TO, USE OF, OR INABILITY TO USE THIS APPLICATION, INCLUDING ANY RELAPSE EVENT, MEDICAL COMPLICATION, OR LOSS OF PERSONAL DATA.
                </p>
              </section>

              {/* 8. Modifications to Terms */}
              <section className="space-y-2">
                <h4 className="font-bold text-main text-base font-cinzel">8. Modifications &amp; Governing Law</h4>
                <p>
                  Kya Daisy Publishing reserves the right to modify these Terms &amp; Conditions periodically. Continued use of the application following the posting of revised terms constitutes your acceptance. These terms shall be governed by and construed in accordance with the laws of the United States.
                </p>
              </section>

              {/* 9. Contact */}
              <section className="space-y-2 pt-2 border-t border-default">
                <h4 className="font-bold text-main text-base font-cinzel">9. Inquiries &amp; Author Correspondence</h4>
                <div className="p-3 bg-card-secondary rounded-lg border border-default text-xs space-y-1">
                  <p><strong className="text-main">Publisher:</strong> Kya Daisy Publishing (2026 Edition)</p>
                  <p><strong className="text-main">Author:</strong> C. Lamont Patrick</p>
                  <p><strong className="text-main">Direct Inquiries:</strong> <a href="mailto:clamontpatrick@gmail.com" className="text-primary underline">clamontpatrick@gmail.com</a></p>
                </div>
              </section>
            </article>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-default bg-card-secondary/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-muted">
            Questions? Contact <a href="mailto:clamontpatrick@gmail.com" className="text-primary font-medium hover:underline">clamontpatrick@gmail.com</a>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg border border-default bg-card text-muted hover:text-main text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copied ? 'Copied URL!' : 'Share Link'}</span>
            </button>
            <button
              id="legal-modal-done-btn"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
