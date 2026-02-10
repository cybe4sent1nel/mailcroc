import styles from './Footer.module.css';
import Image from 'next/image';
import Link from 'next/link';

const Footer = () => {
    return (
        <footer className={styles.footer}>
            <div className={styles.inner}>
                <div className={styles.brand}>
                    <div className={styles.logo}>
                        <Image
                            src="/logo.png"
                            alt="MailCroc"
                            width={28}
                            height={28}
                            className={styles.logoImage}
                        />
                        <span>MailCroc</span>
                    </div>
                    <p className={styles.tagline}>Privacy-first disposable email &amp; phone numbers.</p>
                </div>

                <div className={styles.columns}>
                    <div className={styles.col}>
                        <h4>Product</h4>
                        <Link href="/mail">Temp Mail</Link>
                        <Link href="/features">Features</Link>
                        <Link href="/pricing">Pricing</Link>
                    </div>
                    <div className={styles.col}>
                        <h4>Company</h4>
                        <Link href="#">About</Link>
                        <Link href="#">Blog</Link>
                        <Link href="#">Contact</Link>
                    </div>
                    <div className={styles.col}>
                        <h4>Legal</h4>
                        <Link href="#">Privacy Policy</Link>
                        <Link href="#">Terms of Service</Link>
                    </div>
                </div>
            </div>
            <div className={styles.bottom}>
                <p>&copy; {new Date().getFullYear()} MailCroc. All rights reserved.</p>
            </div>
        </footer>
    );
};
export default Footer;
