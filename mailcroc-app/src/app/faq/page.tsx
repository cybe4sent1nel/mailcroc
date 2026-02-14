import Image from 'next/image';
import { HelpCircle, Book, Shield, Zap, Terminal } from 'lucide-react';
import styles from './faq.module.css';

export default function FAQ() {
    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <Image
                    src="/images/business-person-to-explain-left-hand-svgrepo-com.svg"
                    alt="Explain"
                    width={120}
                    height={120}
                    style={{ marginBottom: '1rem' }}
                />
                <h1 className={styles.title}>Knowledge Hub</h1>
                <p className={styles.subtitle}>
                    Everything you need to know about stealth sending, identity protection, and why the other guys are just "Hot Air".
                </p>
            </header>

            {/* Section 1: The Basics */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <HelpCircle size={28} color="#3b82f6" /> Common Questions
                </h2>
                <div className={styles.faqGrid}>
                    <div className={styles.faqCard}>
                        <h3 className={styles.question}>Why does G*mail show my address in brackets?</h3>
                        <p className={styles.answer}>
                            Because they want to make sure the recipient knows you're a "spoofing" risk. It's their way of keeping you in their walled garden.
                            If you don't verify your alias carefully, they'll leak your primary identity every time.
                        </p>
                        <div className={styles.banterBox}>
                            "Traditional providers love transparency... except when it comes to how they track you. We prefer total stealth."
                            <Image
                                src="/images/bad-guy-calling-svgrepo-com.svg"
                                alt="Bad Guy"
                                width={50}
                                height={50}
                                style={{ position: 'absolute', right: '10px', bottom: '10px', opacity: 0.2 }}
                            />
                        </div>
                    </div>

                    <div className={styles.faqCard}>
                        <h3 className={styles.question}>What is a "Master Relay" (V6)?</h3>
                        <p className={styles.answer}>
                            It's our proprietary invention. We use a verified "Bridge" address to carry your message.
                            We use the <b>Golden Mask</b> trick to show your temp address as the sender's display name while the verified bridge handles the technical handshake.
                            No brackets. No disclosure. Just pure privacy.
                        </p>
                    </div>

                    <div className={styles.faqCard}>
                        <h3 className={styles.question}>Is this safe for my main account?</h3>
                        <p className={styles.answer}>
                            100%. We use official Google OAuth and API protocols. We never see your password, and we only send what you tell us to.
                            Think of us as a professional courier service for your digital mail.
                        </p>
                        <div className={styles.banterBox} style={{ borderColor: '#ef4444' }}>
                            "Some competitors are like a leaky hair dryer—lots of hot air, but they expose your identity to the wind."
                            <Image
                                src="/images/woman-using-hair-dryer-svgrepo-com.svg"
                                alt="Hot Air"
                                width={50}
                                height={50}
                                style={{ position: 'absolute', right: '10px', bottom: '10px', opacity: 0.2 }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 2: Step-by-Step Guides */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <Book size={28} color="#10b981" /> Step-by-Step Guides
                </h2>
                <div className={styles.stepGrid}>
                    <div className={styles.stepCard}>
                        <div className={styles.stepNumber}>01</div>
                        <div className={styles.stepContent}>
                            <h3 className={styles.stepTitle}>Choose Identity</h3>
                            <p>Go to the <b>Identities</b> page and choose your strategy: Croc-Stealth (Instant), SMTP (Pro), or Gmail Proxy.</p>
                        </div>
                    </div>
                    <div className={styles.stepCard}>
                        <div className={styles.stepNumber}>02</div>
                        <div className={styles.stepContent}>
                            <h3 className={styles.stepTitle}>Compose Mail</h3>
                            <p>Head to your inbox, click <b>Compose</b>, and type your target. Your identity is automatically shielded.</p>
                        </div>
                    </div>
                    <div className={styles.stepCard}>
                        <div className={styles.stepNumber}>03</div>
                        <div className={styles.stepContent}>
                            <h3 className={styles.stepTitle}>Send Safely</h3>
                            <p>Hit send. Our engine routes your mail through the bridge. Check your primary "Sent" folder—it's synced there too!</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 3: API Documentation */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <Terminal size={28} color="#0f172a" /> Developer API
                </h2>
                <p className={styles.answer}>
                    Automate your stealth sending with our simple JSON API. No complex OAuth handling required on your end.
                </p>
                <div className={styles.codeBlock}>
                    {`POST /api/emails/send
{
  "from": "user@mailcroc.qzz.io",
  "to": "target@gmail.com",
  "subject": "Hello from Stealth",
  "body": "<h1>Total privacy.</h1>"
}`}
                </div>
                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <Image
                        src="/images/factory-male-worker-svgrepo-com.svg"
                        alt="Worker"
                        width={100}
                        height={100}
                    />
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '1rem' }}>
                        Hard-working API for developers who value identity protection.
                    </p>
                </div>
            </section>

            {/* Footer Banter */}
            <div style={{ textAlign: 'center', marginTop: '6rem', opacity: 0.6 }}>
                <Image
                    src="/images/various-races-holding-hands-svgrepo-com.svg"
                    alt="Community"
                    width={150}
                    height={100}
                />
                <p style={{ marginTop: '1rem' }}>Joined together for a more private internet.</p>
            </div>
        </div>
    );
}
