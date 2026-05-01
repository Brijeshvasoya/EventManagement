import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Calendar, Users, Shield, ArrowRight, Check, Play, Star, Sparkles } from 'lucide-react';
import styles from '../styles/Landing.module.css';
import { useAuth } from '@/context/AuthContext';

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Form states for CTA
  const [ctaName, setCtaName] = useState('');
  const [ctaEmail, setCtaEmail] = useState('');

  const handleCtaSubmit = (e) => {
    e.preventDefault();
    router.push({
      pathname: '/signup',
      query: { name: ctaName, email: ctaEmail }
    });
  };

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (!mounted) return null;

  return (
    <div className={styles.container}>
      <Head>
        <title>EventHub | Reveal Your Best Events</title>
      </Head>

      {/* Navbar */}
      <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.logo}>
          <Sparkles size={24} /> EventHub
        </div>
        <div className={styles.navLinks}>
          <Link href="#home" className={styles.navLink}>Home</Link>
          <Link href="#services" className={styles.navLink}>Services</Link>
          <Link href="#why-us" className={styles.navLink}>Why Us</Link>
          <Link href="#how-it-works" className={styles.navLink}>How it Works</Link>
          <Link href="#faq" className={styles.navLink}>FAQ</Link>
        </div>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.loginBtn}>Login</Link>
          <Link href="/signup" className={styles.primaryBtn}>Book Event</Link>
        </div>
      </nav>

      {/* Hero */}
      <section id="home" className={styles.heroWrapper}>
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>
            Reveal Your <span>Best Events</span> & Experiences
          </h1>
          <p className={styles.heroDesc}>
            The all-in-one platform to plan, promote, and execute unforgettable events. From seamless ticketing to powerful analytics, EventHub gives you everything you need to succeed.
          </p>
          <div className={styles.heroActions}>
            <Link href="/signup" className={styles.primaryBtn}>Start Planning</Link>
            <Link href="#why-us" className={styles.secondaryBtn}>
              <Play size={20} fill="currentColor" /> Watch Video
            </Link>
          </div>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.heroImageContainer}>
            <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000" alt="Concert crowd" />
          </div>
        </div>
        </div>
      </section>

      {/* Services / Features */}
      <section id="services" className={styles.features}>
        <h2 className={styles.sectionTitle}>Our Specialized Services</h2>
        <p className={styles.sectionSubtitle}>
          Comprehensive event management utilizing the latest technology to ensure the best experience for your attendees and brand.
        </p>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureWatermark}><Calendar size={120} /></div>
            <div className={styles.featureIcon}><Calendar size={24} /></div>
            <h3 className={styles.featureTitle}>Seamless Scheduling</h3>
            <p className={styles.featureDesc}>Intuitive calendar tools to manage dates, recurring events, and complex itineraries with ease.</p>
            <Link href="/signup" className={styles.featureLink}>Learn More <ArrowRight size={16} className={styles.featureArrow} /></Link>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureWatermark}><Shield size={120} /></div>
            <div className={styles.featureIcon}><Shield size={24} /></div>
            <h3 className={styles.featureTitle}>Secure Ticketing</h3>
            <p className={styles.featureDesc}>Fraud-proof QR codes and secure payment processing to protect your revenue and attendees.</p>
            <Link href="/signup" className={styles.featureLink}>Learn More <ArrowRight size={16} className={styles.featureArrow} /></Link>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureWatermark}><Users size={120} /></div>
            <div className={styles.featureIcon}><Users size={24} /></div>
            <h3 className={styles.featureTitle}>Audience Engagement</h3>
            <p className={styles.featureDesc}>Connect with attendees before, during, and after the event to maximize reach and loyalty.</p>
            <Link href="/signup" className={styles.featureLink}>Learn More <ArrowRight size={16} className={styles.featureArrow} /></Link>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureWatermark}><Star size={120} /></div>
            <div className={styles.featureIcon}><Star size={24} /></div>
            <h3 className={styles.featureTitle}>Custom Branding</h3>
            <p className={styles.featureDesc}>Dynamic branding options with customizable portals, custom domains, and rich visual tools.</p>
            <Link href="/signup" className={styles.featureLink}>Learn More <ArrowRight size={16} className={styles.featureArrow} /></Link>
          </div>
        </div>
      </section>

      {/* About / Expert Care */}
      <section id="why-us" className={styles.aboutSection}>
        <div className={styles.aboutImageWrapper}>
          <img src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=1000" alt="Tech conference" className={styles.aboutImage} />
          <div className={styles.aboutBadge}>
            <div className={styles.badgeIcon}><Check size={32} /></div>
            <div>
              <strong>100% Safe & Secure</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Industry standard technology</div>
            </div>
          </div>
        </div>
        <div className={styles.aboutContent}>
          <h2 className={styles.aboutTitle}>Powerful Tools for Event Organizers</h2>
          <p className={styles.aboutDesc}>
            We deliver comprehensive event solutions that combine industry-leading technology with seamless user experiences. Our platform empowers organizers to create, manage, and scale events of any size.
          </p>
          <div className={styles.checkList}>
            <div className={styles.checkItem}>
              <div className={styles.checkItemCircle}><Check size={14} /></div>
              Dedicated Support
            </div>
            <div className={styles.checkItem}>
              <div className={styles.checkItemCircle}><Check size={14} /></div>
              Advanced Analytics
            </div>
            <div className={styles.checkItem}>
              <div className={styles.checkItemCircle}><Check size={14} /></div>
              Secure Payments
            </div>
            <div className={styles.checkItem}>
              <div className={styles.checkItemCircle}><Check size={14} /></div>
              Custom Integrations
            </div>
            <div className={styles.checkItem}>
              <div className={styles.checkItemCircle}><Check size={14} /></div>
              Real-time Tracking
            </div>
            <div className={styles.checkItem}>
              <div className={styles.checkItemCircle}><Check size={14} /></div>
              Global Audience Reach
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className={styles.stepsSection}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <p className={styles.sectionSubtitle}>Your journey to hosting successful events follows four simple steps.</p>

        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>01</div>
            <h3 className={styles.stepTitle}>Create Event</h3>
            <p className={styles.stepDesc}>Set up your event page with dates, ticketing tiers, and custom branding.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>02</div>
            <h3 className={styles.stepTitle}>Promote & Sell</h3>
            <p className={styles.stepDesc}>Share your unique link and start selling tickets globally with secure processing.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>03</div>
            <h3 className={styles.stepTitle}>Manage Attendees</h3>
            <p className={styles.stepDesc}>Track sales in real-time and manage your guest list with our powerful dashboard.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>04</div>
            <h3 className={styles.stepTitle}>Host & Analyze</h3>
            <p className={styles.stepDesc}>Check-in guests effortlessly and review comprehensive post-event analytics.</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className={styles.faqSection}>
        <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
        <div className={styles.faqGrid}>
          <div className={styles.faqItem}>
            <h4 className={styles.faqQuestion}>Can I use EventHub for free?</h4>
            <p className={styles.faqAnswer}>Yes, you can sign up for a free account. However, to create and host events, you will need to choose from our Basic or Pro plans.</p>
          </div>
          <div className={styles.faqItem}>
            <h4 className={styles.faqQuestion}>How do I get paid for tickets?</h4>
            <p className={styles.faqAnswer}>EventHub integrates with secure payment processors like Stripe and Razorpay. Payouts are transferred directly to your configured bank account.</p>
          </div>
          <div className={styles.faqItem}>
            <h4 className={styles.faqQuestion}>Is there a limit to attendee capacity?</h4>
            <p className={styles.faqAnswer}>Our Pro plan allows for unlimited attendees, ensuring your event can scale to any size without software limitations.</p>
          </div>
          <div className={styles.faqItem}>
            <h4 className={styles.faqQuestion}>Can I customize my event page?</h4>
            <p className={styles.faqAnswer}>Absolutely. EventHub provides robust customization tools, allowing you to add banners, custom colors, and branding to your event portal.</p>
          </div>
        </div>
      </section>

      {/* CTA Bottom Block */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaBlock}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Ready to Host Your Next Big Event?</h2>
            <p className={styles.ctaDesc}>
              Join thousands of organizers who trust EventHub. Start your journey today and experience the future of event management.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
              <div className={styles.checkItemCircle} style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}><Calendar size={16} /></div>
              <span>Contact Sales: +1 (800) 123 4567</span>
            </div>
          </div>

          <form className={styles.ctaForm} onSubmit={handleCtaSubmit}>
            <input 
              type="text" 
              placeholder="Full Name" 
              className={styles.formInput} 
              value={ctaName}
              onChange={(e) => setCtaName(e.target.value)}
              required
            />
            <input 
              type="email" 
              placeholder="Email Address" 
              className={styles.formInput} 
              value={ctaEmail}
              onChange={(e) => setCtaEmail(e.target.value)}
              required
            />
            <button type="submit" className={styles.formBtn}>Get Started for Free</button>
          </form>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} EventHub. All rights reserved.</p>
      </footer>
    </div>
  );
}
