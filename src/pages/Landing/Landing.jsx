import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CATEGORIES } from "../../constants/interviewOptions.js";

const FEATURES = [
  { icon: "🧠", title: "Adaptive AI Interviewer", desc: "Sharp follow-ups based on your actual answers - never generic questions." },
  { icon: "💻", title: "Live Coding Round", desc: "Monaco-powered editor with multi-language support and autosave." },
  { icon: "🎙️", title: "Voice Interviews", desc: "Speak your answers with built-in speech-to-text and text-to-speech." },
  { icon: "📊", title: "Deep Reports", desc: "Radar + bar charts across technical, communication, and confidence scores." },
  { icon: "📄", title: "Downloadable PDF", desc: "Take your feedback report anywhere, export it in one click." },
  { icon: "📈", title: "Progress History", desc: "Track every interview and watch your average score climb." },
];

export default function Landing() {
  return (
    <div>
      <section className="relative mx-auto max-w-6xl px-4 py-24 text-center md:px-8 md:py-32">
        <div className="pointer-events-none absolute inset-x-0 top-10 -z-10 mx-auto h-64 w-2/3 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="mb-5 inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-900/60 dark:bg-brand-900/20 dark:text-brand-300">AI-powered interview practice</div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-extrabold tracking-tight md:text-6xl md:leading-[1.08]"
        >
          Ace your next interview with a
          <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent"> real AI interviewer</span>
        </motion.h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
          Practice HR, DSA, Core CS, Web Development, and System Design interviews.
          Get adaptive follow-ups, live coding rounds, and a detailed scorecard - all for free.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/register" className="btn-primary !px-6 !py-3 text-base">Start Practicing Free</Link>
          <Link to="/login" className="btn-secondary !px-6 !py-3 text-base">I already have an account</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-8">
        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => (
            <span key={c.value} className="badge bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              {c.label}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 md:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card group p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-950/[0.06]">
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-1 text-lg font-bold">{f.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
