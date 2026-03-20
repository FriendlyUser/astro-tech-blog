import React, { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const skills = [
  { name: 'Python', icon: 'fa-brands fa-python', color: 'text-blue-500' },
  { name: 'JavaScript', icon: 'fa-brands fa-js', color: 'text-yellow-400' },
  { name: 'Node.js', icon: 'fa-brands fa-node', color: 'text-green-400' },
  { name: 'React', icon: 'fa-brands fa-react', color: 'text-blue-400' },
  { name: 'PHP', icon: 'fa-brands fa-php', color: 'text-indigo-400' },
  { name: 'Laravel', icon: 'fa-brands fa-laravel', color: 'text-red-500' },
  { name: 'Docker', icon: 'fa-brands fa-docker', color: 'text-blue-500' },
  { name: 'Git', icon: 'fa-brands fa-git-alt', color: 'text-orange-500' },
  { name: 'Stripe', icon: 'fa-brands fa-stripe', color: 'text-indigo-500' },
  { name: 'Openai', icon: 'fa-brands fa-openai', color: 'text-red-400' },
  { name: 'Azure', icon: 'fa-brands fa-microsoft', color: 'text-cyan-400' },
  { name: 'SQL', icon: 'fa-solid fa-database', color: 'text-orange-300' },
  { name: 'Java', icon: 'fa-brands fa-java', color: 'text-red-400' },
  { name: 'Linux', icon: 'fa-brands fa-linux', color: 'text-gray-200' },
];

const workHistory = [
  {
    id: 1,
    role: "IT-02 Analyst",
    company: "Canada School of Public Service (CSPS)",
    year: "2025 - Present",
    description: "Developing AI-powered internal tools and chatbots. Modernizing public service IT infrastructure using cloud-native solutions.",
    tags: ["Azure", "Openai", "Node.js", "Python"],
    color: "cyan"
  },
  {
    id: 2,
    role: "Software Engineer",
    company: "Royal Claims",
    year: "2024",
    description: "Engineered AI-driven document analysis and scaled backend processing for insurance claims automation.",
    tags: ["Python", "SQL", "Openai"],
    color: "indigo"
  },
  {
    id: 3,
    role: "Software Engineer",
    company: "Yellowsheet Construction Data",
    year: "2023",
    description: "Modernized legacy systems to PHP 8.3/Laravel and built high-performance Python data ingestion pipelines.",
    tags: ["PHP", "Laravel", "Python", "Stripe"],
    color: "emerald"
  },
  {
    id: 4,
    role: "Software Engineer",
    company: "carSHAiR",
    year: "2021 - 2023",
    description: "Led search UI redesigns and managed real-time microservices for a high-traffic marketplace.",
    tags: ["Node.js", "React", "Docker"],
    color: "rose"
  },
  {
    id: 5,
    role: "Software Developer",
    company: "Stealth Startup",
    year: "2018 - 2021",
    description: "Developed complex financial questionnaires and mobile apps using modern JS frameworks.",
    tags: ["Node.js", "PHP", "JavaScript"],
    color: "cyan"
  },
  {
    id: 6,
    role: "B.Sc. Computer Science",
    company: "University of Victoria (UVic)",
    year: "Class of 2019",
    description: "Specialized in Software Engineering and Algorithms. Completed multiple industry co-op terms.",
    tags: ["Java", "Linux", "Git"],
    color: "indigo"
  }
];

// Color mapping helper
const getColorClasses = (color: any) => {
  const schemes: any = {
    cyan: "border-cyan-500/30 shadow-cyan-500/10 text-cyan-400",
    indigo: "border-indigo-500/30 shadow-indigo-500/10 text-indigo-400",
    emerald: "border-emerald-500/30 shadow-emerald-500/10 text-emerald-400",
    rose: "border-rose-500/30 shadow-rose-500/10 text-rose-400"
  };
  return schemes[color] || schemes.cyan;
};

export default function Timeline() {
  const containerRef = useRef(null);

  // Helper for hover animations
  const onCardEnter = (e: any, color: any) => {
    const card = e.currentTarget;
    const row = card.closest('.timeline-row');
    const node = row.querySelector('.timeline-node');
    
    // Animate Card
    gsap.to(card, {
      y: -10,
      scale: 1.02,
      backgroundColor: "rgba(15, 23, 42, 0.8)", // Darker slate
      boxShadow: `0 20px 40px -10px var(--glow-color)`,
      duration: 0.4,
      ease: "power2.out"
    });

    // Animate Node
    gsap.to(node, {
      scale: 1.5,
      backgroundColor: color === 'cyan' ? '#22d3ee' : color === 'indigo' ? '#818cf8' : '#34d399',
      duration: 0.3
    });
  };

  const onCardLeave = (e) => {
    const card = e.currentTarget;
    const row = card.closest('.timeline-row');
    const node = row.querySelector('.timeline-node');

    gsap.to(card, {
      y: 0,
      scale: 1,
      backgroundColor: "rgba(15, 23, 42, 0.6)",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      duration: 0.4,
      ease: "power2.inOut"
    });

    gsap.to(node, {
      scale: 1,
      backgroundColor: "#020617", // Back to slate-950
      duration: 0.3
    });
  };

  useGSAP(() => {
    // Scroll Animations
    gsap.fromTo(".timeline-line", { scaleY: 0 }, {
      scaleY: 1,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top center",
        end: "bottom center",
        scrub: 0.5,
      },
    });

    gsap.utils.toArray(".timeline-row").forEach((row: any) => {
      const card = row.querySelector(".timeline-card");
      const node = row.querySelector(".timeline-node");
      
      gsap.timeline({
        scrollTrigger: {
          trigger: row,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      })
      .fromTo(node, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4 })
      .fromTo(card, { x: row.dataset.side === "left" ? -30 : 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, "-=0.2");
    });
  }, { scope: containerRef });

  return (
    <div className="bg-slate-950 py-24 px-4 min-h-screen text-slate-100 font-sans overflow-hidden">
      <div className="max-w-5xl mx-auto" ref={containerRef}>
        <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-24 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400">
          Professional Journey
        </h2>

        <div className="relative mt-2">
          <div className="timeline-line absolute left-6 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 via-indigo-500 to-emerald-500 transform md:-translate-x-1/2 origin-top rounded-full z-0 opacity-30" />

          {workHistory.map((item, index) => {
            const isLeft = index % 2 === 0;
            const colorClass = getColorClasses(item.color);
            // Define a CSS variable for the glow color based on the item theme
            const glowColor = item.color === 'cyan' ? 'rgba(34, 211, 238, 0.2)' : item.color === 'indigo' ? 'rgba(129, 140, 248, 0.2)' : 'rgba(52, 211, 153, 0.2)';

            return (
              <div key={item.id} data-side={isLeft ? "left" : "right"} className="timeline-row relative flex w-full mb-20 z-10">
                <div className={`timeline-node absolute left-6 md:left-1/2 top-10 md:top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-slate-950 border-2 rounded-full z-20 transition-colors duration-500 ${colorClass.split(' ')[0]}`} />
                
                <div className={`flex w-full ${isLeft ? "md:justify-start" : "md:justify-end"} justify-end`}>
                  <div 
                    onMouseEnter={(e) => onCardEnter(e, item.color)}
                    onMouseLeave={onCardLeave}
                    style={{ '--glow-color': glowColor }}
                    className={`timeline-card cursor-pointer w-[calc(100%-4rem)] md:w-[45%] bg-slate-900/60 backdrop-blur-xl p-7 rounded-3xl border shadow-2xl ${colorClass}`}
                  >
                    <span className="inline-block py-1 px-3 rounded-full bg-slate-800 text-[10px] font-bold uppercase tracking-widest mb-4 border border-slate-700">
                      {item.year}
                    </span>
                    <h3 className="text-2xl font-bold text-white leading-tight mb-1">{item.role}</h3>
                    <h4 className="text-slate-300 font-medium mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                      {item.company}
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">{item.description}</p>
                    
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                      {item.tags.map(tagName => {
                        const skillMatch = skills.find(s => s.name === tagName);
                        return (
                          <div key={tagName} className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/50 rounded-lg border border-white/5">
                            <i className={`${skillMatch?.icon || 'fa-solid fa-code'} ${skillMatch?.color || 'text-slate-400'} text-sm`}></i>
                            <span className="text-[11px] font-semibold text-slate-300">{tagName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}