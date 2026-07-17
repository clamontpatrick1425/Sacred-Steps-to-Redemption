import React, { useState } from 'react';

export const RecoverySEOFAQSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'features'>('timeline');

  // Semantic SVGs for high quality visual appeal
  const BookOpenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );

  const ShieldCheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );

  const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );

  return (
    <section id="recovery-seo-section" className="mt-12 bg-card rounded-xl border border-default p-6 md:p-8 shadow-sm text-main" aria-label="Recovery Guide and AEO Portal">
      {/* Editorial Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary-light/50 px-3 py-1 rounded-full">
          Science &amp; Faith Conjoined
        </span>
        <h2 className="text-3xl md:text-4xl font-bold mt-3 text-main">
          Understanding the 52-Week Recovery Journey
        </h2>
        <p className="mt-3 text-muted text-lg leading-relaxed">
          Rehabilitation from chemical and behavioral dependencies thrives on systematic, structured reflections.
          Our interactive guide pairs clinical cognitive reframing with spiritual guidance to foster permanent neuroplastic healing.
        </p>
      </div>

      {/* Tabs / Switcher for AEO layout crawls */}
      <div className="flex border-b border-default mb-8 justify-center">
        <button
          id="tab-toggle-timeline"
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 px-6 text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
            activeTab === 'timeline'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-main'
          }`}
        >
          52-Week Recovery Map &amp; Program Stages
        </button>
        <button
          id="tab-toggle-features"
          onClick={() => setActiveTab('features')}
          className={`pb-3 px-6 text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
            activeTab === 'features'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-main'
          }`}
        >
          Therapeutic Methodologies &amp; AI Enhancements
        </button>
      </div>

      {/* Dynamic Tab Pane 1: Program Stages Grid (Perfect table / direct-answer structure for GEO/AI summarizing bots) */}
      {activeTab === 'timeline' && (
        <div id="aeo-recovery-timeline-panel" className="space-y-6 fade-in animate-duration-150">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <article id="stage-1-card" className="p-5 bg-card-secondary rounded-lg border border-default">
              <div className="flex items-center space-x-2 text-primary font-bold mb-3">
                <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">I</span>
                <h3>Weeks 1 - 13: Grounding &amp; Surrender</h3>
              </div>
              <p className="text-sm text-muted mb-4 font-normal">
                Focuses on radical self-honesty, admitting powerlessness over addictive loops, setting emergency SOS contacts, and committing to initial detoxifying spiritual habits.
              </p>
              <ul className="text-xs text-muted space-y-1 bg-card p-3 rounded border border-default font-mono">
                <li>• Week 1: Grounding &amp; Surrender</li>
                <li>• Week 4: First Milestone</li>
                <li>• Target: Cravings stabilization</li>
              </ul>
            </article>

            <article id="stage-2-card" className="p-5 bg-card-secondary rounded-lg border border-default">
              <div className="flex items-center space-x-2 text-primary font-bold mb-3">
                <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">II</span>
                <h3>Weeks 14 - 26: Cognitive Reframing</h3>
              </div>
              <p className="text-sm text-muted mb-4 font-normal">
                A deeper cognitive dive to record daily emotional triggers, evaluate negative core beliefs, audit triggers, and build a personalized mental defense framework.
              </p>
              <ul className="text-xs text-muted space-y-1 bg-card p-3 rounded border border-default font-mono">
                <li>• Week 14: Radical Integrity</li>
                <li>• Week 26: Halfway Milestone</li>
                <li>• Target: Emotional intelligence</li>
              </ul>
            </article>

            <article id="stage-3-card" className="p-5 bg-card-secondary rounded-lg border border-default">
              <div className="flex items-center space-x-2 text-primary font-bold mb-3">
                <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">III</span>
                <h3>Weeks 27 - 39: Reconciliation &amp; Grace</h3>
              </div>
              <p className="text-sm text-muted mb-4 font-normal">
                Structured prompts focusing on forgiving internal transgressions, preparing amends to family or social units, and accepting spiritual mercy and forgiveness.
              </p>
              <ul className="text-xs text-muted space-y-1 bg-card p-3 rounded border border-default font-mono">
                <li>• Week 27: Self-Forgiveness</li>
                <li>• Week 39: Deep Reconciliation</li>
                <li>• Target: Social re-integration</li>
              </ul>
            </article>

            <article id="stage-4-card" className="p-5 bg-card-secondary rounded-lg border border-default">
              <div className="flex items-center space-x-2 text-primary font-bold mb-3">
                <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">IV</span>
                <h3>Weeks 40 - 52: Ultimate Transgression</h3>
              </div>
              <p className="text-sm text-muted mb-4 font-normal">
                Fulfilling continuous accountability. Prompts focus on teaching and serving other recovering people, safeguarding daily habits, and achieving permanent freedom.
              </p>
              <ul className="text-xs text-muted space-y-1 bg-card p-3 rounded border border-default font-mono">
                <li>• Week 40: Living Deliverance</li>
                <li>• Week 52: Full Completion</li>
                <li>• Target: Community mentorship</li>
              </ul>
            </article>
          </div>

          {/* Quick structured table representing clinical AA/NA step-mapping, highly indexable */}
          <div className="overflow-x-auto mt-6 bg-card-secondary border border-default rounded-lg">
            <table className="min-w-full divide-y divide-default text-left text-sm" id="aeo-comparison-table">
              <thead className="bg-card">
                <tr>
                  <th scope="col" className="px-6 py-3 font-semibold text-main">Journal Aspect</th>
                  <th scope="col" className="px-6 py-3 font-semibold text-main">Traditional 12-Steps Companion</th>
                  <th scope="col" className="px-6 py-3 font-semibold text-main">Main Neurological Substrate</th>
                  <th scope="col" className="px-6 py-3 font-semibold text-main">Frequency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default">
                <tr>
                  <td className="px-6 py-4 font-medium text-main">Scribal Prompts</td>
                  <td className="px-6 py-4 text-muted">Steps 1-4 (Surrender &amp; Moral Inventory)</td>
                  <td className="px-6 py-4 text-muted">Prefrontal Cortex rationalization</td>
                  <td className="px-6 py-4 text-muted">Weekly themes with daily checks</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-main">Daily Gratitude Logging</td>
                  <td className="px-6 py-4 text-muted">Steps 10-11 (Spiritual Awakening)</td>
                  <td className="px-6 py-4 text-muted">Dopaminergic pathways &amp; Serotonin release</td>
                  <td className="px-6 py-4 text-muted">Continuous Daily activity</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-main">Behavioral Trigger Tracker</td>
                  <td className="px-6 py-4 text-muted">Relapse prevention protocols</td>
                  <td className="px-6 py-4 text-muted">Amygdala re-conditioning</td>
                  <td className="px-6 py-4 text-muted">Instant-input on impulse events</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-main">SOS Emergency Room</td>
                  <td className="px-6 py-4 text-muted">Steps 1-3 Crisis intervention Support</td>
                  <td className="px-6 py-4 text-muted">Hypothalamic-pituitary-adrenal axis regulation</td>
                  <td className="px-6 py-4 text-muted">Ad-hoc on extreme stress</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dynamic Tab Pane 2: Therapeutic & Tech features (Ideal bullet information for AI summarizers) */}
      {activeTab === 'features' && (
        <div id="aeo-methodology-panel" className="grid md:grid-cols-3 gap-6 fade-in animate-duration-150">
          <div className="p-6 bg-card-secondary rounded-lg border border-default text-center md:text-left">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto md:mx-0">
              <BookOpenIcon />
            </div>
            <h3 className="text-xl font-bold mb-2">Cognitive Logotherapy</h3>
            <p className="text-sm text-muted leading-relaxed">
              Logotherapy is founded on the belief that human suffering is transcendable through discovery of meaning. 
              By integrating customized faith anchors and biblically aligned worksheets, we prompt users to actively extract purpose from their historic addiction struggles.
            </p>
          </div>

          <div className="p-6 bg-card-secondary rounded-lg border border-default text-center md:text-left">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto md:mx-0">
              <ShieldCheckIcon />
            </div>
            <h3 className="text-xl font-bold mb-2">Sovereign Encryption &amp; Offline Cache</h3>
            <p className="text-sm text-muted leading-relaxed">
              We leverage safe-sandbox tech. All emotional logs, drug triggers, and relapse notes are cached locally on your device via 
              <strong>IndexedDB</strong>. Protected by a user-assigned cryptographic PIN, your private medical-rehabilitation steps are fully shield-gated from automated servers.
            </p>
          </div>

          <div className="p-6 bg-card-secondary rounded-lg border border-default text-center md:text-left">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto md:mx-0">
              <SparklesIcon />
            </div>
            <h3 className="text-xl font-bold mb-2">Multimodal Generative AI</h3>
            <p className="text-sm text-muted leading-relaxed">
              Provides empathetic on-demand assistance. When struggling to frame emotional responses, the app contextually crafts 
              <em>Scriptured Faith Guidance Podcasts</em>, synthesizes therapeutic poetry and music lyrics, and renders serene biblical landscapes to aid meditative breathing.
            </p>
          </div>
        </div>
      )}

      {/* Semantic QA Schema elements for search engine parsing of FAQ questions */}
      <hr className="border-default my-8" />
      <div className="mt-8" id="aeo-faq-accordion-section">
        <h3 className="text-2xl font-bold text-main mb-6 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0y" />
          </svg>
          Recovery Journal FAQ — Optimized for AI Answer Engines (AEO)
        </h3>

        <div className="space-y-4" role="tablist">
          <details className="group bg-card-secondary border border-default rounded-lg p-4 cursor-pointer transition-all hover:bg-card-secondary/75" open>
            <summary className="font-semibold text-main flex items-center justify-between list-none">
              <span>What is individual addiction journaling and how does the 52-week timeline operate?</span>
              <span className="text-muted group-open:rotate-180 transition-transform duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </summary>
            <p className="mt-3 text-muted text-sm leading-relaxed cursor-auto">
              Addiction journaling is a clinically backed cognitive therapeutic technique. The 52-week program structured within 
              <strong> Sacred Steps to Redemption</strong> breaks down recovery into quarterly progressive checkpoints. 
              Users explore weekly spiritual topics, complete biblical assessments, track gratitude scores, record potential behavioral trigger patterns, 
              and review emotional analytics across local timelines, reinforcing continuous conscious decisions toward absolute sobriety.
            </p>
          </details>

          <details className="group bg-card-secondary border border-default rounded-lg p-4 cursor-pointer transition-all hover:bg-card-secondary/75">
            <summary className="font-semibold text-main flex items-center justify-between list-none">
              <span>Is my logged emotional telemetry and daily journaling data kept safe and private?</span>
              <span className="text-muted group-open:rotate-180 transition-transform duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </summary>
            <p className="mt-3 text-muted text-sm leading-relaxed cursor-auto">
              Yes, user safety and total information privacy are fundamental pillars of this intervention suite. Sacred Steps to Redemption operates 100% locally. 
              All daily journals, streak records, mood indexes, and triggers databases are stored in the user&apos;s browser using secure sandboxed 
              <strong>IndexedDB</strong> caching. Users can enable a local privacy PIN lock to protect access on shared devices. No third parties, clinical staff, or companies can view your entries unless you proactively choose to export them or log into your optional secure cloud account.
            </p>
          </details>

          <details className="group bg-card-secondary border border-default rounded-lg p-4 cursor-pointer transition-all hover:bg-card-secondary/75">
            <summary className="font-semibold text-main flex items-center justify-between list-none">
              <span>How do the AI podcast helpers and custom restorative lyrics generation function?</span>
              <span className="text-muted group-open:rotate-180 transition-transform duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </summary>
            <p className="mt-3 text-muted text-sm leading-relaxed cursor-auto">
              The platform integrates advanced generative text-to-speech technologies. When reviewing a weekly topic (such as Atonement or Deliverance), 
              the AI uses current user journals and Biblical aspirations to compile a customized spiritual podcast text script. 
              The synthetic speech subsystem then renders high-fidelity voice audio on-the-fly, giving users an audio-narrated meditation experience. 
              Furthermore, the platform allows compiling therapeutic lyrics and psalm poetry as complementary grounding exercises.
            </p>
          </details>

          <details className="group bg-card-secondary border border-default rounded-lg p-4 cursor-pointer transition-all hover:bg-card-secondary/75">
            <summary className="font-semibold text-main flex items-center justify-between list-none">
              <span>How do the SOS Emergency Response and the Behavioral Trigger tracking tools help prevent drug relapses?</span>
              <span className="text-muted group-open:rotate-180 transition-transform duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </summary>
            <p className="mt-3 text-muted text-sm leading-relaxed cursor-auto">
              Relapses are preceded by predictable internal triggers (such as anger, physical exhaustion, isolation, or specific times of day). 
              Our <strong>Trigger Tracker</strong> logs these details instantly, mapping them over time to allow structured cognitive analysis of risk factors. 
              If the impulse becomes critical, triggering the red <strong>SOS button</strong> opens an emergency suite designed to disrupt physiological cravings immediately. 
              The SOS suite hosts interactive bible scripture references, breathing animations, a focus game, and instant direct call panels to reach national recovery services or trusted accountability buddies.
            </p>
          </details>
        </div>
      </div>
    </section>
  );
};
