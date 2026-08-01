"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  FileCheck2, 
  Wallet, 
  ArrowRight, 
  CheckCircle2, 
  Circle,
  Activity,
  Receipt,
  Landmark,
  ChevronRight,
  Sparkles,
  Globe
} from 'lucide-react';

// --- ANIMATION VARIANTS (Antigravity & Stagger) ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 200, damping: 20 }
  }
};

// --- TRANSLATION / i18n DICTIONARY ---
const i18n = {
  TR: {
    header: {
      badge: "Süreç Radarı",
      title: "Şirket Kurulum Paneli",
      desc: "Tüm yasal süreçlerinizi şeffaf, oyunlaştırılmış ve tek merkezden akıcı bir şekilde yönetin.",
      cta: "Süreci Hızlandır"
    },
    stages: {
      pre: { title: "Kurulum Öncesi", desc: "Şirket türü, unvan ve belgeler" },
      during: { title: "Kurulum Süreci", desc: "Resmi tescil ve vergi dairesi" },
      post: { title: "Kurulum Sonrası", desc: "E-fatura, beyannameler ve finans" }
    },
    sections: {
      pre: "Hazırlık Adımları",
      during: "Resmi Kurulum İşlemleri",
      post: "Operasyonel Radar",
      step1: "Aşama 1/3",
      step2: "Aşama 2/3",
      step3: "Aşama 3/3"
    },
    tasks: {
      pre: [
        { id: 1, title: 'Şirket Türü Analizi', status: 'done', detail: 'Sizin için en uygunu Limited Şirket olarak belirlendi.' },
        { id: 2, title: 'Unvan Seçimi ve Sorgulama', status: 'done', detail: 'GrantRadar Teknoloji A.Ş. MERSİS üzerinde onaylandı.' },
        { id: 3, title: 'Kuruluş Evraklarının Yüklenmesi', status: 'current', detail: 'Kimlik ve ikametgah belgenizin yüklenmesi bekleniyor.' }
      ],
      during: [
        { id: 1, title: 'Ticaret Odası Tescili', status: 'pending', detail: 'Sistem üzerinden randevu talebi oluşturulacak.' },
        { id: 2, title: 'Vergi Levhası Oluşturulması', status: 'pending', detail: 'Vergi dairesi yoklaması bekleniyor.' },
        { id: 3, title: 'İmza Sirküleri Çıkarılması', status: 'pending', detail: 'Noter onayı için randevunuz planlandı.' }
      ]
    },
    widgets: [
      { id: 1, title: 'Yaklaşan KDV Beyannamesi', value: '24 Ekim' },
      { id: 2, title: 'Aktif E-Fatura Limiti', value: '₺150,000' },
      { id: 3, title: 'Bağ-Kur / SGK Borcu', value: 'Bulunmuyor' }
    ],
    ai: {
      title: "Canlı Eşleştirme Motoru",
      desc: "Sistemimize yüklediğiniz kimlik ve adres bilgilerine göre şirket türü olarak 'Limited Şirket' seçmeniz, potansiyel vergi avantajları açısından %18 daha verimli görünmektedir.",
      check1: "Seçilen ünvan MERSİS'e uygun",
      check2: "Teşvik radarı skoru: 85/100",
      btn: "Destek Ekibiyle Görüş"
    }
  },
  EN: {
    header: {
      badge: "Process Radar",
      title: "Company Formation Dashboard",
      desc: "Manage all your legal processes transparently, gamified, and smoothly from a single center.",
      cta: "Accelerate Process"
    },
    stages: {
      pre: { title: "Pre-Formation", desc: "Company type, name, and documents" },
      during: { title: "Formation Process", desc: "Official registration and tax office" },
      post: { title: "Post-Formation", desc: "E-invoice, declarations, and finance" }
    },
    sections: {
      pre: "Preparation Steps",
      during: "Official Registration Procedures",
      post: "Operational Radar",
      step1: "Stage 1/3",
      step2: "Stage 2/3",
      step3: "Stage 3/3"
    },
    tasks: {
      pre: [
        { id: 1, title: 'Company Type Analysis', status: 'done', detail: 'Limited Liability Company (LLC) was determined as the best fit for you.' },
        { id: 2, title: 'Name Selection and Inquiry', status: 'done', detail: 'GrantRadar Technology Inc. has been approved on MERSIS.' },
        { id: 3, title: 'Uploading Formation Documents', status: 'current', detail: 'Waiting for you to upload your ID and proof of address.' }
      ],
      during: [
        { id: 1, title: 'Chamber of Commerce Registration', status: 'pending', detail: 'An appointment request will be created via the system.' },
        { id: 2, title: 'Tax Plate Creation', status: 'pending', detail: 'Waiting for tax office inspection.' },
        { id: 3, title: 'Issuance of Signature Circular', status: 'pending', detail: 'Your appointment for notary approval is scheduled.' }
      ]
    },
    widgets: [
      { id: 1, title: 'Upcoming VAT Declaration', value: 'Oct 24' },
      { id: 2, title: 'Active E-Invoice Limit', value: '₺150,000' },
      { id: 3, title: 'Social Security Debt', value: 'None' }
    ],
    ai: {
      title: "Live Matching Engine",
      desc: "Based on the ID and address information you uploaded to our system, selecting 'Limited Company' as your company type appears to be 18% more efficient in terms of potential tax advantages.",
      check1: "Selected title is MERSIS compliant",
      check2: "Incentive radar score: 85/100",
      btn: "Speak with Support Team"
    }
  }
};

