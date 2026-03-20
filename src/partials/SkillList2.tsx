import { useEffect, useState } from 'react';
import { GradientText } from '@/components/GradientText';
import { Section } from '@/components/Section';

// Reduced to 10 items as requested
const skills = [
  { name: 'JavaScript', icon: 'fa-brands fa-js', color: 'text-yellow-400' },
  { name: 'TypeScript', icon: 'fa-brands fa-typescript', color: 'text-blue-200' },
  { name: 'React', icon: 'fa-brands fa-react', color: 'text-blue-400' },
  { name: 'Node.js', icon: 'fa-brands fa-node', color: 'text-green-400' },
  { name: 'Python', icon: 'fa-brands fa-python', color: 'text-blue-500' },
  { name: 'AWS', icon: 'fa-brands fa-aws', color: 'text-orange-400' },
  { name: 'Docker', icon: 'fa-brands fa-docker', color: 'text-blue-500' },
  { name: 'Linux', icon: 'fa-brands fa-linux', color: 'text-gray-200' },
  { name: 'Git', icon: 'fa-brands fa-git-alt', color: 'text-orange-500' },
  { name: 'Tailwind CSS', icon: 'fa-brands fa-tailwind-css', color: 'text-cyan-500' },
];

const SkillList = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Automatic timer transition
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % skills.length);
    }, 2500); // Transitions every 2.5 seconds

    return () => clearInterval(timer);
  }, [isPaused]);

  // Helper to calculate an item's position relative to the center (activeIndex)
  // This ensures the loop wraps around seamlessly
  const getRelativePosition = (index: any) => {
    const total = skills.length;
    let diff = (index - activeIndex) % total;
    
    // Adjust for smooth wrap-around
    if (diff < -Math.floor(total / 2)) diff += total;
    if (diff > Math.floor(total / 2)) diff -= total;
    
    return diff;
  };

  return (
    <Section
      title={
        <span className="skills-title inline-block">
          My <GradientText>Skills</GradientText>
        </span>
      }
    >
      {/* Carousel Container */}
      <div 
        className="relative flex items-center justify-center w-full h-48 overflow-hidden py-4"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {skills.map((skill, index) => {
          const position = getRelativePosition(index);
          const isVisible = Math.abs(position) <= 2; // Only show 5 items (center, 2 left, 2 right)
          const isCenter = position === 0;

          // Calculate styling based on position distance from the center
          let transform = 'translateX(0) scale(1)';
          let opacity = 0;
          let zIndex = 0;

          if (isVisible) {
             // Move items left/right by 110% of their width and scale down outer items
            transform = `translateX(${position * 110}%) scale(${isCenter ? 1.2 : 1 - Math.abs(position) * 0.15})`;
            opacity = isCenter ? 1 : 1 - Math.abs(position) * 0.3;
            zIndex = 10 - Math.abs(position);
          } else {
            // Push hidden elements far out so they fly in from the correct direction
            transform = `translateX(${position > 0 ? 300 : -300}%) scale(0.5)`;
            opacity = 0;
            zIndex = 0;
          }

          return (
            <div
              key={skill.name}
              className="absolute flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-500 ease-in-out"
              style={{
                transform,
                opacity,
                zIndex,
                pointerEvents: isVisible ? 'auto' : 'none',
              }}
              title={skill.name}
              onClick={() => setActiveIndex(index)} // Click any visible icon to bring it to center
            >
              <div 
                className={`flex items-center justify-center rounded-2xl transition-all duration-500
                  ${isCenter 
                    ? 'h-24 w-24 bg-gray-700 shadow-lg shadow-cyan-500/20' 
                    : 'h-20 w-20 bg-gray-800'}`}
              >
                <i className={`${skill.icon} text-4xl ${skill.color}`}></i>
              </div>
              
              {/* Only show the text for the centered item */}
              <span 
                className={`text-sm font-medium transition-opacity duration-500
                  ${isCenter ? 'text-gray-200 opacity-100' : 'text-gray-500 opacity-0'}`}
              >
                {skill.name}
              </span>
            </div>
          );
        })}
      </div>
    </Section>
  );
};

export { SkillList };