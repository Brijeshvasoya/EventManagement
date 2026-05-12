import { useState, useEffect } from 'react';
import Image from 'next/image';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Calendar, Users, Shield, ArrowRight, Check, Play, Star, Sparkles, Bot, TrendingUp, CloudRain, X } from 'lucide-react';
import styles from '../styles/Landing.module.css';
import { useAuth } from '@/context/AuthContext';
import { Typography, Tag, Modal } from 'antd';
import YouTube from 'react-youtube';
const { Text: AntText } = Typography;

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
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

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

      {/* ── Background Animated Orbs (AI Project Style) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-50">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-200 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 100, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-100 rounded-full blur-[100px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        {/* Subtle Cinematic Overlay */}
        <img src="/hero_bg.png" className="absolute inset-0 w-full h-full object-cover opacity-[0.03] mix-blend-overlay" alt="" />
      </div>


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
      <section id="services" className="relative py-24 z-10">
        {/* Decorative Background Image */}
        <div className="absolute top-0 left-[-5%] w-[400px] h-[400px] opacity-[0.07] pointer-events-none grayscale">
          <img src="/hologram_calendar.png" alt="" className="w-full animate-[spin_40s_linear_infinite]" />
        </div>

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

      {/* AI Assistant Showcase Section (New Feature) */}
      <section id="ai-assistant" className="relative py-24 z-10 overflow-hidden bg-slate-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false }}
              className="flex-1"
            >
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight uppercase">
                Your Personal <br /> <span className="text-indigo-600">Event Strategist</span>
              </h2>
              <p className="text-lg text-slate-500 mb-10 font-medium">
                Our advanced AI isn't just a chatbot—it's a tool-powered engine that helps you plan, budget, and predict every detail of your event.
              </p>

              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { icon: <Bot size={20} />, title: "Smart Chat", color: "#6366f1" },
                  { icon: <Calendar size={20} />, title: "AI Planning", color: "#8b5cf6" },
                  { icon: <TrendingUp size={20} />, title: "Budget Logic", color: "#ec4899" },
                  { icon: <CloudRain size={20} />, title: "Weather Guard", color: "#3b82f6" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div style={{ color: item.color }} className="shrink-0">{item.icon}</div>
                    <span className="font-bold text-slate-700 text-sm">{item.title}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false }}
              className="flex-1 relative"
            >
              <motion.div
                animate={{
                  y: [0, -25, 0],
                  rotate: [0, 3, -3, 0],
                  scale: [1, 0.96, 1.04, 1]
                }}
                transition={{
                  y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 7, repeat: Infinity, ease: "easeInOut" },
                  scale: { duration: 6, repeat: Infinity, ease: "easeInOut" }
                }}
                className="relative z-10"
              >
                <img
                  src="/chatbot_avatar.png"
                  alt="AI Assistant Bot"
                  className="w-full h-auto rounded-[3rem] drop-shadow-[0_20px_60px_rgba(99,102,241,0.5)] transition-all duration-500"
                />
              </motion.div>
              {/* Decorative Circle Background */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-100 rounded-full blur-3xl -z-10"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About / Expert Care */}
      <section id="why-us" className={styles.aboutSection}>
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.8 }}
          className={styles.aboutImageWrapper}
          style={{ minHeight: '450px', cursor: 'pointer' }}
          onClick={() => setIsVideoModalOpen(true)}
        >
          <div className="absolute inset-0 w-full h-full rounded-[40px] overflow-hidden shadow-2xl bg-slate-900 pointer-events-none">
            <YouTube
              videoId="bYIFcV_S_3k"
              opts={{
                playerVars: {
                  autoplay: 1,
                  mute: 1,
                  loop: 1,
                  playlist: 'bYIFcV_S_3k',
                  controls: 0,
                  showinfo: 0,
                  modestbranding: 1,
                  rel: 0,
                },
              }}
              className="w-full h-full"
              iframeClassName="w-full h-full scale-[1.5]"
            />
          </div>
          {/* Video Play Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-all rounded-[40px] group">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
              <Play size={32} fill="currentColor" className="text-indigo-600 ml-1" />
            </div>
          </div>
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

      {/* Affiliate / Promoter Network Section */}
      <section id="affiliate" className={styles.affiliateSection}>
        <div className={styles.affiliateGrid}>
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8 }}
            className={styles.affiliateContent}
          >
            <h2 className={styles.sectionTitle} style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              Become an <span style={{ color: 'var(--primary-color)' }}>Event Promoter</span>
            </h2>
            <p className={styles.sectionSubtitle} style={{ textAlign: 'left', marginLeft: 0, maxWidth: '100%' }}>
              Turn your social network into a source of income. Promote your favorite events, offer exclusive discounts to your followers, and earn instant commissions on every ticket sold through your link.
            </p>

            <div className={styles.affiliateFeatures}>
              {[
                { title: "High Commissions", desc: "Earn competitive commissions on every ticket sale you refer." },
                { title: "Exclusive Discounts", desc: "Give your network special promo codes for instant savings." },
                { title: "Real-time Tracking", desc: "Monitor your sales, clicks, and earnings through your personal dashboard." }
              ].map((f, i) => (
                <div key={i} className={styles.affiliateFeatureItem}>
                  <div className={styles.checkItemCircle} style={{ background: '#eef2ff', color: '#6366f1' }}><Check size={14} /></div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>{f.title}</h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.95rem', color: '#64748b' }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/signup" className={styles.primaryBtn} style={{ marginTop: '2.5rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Join Affiliate Network <ArrowRight size={18} />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8 }}
            className={styles.affiliateImageWrapper}
          >
            <div className={styles.statsCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <AntText strong style={{ fontSize: '1.1rem' }}>Earning Analytics</AntText>
                <Tag color="green" style={{ borderRadius: '6px', fontWeight: 700 }}>LIVE</Tag>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1, padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                  <AntText type="secondary" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>Total Sales</AntText>
                  <AntText strong style={{ fontSize: '1.6rem', color: '#0f172a' }}>124</AntText>
                </div>
                <div style={{ flex: 1, padding: '20px', background: '#f0fdf4', borderRadius: '16px', border: '1px solid #dcfce7' }}>
                  <AntText type="secondary" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>Total Earned</AntText>
                  <AntText strong style={{ fontSize: '1.6rem', color: '#166534' }}>₹15,450</AntText>
                </div>
              </div>
              <div style={{ marginTop: '2rem', height: '120px', background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)', borderRadius: '16px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AntText type="secondary" style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>Real-time performance graph</AntText>
              </div>
            </div>

            {/* Floating decoration badge */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{ position: 'absolute', top: '-20px', right: '-20px', background: '#4338ca', color: 'white', padding: '12px 20px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(67, 56, 202, 0.3)', zIndex: 3 }}
            >
              <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 600 }}>Highest Payout</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>₹2,400 / day</div>
            </motion.div>
          </motion.div>
        </div>
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
            { q: "Can I customize my event page?", a: "Absolutely. EventHub provides robust customization tools, allowing you to add banners, custom colors, and branding to your event portal." },
            { q: "How does the Affiliate Network work?", a: "Promoters can apply to partner with any event. Once approved, you get a unique promo code. When someone buys a ticket using your code, they get a discount and you earn a percentage-based commission!" }
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

      {/* Video Modal */}
      <Modal
        open={isVideoModalOpen}
        onCancel={() => setIsVideoModalOpen(false)}
        footer={null}
        width={1000}
        centered
        styles={{
          body: { padding: 0, backgroundColor: '#000', overflow: 'hidden', borderRadius: '12px' },
          mask: { backdropFilter: 'blur(8px)' }
        }}
        destroyOnHidden={true}
        closeIcon={
          <div className="absolute -top-7 -right-7 bg-white backdrop-blur-md p-3 rounded-full border border-white/20 shadow-4xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center group">
            <X size={22} className="text-black group-hover:rotate-90 transition-transform duration-300" />
          </div>
        }
      >
        <div className="aspect-video">
          {isVideoModalOpen && (
            <YouTube
              videoId="bYIFcV_S_3k"
              opts={{
                width: '100%',
                height: '100%',
                playerVars: {
                  autoplay: 1,
                  modestbranding: 1,
                  rel: 0,
                },
              }}
              className="w-full h-full"
            />
          )}
        </div>
      </Modal>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} EventHub. All rights reserved.</p>
      </footer>
    </div>
  );
}
