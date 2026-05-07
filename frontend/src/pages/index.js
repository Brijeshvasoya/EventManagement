import { useState, useEffect } from 'react';
import Image from 'next/image';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Calendar, Users, Shield, ArrowRight, Check, Play, Star, Sparkles } from 'lucide-react';
import styles from '../styles/Landing.module.css';
import { useAuth } from '@/context/AuthContext';

// Animation Variants
const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

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
    // If running inside Capacitor (Mobile App), redirect away from Landing Page to Login
    if (typeof window !== 'undefined' && (window).Capacitor?.isNativePlatform()) {
      router.replace('/login');
    }
    
    setTimeout(() => setMounted(true), 0);
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [router]);

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
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}
      >
        <div className={styles.logo}>
          <Image src="/logo.png" alt="EventHub Logo" width={32} height={32} priority style={{ objectFit: 'contain', borderRadius: '8px' }} />
          EventHub
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
      </motion.nav>

      {/* Hero */}
      <section id="home" className={styles.heroWrapper}>
        <div className={styles.hero}>
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={styles.heroLeft}
          >
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
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className={styles.heroRight}
          >
            <div className={styles.heroImageContainer}>
                <Image 
                  src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000" 
                  alt="Concert crowd" 
                  fill
                  unoptimized
                  style={{ objectFit: 'cover' }}
                />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services / Features */}
      <section id="services" className={styles.features}>
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: false, amount: 0.3 }}
          variants={fadeInUp}
        >
          <h2 className={styles.sectionTitle}>Our Specialized Services</h2>
          <p className={styles.sectionSubtitle}>
            Comprehensive event management utilizing the latest technology to ensure the best experience for your attendees and brand.
          </p>
        </motion.div>

        <motion.div
          className={styles.featuresGrid}
          initial="initial"
          whileInView="animate"
          viewport={{ once: false, amount: 0.1 }}
          variants={staggerContainer}
        >
          {[
            { icon: <Calendar size={24} />, title: "Seamless Scheduling", desc: "Intuitive calendar tools to manage dates, recurring events, and complex itineraries with ease.", watermark: <Calendar size={120} /> },
            { icon: <Shield size={24} />, title: "Secure Ticketing", desc: "Fraud-proof QR codes and secure payment processing to protect your revenue and attendees.", watermark: <Shield size={120} /> },
            { icon: <Users size={24} />, title: "Audience Engagement", desc: "Connect with attendees before, during, and after the event to maximize reach and loyalty.", watermark: <Users size={120} /> },
            { icon: <Star size={24} />, title: "Custom Branding", desc: "Dynamic branding options with customizable portals, custom domains, and rich visual tools.", watermark: <Star size={120} /> }
          ].map((feature, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              whileHover={{ y: -10, boxShadow: "0 20px 40px rgba(67, 56, 202, 0.1)" }}
              className={styles.featureCard}
            >
              <div className={styles.featureWatermark}>{feature.watermark}</div>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDesc}>{feature.desc}</p>
              <Link href="/signup" className={styles.featureLink}>Learn More <ArrowRight size={16} className={styles.featureArrow} /></Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* About / Expert Care */}
      <section id="why-us" className={styles.aboutSection}>
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.8 }}
          className={styles.aboutImageWrapper}
        >
          <Image 
            src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=1000" 
            alt="Tech conference" 
            fill
            unoptimized
            style={{ objectFit: 'cover' }}
            className={styles.aboutImage} 
          />
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 100, delay: 0.5 }}
            className={styles.aboutBadge}
          >
            <div className={styles.badgeIcon}><Check size={32} /></div>
            <div>
              <strong>100% Safe & Secure</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Industry standard technology</div>
            </div>
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.8 }}
          className={styles.aboutContent}
        >
          <h2 className={styles.aboutTitle}>Powerful Tools for Event Organizers</h2>
          <p className={styles.aboutDesc}>
            We deliver comprehensive event solutions that combine industry-leading technology with seamless user experiences. Our platform empowers organizers to create, manage, and scale events of any size.
          </p>
          <div className={styles.checkList}>
            {[
              "Dedicated Support", "Advanced Analytics", "Secure Payments",
              "Custom Integrations", "Real-time Tracking", "Global Audience Reach"
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: 0.1 * idx }}
                className={styles.checkItem}
              >
                <div className={styles.checkItemCircle}><Check size={14} /></div>
                {item}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className={styles.stepsSection}>
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: false }}
          variants={fadeInUp}
        >
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <p className={styles.sectionSubtitle}>Your journey to hosting successful events follows four simple steps.</p>
        </motion.div>

        <motion.div
          className={styles.stepsGrid}
          initial="initial"
          whileInView="animate"
          viewport={{ once: false }}
          variants={staggerContainer}
        >
          {[
            { num: "01", title: "Create Event", desc: "Set up your event page with dates, ticketing tiers, and custom branding." },
            { num: "02", title: "Promote & Sell", desc: "Share your unique link and start selling tickets globally with secure processing." },
            { num: "03", title: "Manage Attendees", desc: "Track sales in real-time and manage your guest list with our powerful dashboard." },
            { num: "04", title: "Host & Analyze", desc: "Check-in guests effortlessly and review comprehensive post-event analytics." }
          ].map((step, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              whileHover={{ scale: 1.05 }}
              className={styles.stepCard}
            >
              <div className={styles.stepNumber}>{step.num}</div>
              <h3 className={step.title}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className={styles.faqSection}>
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: false }}
          variants={fadeInUp}
        >
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
        </motion.div>
        <motion.div
          className={styles.faqGrid}
          initial="initial"
          whileInView="animate"
          viewport={{ once: false }}
          variants={staggerContainer}
        >
          {[
            { q: "Can I use EventHub for free?", a: "Yes, you can sign up for a free account. However, to create and host events, you will need to choose from our Basic or Pro plans." },
            { q: "How do I get paid for tickets?", a: "EventHub integrates with secure payment processors like Stripe and Razorpay. Payouts are transferred directly to your configured bank account." },
            { q: "Is there a limit to attendee capacity?", a: "Our Pro plan allows for unlimited attendees, ensuring your event can scale to any size without software limitations." },
            { q: "Can I customize my event page?", a: "Absolutely. EventHub provides robust customization tools, allowing you to add banners, custom colors, and branding to your event portal." }
          ].map((faq, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              whileHover={{ x: 10 }}
              className={styles.faqItem}
            >
              <h4 className={styles.faqQuestion}>{faq.q}</h4>
              <p className={styles.faqAnswer}>{faq.a}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA Bottom Block */}
      <section className={styles.ctaSection}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: false }}
          transition={{ duration: 0.6 }}
          className={styles.ctaBlock}
        >
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

          <motion.form
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ delay: 0.3 }}
            className={styles.ctaForm}
            onSubmit={handleCtaSubmit}
          >
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
          </motion.form>
        </motion.div>
      </section>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} EventHub. All rights reserved.</p>
      </footer>
    </div>
  );
}
