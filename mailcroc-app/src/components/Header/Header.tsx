import Link from 'next/link';
import Image from 'next/image';
import styles from './Header.module.css';

const Header = () => {
    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Link href="/" className={styles.logo}>
                    <Image
                        src="/logo.png"
                        alt="MailCroc Logo"
                        width={36}
                        height={36}
                        className={styles.logoImage}
                    />
                    <span className={styles.logoText}>MailCroc</span>
                </Link>

                <nav className={styles.nav}>
                    <Link href="/mail" className={styles.navLink}>Temp Mail</Link>
                    <Link href="/features" className={styles.navLink}>Features</Link>
                    <Link href="/pricing" className={styles.navLink}>Pricing</Link>
                </nav>

                <div className={styles.actions}>
                    <Link href="/mail" className={styles.startBtn}>Start free</Link>
                </div>
            </div>
        </header>
    );
};

export default Header;
