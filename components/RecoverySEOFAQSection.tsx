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
                onClick={() => setShowAuthorTestimony(!showAuthorTestimony)}
                className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-card border border-default hover:bg-card-secondary cursor-pointer self-start md:self-auto"
              >
                {showAuthorTestimony ? 'Collapse Testimony' : 'Read Full Author Note'}
              </button>
            </div>

            <blockquote className="font-serif-quote italic text-main text-sm md:text-base border-l-2 border-primary pl-4 my-2 leading-relaxed">
              &ldquo;I wrote this journal because pain that stays locked inside one person is just pain. But pain that gets handed to someone else, at the exact moment they need it, can be medicine. I created this journal hoping that my pain would be aspirin for someone else battling that same 800-pound gorilla.&rdquo;
            </blockquote>

            {showAuthorTestimony && (
              <div className="space-y-4 text-xs md:text-sm text-muted leading-relaxed pt-2 fade-in">
                <p>
                  On January 12th, 2018, I admitted myself into the VA hospital. I had been in an active, seventeen-year battle with cocaine addiction. Over those seventeen years, every time I picked up cocaine, it came back like a baby ape. But as the binge went on, that baby ape grew into an 800-pound gorilla named <strong>Pride</strong>.
                </p>
                <p>
                  For a long time, I was a shiny trash can. On the outside, I had the car, the house, the clothes, the smile. But the garbage was piling up on the inside, rotting in the dark. Eventually, my outside caught up to my inside: beaten up, battered, rusted through. In the rooms of Cocaine Anonymous, I finally learned Step 1: <em>We admitted we were powerless over our addiction—that our lives had become unmanageable.</em>
                </p>
                <p>
                  Step 1 knocks you down, but Step 2 lets you stand back up: <em>We came to believe that a Power greater than ourselves could restore us to sanity.</em> As August Wilson wrote: <em>&ldquo;Confront the dark parts of yourself, and work to banish them with illumination and forgiveness. Your willingness to wrestle with your demons will cause your angels to sing.&rdquo;</em>
                </p>
                <p className="font-semibold text-main">
                  The trash can can be emptied. The rust can be stripped. What&apos;s battered can still stand.
                </p>
              </div>
            )}
          </div>
        </div>
    </section>
  );
};
