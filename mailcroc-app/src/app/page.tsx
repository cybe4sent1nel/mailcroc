import styles from "./page.module.css";
import Link from 'next/link';
import Image from 'next/image';
import { Mail } from 'lucide-react';
import LottiePlayer from '@/components/LottiePlayer';
import FallingText from '@/components/FallingText/FallingText';
import ScrollFloat from '@/components/ScrollFloat/ScrollFloat';
import TrustedBrands from '@/components/TrustedBrands/TrustedBrands';
import Testimonials from '@/components/Testimonials/Testimonials';
import PixelBlast from '@/components/PixelBlast/PixelBlast';
import { Compare } from "@/components/ui/compare";

import heroAnim from '../../public/animations/herosection.json';
import instDelAnim from '../../public/animations/card1.json';
import steDomAnim from '../../public/animations/card2.json';
import repComAnim from '../../public/animations/card3.json';
import zeroLogsAnim from '../../public/animations/cardzerologs.json';
import cusExpAnim from '../../public/animations/card_customexpiry.json';
import pinForAnim from '../../public/animations/cardpin.json';
import passwordAnim from '../../public/animations/password_protection.json';

export default function Home() {
  return (
    <div className={styles.page}>
      {/* Announcement Bar */}
      <div className={styles.announcementBar}>
        <span className={styles.badge}>New</span>
        <span className={styles.announcementText}>Reply, compose, and forward from your temp inbox</span>
        <span className={styles.arrow}>&rarr;</span>
      </div>

      {/* Hero Section */}
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.floatingShapes}>
          <div className={styles.shape1}></div>
          <div className={styles.shape2}></div>
          <div className={styles.shape3}></div>
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroAnimWrapper}>
            <LottiePlayer animationData={heroAnim} style={{ width: 300, height: 300 }} />
          </div>
          <h1 className={styles.title}>
            <ScrollFloat as="span">Stop Leaking Your Identity.</ScrollFloat><br />
            <span className={styles.highlight}>Master the Relay.</span>
          </h1>
          <p className={styles.subtitle}>
            Generate instant temporary email addresses with reply, compose, and forwarding.
            Protect your privacy online. No signup, no limits, totally free.
          </p>

          <div style={{ margin: '4rem 0', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <Image src="/images/food-loss-sdgs-svgrepo-com.svg" alt="Bin" width={60} height={60} />
              <ScrollFloat as="h3" style={{ fontSize: '1.8rem', color: '#1e293b', fontWeight: 800 }}>Keep your mail clutter free</ScrollFloat>
            </div>
            <div style={{ height: '280px', width: '100%', position: 'relative', borderRadius: '24px', border: '1px solid #f1f5f9', background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <FallingText
                text="Spam 🚫 Ads 📢 Junk 🗑️ Trackers 👁️ Phishing 🎣 Clutter 📦 Marketing 🏷️ Scams 🚨 Bots 🤖 Updates 🔄 Promos 💸 Social 👥 Verify ✅ Blocked 🛑 Suspicious 🤨 Malware 🦠 Popups 💬 Banners 🖼️ Offers 🤝 Deals 🎁 Newsletters 📰"
                trigger="hover"
                backgroundColor="#ffffff"
                wireframes={false}
                gravity={0.6}
                fontSize="1.1rem"
                mouseConstraintStiffness={0.2}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <Link href="/mail" className={styles.primaryBtn}>
              <Mail size={18} />
              Start Your Private Inbox
            </Link>
          </div>

          <div className={styles.liveStats}>
            <div className={styles.liveDot}></div>
            <span>100+ pristine domains ready for your identity</span>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className={styles.comparisonSection}>
        <div className={styles.fullComparisonWrapper}>
          <div className={styles.comparisonHeader}>
            <ScrollFloat as="h2" containerClassName={styles.sectionTitle}>The Apex Predator</ScrollFloat>
            <p className={styles.sectionSubtitle}>Battle of the Inboxes: Class vs. Clutter</p>
          </div>

          <div className={styles.fullComparisonContainer}>
            <Compare
              firstImage="/comparision/mailcroc.png"
              secondImage="/comparision/gmailnator_vs.png"
              className="h-full w-full"
              slideMode="hover"
              firstLogo={
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center p-1.5 shadow-lg">
                    <img src="/logo.png" alt="MailCroc Logo" className="w-full h-full object-contain brightness-0 invert" />
                  </div>
                  <span className="font-black text-indigo-900 tracking-tight text-xl">MAILCROC</span>
                </div>
              }
              secondLogo={
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center p-2 shadow-sm border border-red-200">
                    <svg viewBox="0 0 24 24" className="w-full h-full text-red-600 fill-current">
                      <path d="M20,4H4C2.89,4 2,4.89 2,6V18C2,19.11 2.89,20 4,20H20C21.11,20 22,19.11 22,18V6C22,4.89 21.11,4 20,4M20,18H4V8L12,13L20,8V18M12,11L4,6H20L12,11Z" />
                    </svg>
                  </div>
                  <span className="font-black text-neutral-800 tracking-tight text-xl uppercase">Gmailnator</span>
                </div>
              }
            />
          </div>
        </div>
      </section>

      <TrustedBrands />

      {/* Feature Cards */}
      <section id="features" className={styles.features}>
        <ScrollFloat as="h2" containerClassName={styles.sectionTitle}>Built for Privacy, Not for Prying</ScrollFloat>
        <p className={styles.sectionSubtitle}>Professional infrastructure hidden behind a friendly face.</p>

        <div className={styles.featureGrid}>
          <div className={`${styles.featureCard} ${styles.cardGreen}`}>
            <div className={styles.featureIcon}>
              <LottiePlayer animationData={instDelAnim} />
            </div>
            <h3 className={styles.featureTitle}>Instant Delivery</h3>
            <p className={styles.featureText}>Emails land in your inbox faster than you can say "privacy." Powered by real-time Socket.IO technology.</p>
          </div>
          <div className={`${styles.featureCard} ${styles.cardLavender}`}>
            <div className={styles.featureIconPurple}>
              <LottiePlayer animationData={steDomAnim} />
            </div>
            <h3 className={styles.featureTitle}>Pristine Domains</h3>
            <p className={styles.featureText}>Our domains are hand-picked to look like standard professional providers, slipping past aggressive filters with ease.</p>
          </div>
          <div className={`${styles.featureCard} ${styles.cardGreen}`}>
            <div className={styles.featureIcon}>
              <LottiePlayer animationData={repComAnim} />
            </div>
            <h3 className={styles.featureTitle}>Full Dispatch</h3>
            <p className={styles.featureText}>Reply to the world or start a fresh thread. Your temp address is now a fully functional communication hub.</p>
          </div>
          <div className={`${styles.featureCard} ${styles.cardLavender}`}>
            <div className={styles.featureIconPurple}>
              <LottiePlayer animationData={zeroLogsAnim} />
            </div>
            <h3 className={styles.featureTitle}>Strict Zero-Log Policy</h3>
            <p className={styles.featureText}>What happens in MailCroc, stays in MailCroc. We don't store identities, and we certainly don't sell them.</p>
          </div>
          <div className={`${styles.featureCard} ${styles.cardGreen}`}>
            <div className={styles.featureIcon}>
              <LottiePlayer animationData={cusExpAnim} />
            </div>
            <h3 className={styles.featureTitle}>Self-Destruct Timer</h3>
            <p className={styles.featureText}>From 10 minutes to "keep forever," you control the lifespan of your inbox. Decisiveness is a virtue.</p>
          </div>
          <div className={`${styles.featureCard} ${styles.cardLavender}`}>
            <div className={styles.featureIconPurple}>
              <LottiePlayer animationData={pinForAnim} />
            </div>
            <h3 className={styles.featureTitle}>Vault & Relay</h3>
            <p className={styles.featureText}>Pin critical messages to your vault or relay them to your primary email. Security without the friction.</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.statsSection}>
        <div className={styles.statGrid}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>100+</span>
            <span className={styles.statLabel}>Active Domains</span>
          </div>
          <div className={styles.statDivider}></div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>0</span>
            <span className={styles.statLabel}>Identities Stored</span>
          </div>
          <div className={styles.statDivider}></div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>&lt;1s</span>
            <span className={styles.statLabel}>Global Delivery</span>
          </div>
          <div className={styles.statDivider}></div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>Full</span>
            <span className={styles.statLabel}>Two-Way Comms</span>
          </div>
        </div>
      </section>

      <Testimonials />

      {/* Unified Sending & Receiving Guide */}
      <section className={styles.unifiedGuide}>
        <div className={styles.guideContainer}>
          <div className={styles.sectionHeader}>
            <ScrollFloat as="h2" containerClassName={styles.sectionTitle}>The Standard Operating Procedure</ScrollFloat>
            <p className={styles.sectionSubtitle}>A clean, professional loop for all your sensitive communications.</p>
          </div>

          <div className={styles.guideRow}>
            <div className={styles.guideContent}>
              <span className={styles.guideBadge}>Workflow 1: Receiving</span>
              <h3 className={styles.guideTitle}>Deploy & Filter</h3>
              <p className={styles.guideText}>
                Generate a temporary address for untrusted sign-ups. Our V6 Golden Mask engine autonomously strips trackers
                and data-miners before the content reaches your view. No noise, just data.
              </p>
            </div>
            <div className={styles.guideImageWrapper}>
              <Image
                src="/images/business-person-to-explain-left-hand-svgrepo-com.svg"
                alt="Receiving Workflow"
                width={300}
                height={300}
              />
            </div>
          </div>

          <div className={`${styles.guideRow} ${styles.guideRowInverse}`}>
            <div className={styles.guideImageWrapper}>
              <Image
                src="/images/factory-male-worker-svgrepo-com.svg"
                alt="Sending Workflow"
                width={300}
                height={300}
              />
            </div>
            <div className={styles.guideContent}>
              <span className={styles.guideBadge}>Workflow 2: Sending</span>
              <h3 className={styles.guideTitle}>Advanced Relay Control</h3>
              <p className={styles.guideText}>
                Reply with confidence using Croc Stealth, Custom SMTP, or Verified Gmail Ghosting.
                We manage the headers and reputation, ensuring your primary identity remains completely invisible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Identity-First Privacy / Password Protected Section */}
      <section className={styles.lockedMailSection}>
        <div className={styles.sectionHeader}>
          <ScrollFloat as="h2" containerClassName={styles.sectionTitle}>Secure Payload Transfer</ScrollFloat>
          <p className={styles.sectionSubtitle}>Because some data is too sensitive for plain text.</p>
        </div>

        <div className={styles.passwordExplainer}>
          <div className={styles.explainerImage}>
            <Image
              src="/images/laptop-security-svgrepo-com.svg"
              alt="Secure Transfer"
              width={350}
              height={350}
            />
          </div>
          <div className={styles.explainerText}>
            <h3>AES-256 Payload Locking</h3>
            <p>
              Sending documents or secrets? Encrypt the entire message. The recipient receives a secure link
              and must possess the specific key you set to unlock the communication portal.
            </p>
            <div className={styles.lockSteps}>
              <div className={styles.lockStep}>
                <div className={styles.lockStepIcon}>1</div>
                <span>Compose and initiate the Payload Lock.</span>
              </div>
              <div className={styles.lockStep}>
                <div className={styles.lockStepIcon}>2</div>
                <span>Set your unique encryption key and TTL (Time-To-Live).</span>
              </div>
              <div className={styles.lockStep}>
                <div className={styles.lockStepIcon}>3</div>
                <span>Recipient decrypts the payload via our secure end-point.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Use Case Grid */}
        <div className={styles.useCaseGrid}>
          <div className={styles.useCaseCard}>
            <Image src="/images/man-voting-svgrepo-com.svg" alt="Voting" width={80} height={80} />
            <h4>Private Feedback</h4>
            <p>Contribute to company polls without exposing your internal domain.</p>
          </div>
          <div className={styles.useCaseCard}>
            <Image src="/images/meeting-person-svgrepo-com.svg" alt="Meeting" width={80} height={80} />
            <h4>Vendor Relations</h4>
            <p>Research new tools and vendors without the follow-up spam call orgy.</p>
          </div>
          <div className={styles.useCaseCard}>
            <Image src="/images/supporting-business-person-svgrepo-com.svg" alt="Support" width={80} height={80} />
            <h4>Client Support</h4>
            <p>Manage customer tickets while maintaining absolute personal privacy.</p>
          </div>
          <div className={styles.useCaseCard}>
            <Image src="/images/various-races-holding-hands-svgrepo-com.svg" alt="Global" width={80} height={80} />
            <h4>The Privacy Standard</h4>
            <p>Join a global collective of users who take their data seriously.</p>
          </div>
        </div>
      </section>

      {/* Industry Secrets / Banter section */}
      <section className={styles.features}>
        <ScrollFloat as="h2" containerClassName={styles.sectionTitle}>The Industry Status Quo</ScrollFloat>
        <p className={styles.sectionSubtitle}>They call it "free," but you're paying with your metadata.</p>

        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <Image src="/images/bad-guy-calling-svgrepo-com.svg" alt="Data Mining" width={80} height={80} />
            <h3 className={styles.featureTitle}>Header Leakage</h3>
            <p className={styles.featureText}>Most providers accidentally (or intentionally) include your origin IP. We build walls to keep the snitches out.</p>
          </div>
          <div className={styles.featureCard}>
            <Image src="/images/woman-using-hair-dryer-svgrepo-com.svg" alt="Hot Air" width={80} height={80} />
            <h3 className={styles.featureTitle}>The "Marketing" Trap</h3>
            <p className={styles.featureText}>They promise privacy while profiling your inbox for ad-targeting. Our V6 Golden Mask makes that impossible.</p>
          </div>
          <div className={styles.featureCard}>
            <Image src="/images/virus-infected-computer-svgrepo-com.svg" alt="Weak Relay" width={80} height={80} />
            <h3 className={styles.featureTitle}>The Alias Myth</h3>
            <p className={styles.featureText}>Aliases usually reveal your primary account in the "Sent-By" field. Our Master-Relay is the only true fix.</p>
          </div>
        </div>
      </section>

      {/* Additional Use Case Grid */}
      <section className={styles.features} style={{ paddingTop: 0 }}>
        <h2 className={styles.sectionTitle}>Built for Reality</h2>
        <div className={styles.useCaseGrid} style={{ marginTop: '2rem' }}>
          <div className={styles.useCaseCard}>
            <Image src="/images/senior-man-playing-a-computer-inspiration-svgrepo-com.svg" alt="Inspiration" width={80} height={80} />
            <h4>Enduring Security</h4>
            <p>Robust identity protection designed to last as long as your digital life.</p>
          </div>
          <div className={styles.useCaseCard}>
            <Image src="/images/food-loss-sdgs-svgrepo-com.svg" alt="Efficiency" width={80} height={80} />
            <h4>Clean Infrastructure</h4>
            <p>Sustainable, low-clutter systems that prioritize efficiency over extraction.</p>
          </div>
          <div className={styles.useCaseCard}>
            <Image src="/images/happy-woman-svgrepo-com.svg" alt="Joy" width={80} height={80} />
            <h4>Zero Inbox Zen</h4>
            <p>Experience the professional satisfaction of a perfectly filtered communication stream.</p>
          </div>
          <div className={styles.useCaseCard}>
            <Link href="/faq" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ cursor: 'pointer' }}>
                <Image src="/images/business-person-to-explain-left-hand-svgrepo-com.svg" alt="FAQ" width={80} height={80} />
                <h4>Technical Docs</h4>
                <p>Deep-dive into our relay technology and security standards.</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaInner}>
          <ScrollFloat as="h2">Ready to protect your inbox?</ScrollFloat>
          <p>Start using MailCroc for free. No account required.</p>
          <div className={styles.ctaActions}>
            <Link href="/mail" className={styles.ctaPrimary}>Get Started</Link>
          </div>
        </div>
      </section>
    </div >
  );
}
