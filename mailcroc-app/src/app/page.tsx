import styles from "./page.module.css";
import Link from 'next/link';
import { Mail } from 'lucide-react';
import LottiePlayer from '@/components/LottiePlayer';
import FallingText from '@/components/FallingText/FallingText';
import ScrollFloat from '@/components/ScrollFloat/ScrollFloat';
import TrustedBrands from '@/components/TrustedBrands/TrustedBrands';
import Testimonials from '@/components/Testimonials/Testimonials';
import PixelBlast from '@/components/PixelBlast/PixelBlast';

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
            <ScrollFloat as="span">Disposable emails</ScrollFloat><br />
            <span className={styles.highlight}>in one place</span>
          </h1>
          <p className={styles.subtitle}>
            Generate instant temporary email addresses with reply, compose, and forwarding.
            Protect your privacy online. No signup, no limits, totally free.
          </p>

          <div style={{ margin: '2rem 0', textAlign: 'center' }}>
            <ScrollFloat as="h3" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#475569' }}>Keep your mail clutter free</ScrollFloat>
            <div style={{ height: '250px', width: '100%', position: 'relative', borderRadius: '12px' }}>
              <FallingText
                text="Spam 🚫 Ads 📢 Junk 🗑️ Trackers 👁️ Phishing 🎣 Clutter 📦 Marketing 🏷️ Scams 🚨 Bots 🤖 Updates 🔄 Promos 💸 Social 👥 Verify ✅ Blocked 🛑 Suspicious 🤨 Malware 🦠 Popups 💬 Banners 🖼️ Offers 🤝 Deals 🎁 Newsletters 📰"
                trigger="hover"
                backgroundColor="#FAF9F7"
                wireframes={false}
                gravity={0.6}
                fontSize="1.2rem"
                mouseConstraintStiffness={0.2}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <Link href="/mail" className={styles.primaryBtn}>
              <Mail size={18} />
              Get Temp Email
            </Link>
          </div>

          <div className={styles.liveStats}>
            <div className={styles.liveDot}></div>
            <span>100+ stealth domains available right now</span>
          </div>
        </div>
      </section>

      <TrustedBrands />

      {/* Feature Cards */}
      <section id="features" className={styles.features}>
        <ScrollFloat as="h2" containerClassName={styles.sectionTitle}>Everything you need</ScrollFloat>
        <p className={styles.sectionSubtitle}>Built for privacy, designed for speed</p>

        <div className={styles.featureGrid}>
          <div className={`${styles.featureCard} ${styles.cardGreen}`}>
            <div className={styles.featureIcon}>
              <LottiePlayer animationData={instDelAnim} />
            </div>
            <h3 className={styles.featureTitle}>Instant Delivery</h3>
            <p className={styles.featureText}>Emails arrive via Socket.IO in real-time. No polling, no delays, no refreshing.</p>
          </div>
          <div className={`${styles.featureCard} ${styles.cardLavender}`}>
            <div className={styles.featureIconPurple}>
              <LottiePlayer animationData={steDomAnim} />
            </div>
            <h3 className={styles.featureTitle}>100+ Stealth Domains</h3>
            <p className={styles.featureText}>Unique domains that look like real email providers. Undetectable by temp mail filters.</p>
          </div>
          <div className={`${styles.featureCard} ${styles.cardGreen}`}>
            <div className={styles.featureIcon}>
              <LottiePlayer animationData={repComAnim} />
            </div>
            <h3 className={styles.featureTitle}>Reply and Compose</h3>
            <p className={styles.featureText}>Reply to received emails or compose new ones directly from your temp address.</p>
          </div>
          <div className={`${styles.featureCard} ${styles.cardLavender}`}>
            <div className={styles.featureIconPurple}>
              <LottiePlayer animationData={zeroLogsAnim} />
            </div>
            <h3 className={styles.featureTitle}>Zero Logs</h3>
            <p className={styles.featureText}>We never store your identity. All inboxes auto-expire. Your privacy is absolute.</p>
          </div>
          <div className={`${styles.featureCard} ${styles.cardGreen}`}>
            <div className={styles.featureIcon}>
              <LottiePlayer animationData={cusExpAnim} />
            </div>
            <h3 className={styles.featureTitle}>Custom Expiry</h3>
            <p className={styles.featureText}>Set your inbox timer: 10 minutes, 1 hour, 24 hours, or keep it until you delete.</p>
          </div>
          <div className={`${styles.featureCard} ${styles.cardLavender}`}>
            <div className={styles.featureIconPurple}>
              <LottiePlayer animationData={pinForAnim} />
            </div>
            <h3 className={styles.featureTitle}>Pin and Forward</h3>
            <p className={styles.featureText}>Star important emails to prevent deletion. Forward any email to your real inbox.</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.statsSection}>
        <div className={styles.statGrid}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>100+</span>
            <span className={styles.statLabel}>Stealth Domains</span>
          </div>
          <div className={styles.statDivider}></div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>0</span>
            <span className={styles.statLabel}>Logs Kept</span>
          </div>
          <div className={styles.statDivider}></div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>&lt;1s</span>
            <span className={styles.statLabel}>Delivery Time</span>
          </div>
          <div className={styles.statDivider}></div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>Full</span>
            <span className={styles.statLabel}>Send and Reply</span>
          </div>
        </div>
      </section>

      <Testimonials />

      {/* Password Protected Feature Section */}
      <section className={styles.lockedMailSection}>
        <ScrollFloat as="h2" containerClassName={styles.sectionTitle}>Send Password Protected Mails</ScrollFloat>
        <p className={styles.sectionSubtitle}>Open it only when you share the code</p>
        <div className={styles.passwordAnimWrapper}>
          <LottiePlayer animationData={passwordAnim} style={{ width: 400, height: 400 }} />
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.howItWorks}>
        <ScrollFloat as="h2" containerClassName={styles.sectionTitle}>How it works</ScrollFloat>
        <p className={styles.sectionSubtitle}>Three steps to privacy</p>

        <div className={styles.stepsGrid}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepConnector}></div>
            <h3>Generate</h3>
            <p>Click to get a random disposable email from 100+ stealth domains.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepConnector}></div>
            <h3>Use it</h3>
            <p>Sign up for services, receive verification codes, or reply to emails.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3>Receive</h3>
            <p>Emails arrive instantly. Pin favorites, forward to your real inbox, or let them expire.</p>
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
