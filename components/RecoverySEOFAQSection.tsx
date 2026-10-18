import React, { useState } from 'react';

export interface RecoverySEOFAQSectionProps {
  onSelectWeek?: (week: number) => void;
}

export const RecoverySEOFAQSection: React.FC<RecoverySEOFAQSectionProps> = () => {
  const [showAuthorTestimony, setShowAuthorTestimony] = useState(false);

  return (
    <section id="recovery-curriculum-guide" className="mt-16 pt-12 border-t border-default space-y-10">
      <div id="aeo-recovery-timeline-panel" className="space-y-10">
        {/* The Journey's Horizon Card */}
        <div className="w-full bg-primary/5 border border-primary/20 rounded-xl p-5 sm:p-6 text-center space-y-3 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-widest text-primary font-mono">
            The Journey&apos;s Horizon
          </span>
          <h4 className="font-cinzel text-lg sm:text-xl font-bold text-main">
            &ldquo;Look at you. Can you believe how far you&apos;ve come?&rdquo;
          </h4>
          <p className="text-xs sm:text-sm text-muted max-w-2xl mx-auto leading-relaxed">
            Recovery is not a destination you arrive at and then you&apos;re done. It is a daily choice—a continuous rhythm of growth, healing, and surrender. Take what served you here and carry it forward. You are allowed to keep learning, keep healing, and keep beginning again.
          </p>
          <p className="font-serif-quote italic text-primary text-xs sm:text-sm font-semibold">
            &ldquo;Recovery is not about perfection. It&apos;s about progress, patience, and faith.&rdquo;
          </p>
        </div>

        {/* AUTHOR'S TESTIMONY & FOUNDATION CARD: "A Word From the Author: Pain as Medicine" */}
        <div className="bg-card-secondary rounded-xl border border-default p-6 md:p-8 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-default pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-lg font-cinzel">
                  CP
                </div>
                <div>
                  <h4 className="font-cinzel text-lg font-bold text-main">
                    A Word From the Author: Pain as Medicine
                  </h4>
                  <p className="text-xs text-muted">
                    By <span className="font-semibold text-main">C. Lamont Patrick</span> &bull; kya daisy publishing
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAuthorTestimony(true)}
                className="text-xs font-semibold text-primary px-3.5 py-1.5 rounded-lg bg-card border border-default hover:bg-card-secondary hover:border-primary/50 cursor-pointer self-start md:self-auto transition-colors flex items-center space-x-1.5 shadow-2xs"
                title="Open full author note in a pop-up window"
              >
                <span>Read Full Author Note</span>
                <span className="text-[10px]">↗</span>
              </button>
            </div>

            <blockquote className="font-serif-quote italic text-main text-sm md:text-base border-l-2 border-primary pl-4 my-2 leading-relaxed">
              &ldquo;I am sharing my story because pain that stays locked inside one person is just pain. But pain that gets handed to someone else, at the exact moment they need it, can be medicine. That&apos;s the only reason this app exists. I created it hoping my pain would be aspirin for someone else battling that same eight-hundred-pound gorilla.&rdquo;
            </blockquote>
          </div>
        </div>

        {/* Full Author Note Pop-Up Window */}
        {showAuthorTestimony && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setShowAuthorTestimony(false)}
          >
            <div
              className="bg-card border border-[#D4AF37]/50 text-main rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pop-Up Header */}
              <div className="flex items-start justify-between border-b border-default pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-[#1C2A39] border border-[#D4AF37]/40 text-[#F5D77F] flex items-center justify-center font-bold text-xl font-cinzel shadow-sm shrink-0">
                    CP
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary font-mono block">
                      Author's Note &amp; Testimony
                    </span>
                    <h3 className="font-cinzel text-lg sm:text-xl font-bold text-main leading-snug">
                      Pain as Medicine
                    </h3>
                    <p className="text-xs text-muted">
                      By <strong className="text-main">C. Lamont Patrick</strong> &bull; kya daisy publishing
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuthorTestimony(false)}
                  className="w-8 h-8 rounded-full bg-card-secondary hover:bg-card border border-default flex items-center justify-center text-muted hover:text-main text-base font-bold cursor-pointer transition-colors"
                  aria-label="Close Author Note"
                >
                  ✕
                </button>
              </div>

              {/* Core Anchor Quote */}
              <blockquote className="font-serif-quote italic text-main text-sm sm:text-base border-l-4 border-[#D4AF37] pl-4 py-2 bg-primary/5 rounded-r-lg leading-relaxed">
                &ldquo;Pain that stays locked inside one person is just pain. But pain that gets handed to someone else, at the exact moment they need it, can be medicine. That&apos;s the only reason this app exists. I created it hoping my pain would be aspirin for someone else battling that same eight-hundred-pound gorilla.&rdquo;
              </blockquote>

              {/* Full Narrative Content */}
              <div className="space-y-4 text-xs sm:text-sm text-main/90 leading-relaxed font-sans">
                <p>
                  On January 12, 2018, I hit the hardest day of my life. Not just because I finally admitted I was powerless, though I was, but because I had to ask my son to drive me to the VA hospital so I could admit myself. I remember the look in his eyes. Hurt. Pain. A father is never supposed to put that look on his son&apos;s face.
                </p>
                <p>
                  I remember exactly when it started again. I was thirty-seven, and cocaine came back into my life like a baby ape. Small. Almost manageable. I had no idea it would grow into an eight-hundred-pound gorilla named Pride, and that it would ride me for the next seventeen years.
                </p>
                <p>
                  I lost jobs, more than I can count. I damaged my relationship with my son, my daughter, my father, people I called family, people I called friends. I faced death twice. Not a metaphor. Twice. My finances collapsed into chaos I couldn&apos;t find my way out of. That eight-hundred-pound gorilla pounded me into submission until there wasn&apos;t much self-esteem or self-respect left standing.
                </p>
                <p>
                  That&apos;s where Step One of Cocaine Anonymous found me: <em>We admitted we were powerless over our addiction, that our lives had become unmanageable.</em> I didn&apos;t arrive at that sentence as a concept. I arrived at it as a fact I could no longer outrun.
                </p>
                <p>
                  Step Two is what let me stand back up: <em>We came to believe that a Power greater than ourselves could restore us to sanity.</em> August Wilson wrote something that has stayed with me ever since: <span className="font-serif-quote italic">&ldquo;Confront the dark parts of yourself, and work to banish them with illumination and forgiveness. Your willingness to wrestle with your demons will cause your angels to sing.&rdquo;</span>
                </p>
                <p>
                  I wrestled. I&apos;m still wrestling some days. But I&apos;m no longer wrestling alone, and I&apos;m no longer wrestling in silence.
                </p>
                <p>
                  I am sharing my story because pain that stays locked inside one person is just pain. But pain that gets handed to someone else, at the exact moment they need it, can be medicine. That&apos;s the only reason this app exists. I created it hoping my pain would be aspirin for someone else battling that same eight-hundred-pound gorilla.
                </p>
                <div className="p-3.5 rounded-xl bg-card-secondary border border-primary/30 text-center shadow-2xs">
                  <p className="font-bold text-sm text-primary font-cinzel tracking-wide">
                    The trash can can be emptied. The rust can be stripped. What&apos;s battered can still stand.
                  </p>
                </div>
                <p>
                  If you&apos;re carrying that gorilla right now, if pride, or shame, or seventeen years, or seventeen days has you pinned down, I need you to hear this: the trash can can be emptied. The rust can be stripped. What&apos;s battered can still stand. I&apos;m proof, and I&apos;m not special. I just finally admitted I was powerless, and I let something bigger than me do what I couldn&apos;t do myself.
                </p>
                <div className="pt-2 flex justify-end">
                  <p className="font-cinzel font-bold text-sm text-primary tracking-wide">
                    &mdash; C. Lamont Patrick
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-default">
                <span className="text-[11px] text-muted font-serif-quote italic">
                  A Path to Recovery, A Life in Grace.
                </span>
                <button
                  type="button"
                  onClick={() => setShowAuthorTestimony(false)}
                  className="w-full sm:w-auto px-5 py-2 bg-primary text-on-primary hover:bg-primary-hover font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Close Author Note
                </button>
              </div>
            </div>
          </div>
        )}
    </section>
  );
};
