import React from 'react';
import Link from 'next/link';
import { Mail, Twitter, Github, Shield } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="mc-footer">
            <div className="mc-footer-container">
                <div className="mc-footer-top">
                    <div className="mc-footer-brand">
                        <div className="mc-footer-logo">
                            <img src="/logo.png" alt="MailCroc Logo" width="32" height="32" />
                            <span>MailCroc</span>
                        </div>
                        <p className="mc-footer-brand-p">
                            The world's most advanced temporary email service. Private, secure, and lightning fast.
                        </p>
                    </div>

                    <div className="mc-footer-links-grid">
                        <div className="mc-footer-column">
                            <h4 className="mc-footer-column-title">Product</h4>
                            <Link href="/mail">Get Started</Link>
                            <Link href="/pricing">Pricing</Link>
                            <Link href="/features">Features</Link>
                        </div>
                        <div className="mc-footer-column">
                            <h4 className="mc-footer-column-title">Legal</h4>
                            <Link href="/privacy">Privacy Policy</Link>
                            <Link href="/terms">Terms of Service</Link>
                            <Link href="/developers">Developers</Link>
                        </div>
                        <div className="mc-footer-column">
                            <h4 className="mc-footer-column-title">Support</h4>
                            <Link href="/docs">Documentation</Link>
                            <Link href="/status">System Status</Link>
                        </div>
                    </div>
                </div>

                <div className="mc-footer-bottom">
                    <div className="mc-footer-copy">
                        © 2026 MailCroc. All rights reserved.
                    </div>

                    <div className="mc-footer-status-wrapper">
                        <Link href="/status" className="mc-footer-status-badge">
                            <div className="mc-footer-status-dot"></div>
                            <span>All systems operational</span>
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
