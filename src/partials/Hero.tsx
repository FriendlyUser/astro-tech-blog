import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

import { HeroAvatar } from '@/components/HeroAvatar';
import { HeroSocial } from '@/components/HeroSocial';
import { Section } from '@/components/Section';

const Hero = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // gsap.context ensures smooth cleanup in React/Astro
    const ctx = gsap.context(() => {
      // Create a timeline for sequenced animations
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from('.hero-avatar', {
        scale: 0.8,
        opacity: 0,
        duration: 1,
      })
        .from(
          '.hero-title',
          {
            y: 30,
            opacity: 0,
            duration: 0.8,
          },
          '-=0.6' // Start 0.6 seconds before the previous animation ends
        )
        .from(
          '.hero-desc',
          {
            y: 20,
            opacity: 0,
            duration: 0.8,
          },
          '-=0.6'
        )
        .from(
          '.hero-social',
          {
            y: 20,
            opacity: 0,
            stagger: 0.15, // Pop in one by one
            duration: 0.5,
          },
          '-=0.4'
        );
    }, heroRef);

    return () => ctx.revert(); // Cleanup on unmount
  }, []);

  return (
    <div ref={heroRef}>
      <Section>
        <HeroAvatar
          title={
            <div className="hero-title">
              Hi there, I'm David 👋
            </div>
          }
          description={
            <div className="hero-desc">
              I am a software developer who blogs and deploys tools for investing.
              You can find some of my free tools at{' '}
              <a
                className="text-cyan-400 hover:underline"
                href="https://github.com/dli-invest"
              >
                dli-invest
              </a>
              .
            </div>
          }
          avatar={
            <div className="hero-avatar">
              <img
                className="h-80 w-80 object-cover rounded-full"
                src="https://www.gravatar.com/avatar/d5a6e001f027e8cf3dbf048a926baa77?s=200"
                alt="Avatar image"
                loading="eager" // Changed to eager since it's above the fold
              />
            </div>
          }
          socialButtons={
            <>
              {/* Added the "hero-social" class to each anchor tag for staggering */}
              <a className="hero-social inline-block" href="https://www.linkedin.com/in/david-l-b1671a10b/">
                <HeroSocial
                  src="/assets/images/linkedin-icon.png"
                  alt="Linkedin icon"
                />
              </a>
              {/* Fixed the missing youtube href syntax from original code */}
              <a className="hero-social inline-block" href="https://youtube.com">
                <HeroSocial
                  src="/assets/images/youtube-icon.png"
                  alt="Youtube icon"
                />
              </a>
              <a className="hero-social inline-block" href="https://github.com/FriendlyUser">
                <HeroSocial src="/assets/images/github.png" alt="Github icon" />
              </a>
              <a className="hero-social inline-block" href="https://TeeMugs3.redbubble.com">
                <HeroSocial src="/imgs/2024/redbubble.svg" alt="Redbubble icon" />
              </a>
            </>
          }
        />
      </Section>
    </div>
  );
};

export { Hero };