export default function CompanyFormationDashboard() {
  const [activeStage, setActiveStage] = useState('pre');
  const [lang, setLang] = useState('TR');

  const t = i18n[lang];

  const STAGES = [
    { id: 'pre', title: t.stages.pre.title, icon: Building2, desc: t.stages.pre.desc },
    { id: 'during', title: t.stages.during.title, icon: FileCheck2, desc: t.stages.during.desc },
    { id: 'post', title: t.stages.post.title, icon: Wallet, desc: t.stages.post.desc }
  ];

  const WIDGETS = [
    { id: 1, title: t.widgets[0].title, value: t.widgets[0].value, icon: Receipt, color: 'text-violet-400', bg: 'bg-violet-400/10' },
    { id: 2, title: t.widgets[1].title, value: t.widgets[1].value, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { id: 3, title: t.widgets[2].title, value: t.widgets[2].value, icon: Landmark, color: 'text-cyan-400', bg: 'bg-cyan-400/10' }
  ];

  const toggleLanguage = () => {
    setLang(prev => prev === 'TR' ? 'EN' : 'TR');
  };

  const renderTasks = (tasks) => (
    <div className="space-y-4">
      {tasks.map((task) => (
        <motion.div 
          key={task.id}
          variants={itemVariants}
          whileHover={{ 
            y: -6, 
            boxShadow: "0 25px 50px -12px rgba(6, 182, 212, 0.15)",
            transition: { type: 'spring', stiffness: 350, damping: 15 }
          }}
          className="group relative flex items-start gap-5 rounded-3xl bg-white/[0.02] border border-white/[0.04] p-5 backdrop-blur-xl cursor-pointer overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="mt-1 z-10">
            {task.status === 'done' ? (
              <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : task.status === 'current' ? (
              <div className="relative flex h-7 w-7 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-20"></span>
                <Circle className="relative w-5 h-5 text-cyan-400 fill-cyan-400/20" />
              </div>
            ) : (
              <Circle className="w-6 h-6 text-white/20" strokeWidth={1.5} />
            )}
          </div>
          
          <div className="flex-1 z-10">
            <h4 className="text-base font-medium text-white/90 tracking-wide mb-1 normal-case">{task.title}</h4>
            <p className="text-sm font-light text-white/50 leading-relaxed tracking-wide normal-case">{task.detail}</p>
          </div>

          <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 self-center z-10">
            <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-cyan-400 transition-colors" />
          </button>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07080A] text-white/80 font-sans selection:bg-cyan-500/30 overflow-hidden relative">
      
      {/* Abstract Background Blurs (Antigravity Ambience) */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-600/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed top-[40%] right-[-20%] w-[40%] h-[40%] bg-emerald-600/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Floating Language Toggle */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute top-6 right-6 z-50"
      >
        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-xl transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.02)] group"
        >
          <Globe className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
          <span className="text-sm font-medium tracking-wide text-white/80">{lang === 'TR' ? 'EN' : 'TR'}</span>
        </button>
      </motion.div>

      <div className="max-w-6xl mx-auto px-6 py-20 relative z-10">
        
        {/* Header Section */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-20 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-8"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-cyan-300 text-sm font-medium tracking-wide mb-6 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="normal-case">{t.header.badge}</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight mb-4 leading-tight normal-case">
              {t.header.title}
            </h1>
            <p className="text-lg md:text-xl font-light text-white/50 max-w-2xl tracking-wide leading-relaxed normal-case">
              {t.header.desc}
            </p>
          </div>
          
          <button className="px-8 py-3.5 rounded-full bg-white/90 text-black font-medium text-sm hover:bg-white transition-all hover:scale-105 active:scale-95 flex items-center gap-2 w-max mx-auto md:mx-0 shadow-lg shadow-white/10 normal-case">
            {t.header.cta} <ArrowRight className="w-4 h-4" />
          </button>
        </motion.header>

        {/* Stage Navigation */}
        <div className="flex flex-col md:flex-row gap-4 mb-16">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            const isActive = activeStage === stage.id;
            return (
              <motion.button
                key={stage.id}
                whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400 } }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveStage(stage.id)}
                className={`flex-1 relative flex items-center gap-5 p-6 rounded-[2rem] transition-all duration-500 border ${
                  isActive 
                    ? 'bg-white/[0.04] border-white/10 shadow-[0_20px_40px_-20px_rgba(255,255,255,0.05)]' 
                    : 'bg-transparent border-transparent hover:bg-white/[0.02]'
                }`}
              >
                <div className={`p-4 rounded-2xl transition-colors duration-500 ${isActive ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]' : 'bg-white/5 text-white/40'}`}>
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2 : 1.5} />
                </div>
                <div className="text-left">
                  <h3 className={`text-lg font-medium tracking-wide transition-colors normal-case ${isActive ? 'text-white' : 'text-white/60'}`}>
                    {stage.title}
                  </h3>
                  <p className="text-sm font-light text-white/40 mt-1 tracking-wide normal-case">{stage.desc}</p>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStage + lang} // Remount on language change for smooth animation
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-10"
          >
            {/* Left Column: Tasks / Stepper */}
            <div className="lg:col-span-8">
              <div className="mb-8 flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-white/90 tracking-tight normal-case">
                  {activeStage === 'pre' && t.sections.pre}
                  {activeStage === 'during' && t.sections.during}
                  {activeStage === 'post' && t.sections.post}
                </h2>
                <span className="text-sm font-medium text-white/40 normal-case tracking-wide bg-white/5 px-4 py-1.5 rounded-full">
                  {activeStage === 'pre' ? t.sections.step1 : activeStage === 'during' ? t.sections.step2 : t.sections.step3}
                </span>
              </div>

              {activeStage === 'pre' && renderTasks(t.tasks.pre)}
              {activeStage === 'during' && renderTasks(t.tasks.during)}
              
              {activeStage === 'post' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {WIDGETS.map((widget) => (
                    <motion.div 
                      key={widget.id}
                      variants={itemVariants}
                      whileHover={{ 
                        y: -8, 
                        boxShadow: "0 25px 50px -12px rgba(255, 255, 255, 0.05)",
                        transition: { type: 'spring', stiffness: 300, damping: 20 }
                      }}
                      className="rounded-[2rem] bg-white/[0.02] border border-white/[0.04] p-8 backdrop-blur-xl flex flex-col items-center justify-center text-center gap-5 cursor-default relative overflow-hidden"
                    >
                      <div className={`p-5 rounded-2xl ${widget.bg} ${widget.color}`}>
                        <widget.icon className="w-8 h-8" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-light text-white/50 mb-2 tracking-wide normal-case">{widget.title}</p>
                        <h4 className="text-2xl font-semibold text-white tracking-tight">{widget.value}</h4>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: AI Insights & Support */}
            <div className="lg:col-span-4">
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400 } }}
                className="rounded-[2rem] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.05] p-8 relative overflow-hidden backdrop-blur-xl"
              >
                <div className="absolute top-[-10%] right-[-10%] p-4 opacity-5 pointer-events-none">
                  <Activity className="w-48 h-48 text-cyan-400" />
                </div>
                
                <h3 className="text-lg font-medium text-white/90 mb-3 flex items-center gap-3 tracking-wide normal-case">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                  </span>
                  {t.ai.title}
                </h3>
                <p className="text-base font-light text-white/50 leading-relaxed mb-8 tracking-wide normal-case">
                  {t.ai.desc}
                </p>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center gap-4">
                    <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-white/70 tracking-wide font-light normal-case">{t.ai.check1}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center gap-4">
                    <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-white/70 tracking-wide font-light normal-case">{t.ai.check2}</span>
                  </div>
                </div>
                
                <button className="w-full mt-8 py-4 rounded-full bg-white/[0.03] hover:bg-white/[0.08] text-white/90 text-sm font-medium tracking-wide transition-all border border-white/[0.05] hover:border-white/10 flex items-center justify-center gap-2 normal-case">
                  {t.ai.btn}
                </button>
              </motion.div>
            </div>
            
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
