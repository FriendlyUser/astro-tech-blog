import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import './AnimatedLaptop.css'; // See CSS below

const AnimatedLaptop = () => {
  const containerRef = useRef(null);
  const lidRef = useRef(null);
  const screenRef = useRef(null);

  // useGSAP is the optimized way to use GSAP in React. 
  // It automatically handles cleanup, preventing memory leaks in SPAs or Astro islands.
  useGSAP(() => {
    const tl = gsap.timeline({
      // Start animation when the component mounts (or becomes visible in Astro)
      delay: 0.2,
      defaults: { ease: 'power3.out' }
    });

    // 1. Fade and float the laptop in (GPU optimized: y and opacity)
    tl.from(containerRef.current, {
      y: 50,
      opacity: 0,
      duration: 1,
    })
    // 2. Open the laptop lid in 3D space
    .to(lidRef.current, {
      rotateX: 0, 
      duration: 1.5,
      ease: 'power4.inOut',
    })
    // 3. Turn on the screen
    .to(screenRef.current, {
      backgroundColor: '#1e1e2e',
      duration: 0.3,
    })
    // 4. Animate the terminal text / core skills (Staggered fade/slide)
    .from('.terminal-line', {
      opacity: 0,
      x: -10,
      stagger: 0.2,
      duration: 0.4,
    });
  }, { scope: containerRef }); // Scoping prevents GSAP from querying the entire DOM

  return (
    <div className="laptop-scene" ref={containerRef}>
      <div className="laptop-wrapper">
        {/* Laptop Lid */}
        <div className="laptop-lid" ref={lidRef}>
          <div className="laptop-screen" ref={screenRef}>
            <div className="terminal-content">
              <p className="terminal-line text-muted">{'>'} initializing environment...</p>
              <p className="terminal-line text-muted">{'>'} loading core_skills.sh...</p>
              <br />
              <p className="terminal-line skill-item">
                <span className="text-green">[OK]</span> 🤖 Advanced LLM Usage & Prompting
              </p>
              <p className="terminal-line skill-item">
                <span className="text-green">[OK]</span> 💻 Skilled Software Programming
              </p>
              <p className="terminal-line skill-item">
                <span className="text-green">[OK]</span> ⚡ Optimized Front-end Architecture
              </p>
              <p className="terminal-line skill-item">
                <span className="text-green">[OK]</span> 🔧 Robust Back-end Systems
              </p>
              <br />
              <p className="terminal-line text-cursor">{'>'} ready_</p>
            </div>
          </div>
        </div>

        {/* Laptop Base */}
        <div className="laptop-base">
          <div className="laptop-keyboard"></div>
          <div className="laptop-trackpad"></div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedLaptop;
