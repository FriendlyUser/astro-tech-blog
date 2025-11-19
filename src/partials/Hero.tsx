// import {
//   GradientText,

// } from 'astro-boilerplate-components';

import { HeroAvatar } from '@/components/HeroAvatar';
import { HeroSocial } from '@/components/HeroSocial';
import { Section } from '@/components/Section';

const Hero = () => (
  <Section>
    <HeroAvatar
      title={<>Hi there, I'm David 👋</>}
      description={
        <>
          I am a software developer who blogs and deploys tools for investing.
          You can find some of my free tools at{' '}
          <a
            className="text-cyan-400 hover:underline"
            href="https://github.com/dli-invest"
          >
            dli-invest
          </a>{' '}
          .
        </>
      }
      avatar={
        <img
          className="h-80 w-80"
          src="https://www.gravatar.com/avatar/d5a6e001f027e8cf3dbf048a926baa77?s=200"
          alt="Avatar image"
          loading="lazy"
        />
      }
      socialButtons={
        <>
          <a href="https://www.linkedin.com/in/david-li-b1671a10b/">
            <HeroSocial
              src="/assets/images/linkedin-icon.png"
              alt="Linkedin icon"
            />
          </a>
          <a href="https://www.youtube.com/channel/UCgh3EboIsJMS-b8dZsTjPkg">
            <HeroSocial
              src="/assets/images/youtube-icon.png"
              alt="Youtube icon"
            />
          </a>
          <a href="https://github.com/FriendlyUser">
            <HeroSocial src="/assets/images/github.png" alt="Github icon" />
          </a>
          <a href="https://TeeMugs3.redbubble.com">
            <HeroSocial src="/imgs/2024/redbubble.svg" alt="Redbubble icon" />
          </a>
        </>
      }
    />
  </Section>
);

export { Hero };
