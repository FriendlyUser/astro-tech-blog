import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { GradientText } from '@/components/GradientText';
import { Section } from '@/components/Section';

// We define the list of skills as an array to keep the JSX clean
const skills = [
  { name: 'Python', icon: 'fa-brands fa-python', color: 'text-blue-500' },
  { name: 'JavaScript', icon: 'fa-brands fa-js', color: 'text-yellow-400' },
  { name: 'Java', icon: 'fa-brands fa-java', color: 'text-red-400' },
  { name: 'Golang', icon: 'fa-brands fa-golang', color: 'text-cyan-600' },
  { name: 'Node.js', icon: 'fa-brands fa-node', color: 'text-green-400' },
  { name: 'React', icon: 'fa-brands fa-react', color: 'text-blue-400' },
  { name: 'Css3', icon: 'fa-brands fa-css3', color: 'text-yellow-600' },
  { name: 'Vue.js', icon: 'fa-brands fa-vuejs', color: 'text-emerald-500' },
  { name: 'HTML5', icon: 'fa-brands fa-html5', color: 'text-orange-500' },
  { name: 'PHP', icon: 'fa-brands fa-php', color: 'text-indigo-400' },
  { name: 'Flutter', icon: 'fa-brands fa-flutter', color: 'text-cyan-400' },
  { name: 'Laravel', icon: 'fa-brands fa-laravel', color: 'text-red-500' },
  { name: 'SASS', icon: 'fa-brands fa-sass', color: 'text-pink-400' },
  { name: 'NPM', icon: 'fa-brands fa-npm', color: 'text-red-500' },
  { name: 'Docker', icon: 'fa-brands fa-docker', color: 'text-blue-500' },
  { name: 'AWS', icon: 'fa-brands fa-aws', color: 'text-orange-400' },
  { name: 'Linux', icon: 'fa-brands fa-linux', color: 'text-gray-200' },
  { name: 'Ubuntu', icon: 'fa-brands fa-ubuntu', color: 'text-orange-500' },
  { name: 'cPanel', icon: 'fa-brands fa-cpanel', color: 'text-orange-600' },
  { name: 'Git', icon: 'fa-brands fa-git-alt', color: 'text-orange-500' },
  { name: 'GitHub', icon: 'fa-brands fa-github-alt', color: 'text-gray-100' },
  { name: 'Bitbucket', icon: 'fa-brands fa-bitbucket', color: 'text-blue-600' },
  { name: "Android", icon: 'fa-brands fa-android', color: 'text-green-800'}, 
  { name: 'Jira', icon: 'fa-brands fa-jira', color: 'text-blue-500' },
  { name: 'Stripe', icon: 'fa-brands fa-stripe', color: 'text-indigo-500' },
  { name: 'Font Awesome', icon: 'fa-brands fa-font-awesome', color: 'text-blue-400' },
  { name: 'W3C', icon: 'fa-brands fa-w3c', color: 'text-blue-500' },
  { name: 'TeX', icon: 'fa-solid fa-tex', color: 'text-black-300' },
  { name: 'Hugging Face', icon: 'fa-solid fa-robot', color: 'text-yellow-500' },
  { name: 'Openai', icon: 'fa-brands fa-openai', color: 'text-red-400' },
];

// Duplicate the array so we can create a seamless infinite loop
const duplicatedSkills = [...skills, ...skills];

const SkillList = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const marqueeTween = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // 1. Animate the section title entering
      gsap.from('.skills-title', {
        opacity: 0,
        y: -20,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 85%',
        },
      });

      // 2. Fade in the whole track area on scroll
      gsap.from('.marquee-container', {
        opacity: 0,
        y: 20,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.marquee-container',
          start: 'top 85%',
        },
      });

      // 3. The Infinite Marquee Animation
      // By moving exactly -50% of the duplicated track width, we reach the exact point where 
      // the second half perfectly overlaps the starting position, creating a seamless loop.
      marqueeTween.current = gsap.to(trackRef.current, {
        xPercent: -50, 
        ease: 'none', // Linear ease is crucial for continuous scrolling
        duration: 35, // Adjust this to make it faster/slower
        repeat: -1, // Loop infinitely
      });

    }, containerRef);

    return () => ctx.revert(); // Cleanup
  }, []);

  // Handlers to pause/play animation on hover
  const handleMouseEnter = () => marqueeTween.current?.pause();
  const handleMouseLeave = () => marqueeTween.current?.play();

  return (
    <div ref={containerRef}>
      <Section
        title={
          <span className="skills-title inline-block">
            My <GradientText>Skills</GradientText>
          </span>
        }
      >
        {/* Marquee Container with fade masks on left and right edges */}
        <div 
          className="marquee-container relative w-full overflow-hidden py-4"
          style={{
            // This CSS mask fades out the far left and far right edges of the container
            maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          }}
        >
          {/* The Track that moves */}
          <div 
            ref={trackRef}
            className="flex w-max gap-8 px-4"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {duplicatedSkills.map((skill, index) => (
              <div
                key={index}
                className="group flex flex-col items-center justify-center gap-2 cursor-pointer"
                title={skill.name} // Native HTML tooltip
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-800 transition-all duration-300 hover:-translate-y-2 hover:bg-gray-700 hover:shadow-lg hover:shadow-cyan-500/20">
                  <i className={`${skill.icon} text-4xl ${skill.color} transition-transform duration-300 group-hover:scale-110`}></i>
                </div>
                {/* Text that fades in when hovering the specific icon */}
                <span className="text-sm font-medium text-gray-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {skill.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
};

export { SkillList };
