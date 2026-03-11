import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { GradientText } from '@/components/GradientText';
import { Project } from '@/components/Project';
import { Section } from '@/components/Section';
import { ColorTags, Tags } from '@/components/Tags';

const ProjectList = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Register ScrollTrigger inside useEffect so it only runs on the client
    gsap.registerPlugin(ScrollTrigger);

    // gsap.context() is best practice for React/Astro to handle cleanup automatically
    const ctx = gsap.context(() => {
      // Animate the section title
      gsap.from('.animate-title', {
        opacity: 0,
        x: -30,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 85%',
        },
      });

      // Stagger animate the project cards
      gsap.from('.project-card', {
        opacity: 0,
        y: 50,
        duration: 0.8,
        stagger: 0.2, // 0.2 seconds between each card appearing
        ease: 'power3.out',
        scrollTrigger: {
          trigger: containerRef.current, // Use the container as the trigger
          start: 'top 85%',
        },
      });
    }, containerRef);

    // Cleanup animations when component unmounts
    return () => ctx.revert();
  }, []); // <-- Empty array is crucial here!

  return (
    <div ref={containerRef}>
      <Section
        title={
          <span className="animate-title inline-block">
            Recent <GradientText>Projects</GradientText>
          </span>
        }
      >
        <div className="flex flex-col gap-6">
          {/* Wrapped in a div with the class GSAP is looking for */}
          <div className="project-card">
            <Project
              name="Latex Diagrams"
              description="Latex Diagrams that I have generated for university or have taken from internet."
              link="https://grandfleet.eu.org"
              img={{
                src: '/assets/images/project-fire.png',
                alt: 'Project Fire ',
              }}
              category={
                <>
                  <Tags color={ColorTags.FUCHSIA}>Latex</Tags>
                  <Tags color={ColorTags.LIME}>Diagram</Tags>
                  <Tags color={ColorTags.SKY}>Nextra</Tags>
                </>
              }
            />
          </div>

          <div className="project-card">
            <Project
              name=" vuepress-theme-cool-starter"
              description="Starter theme for vuepress which was originally suppose to be named `vuepress-theme-school`."
              link="https://vuepress-theme-cool.js.org/"
              img={{
                src: '/assets/images/project-web-design.png',
                alt: 'Project Web Design',
              }}
              category={
                <>
                  <Tags color={ColorTags.VIOLET}>Vuepress</Tags>
                  <Tags color={ColorTags.EMERALD}>Vue</Tags>
                  <Tags color={ColorTags.YELLOW}>JavaScript</Tags>
                </>
              }
            />
          </div>

          <div className="project-card">
            <Project
              name="Flipp Flyer Scrapper"
              description="Scrap Grocery flyers by analyze the shadow roots in dom."
              link="https://github.com/FriendlyUser/flipp_flyer_parser"
              img={{ src: '/imgs/2024/ai_logo.jpg', alt: 'pydoll' }}
              category={
                <>
                  <Tags color={ColorTags.FUCHSIA}>pydoll</Tags>
                  <Tags color={ColorTags.INDIGO}>web scraping</Tags>
                </>
              }
            />
          </div>

          <div className="project-card">
            <Project
              name="Financial News NLP"
              description="Process financial news articles scrapped from the internet using python."
              link="https://github.com/dli-invest/fin_news_nlp"
              img={{ src: '/assets/images/project-maps.png', alt: 'Project Maps' }}
              category={
                <>
                  <Tags color={ColorTags.FUCHSIA}>Spacy</Tags>
                  <Tags color={ColorTags.INDIGO}>Python</Tags>
                  <Tags color={ColorTags.ROSE}>Faunadb</Tags>
                </>
              }
            />
          </div>
        </div>
      </Section>
    </div>
  );
};

export { ProjectList };