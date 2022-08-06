import {
  GradientText,
  HeroAvatar,
  HeroSocial,
  Section,
} from 'astro-boilerplate-components';

const Hero = () => (
  <Section>
    <HeroAvatar
      title={
        <>
          Hi there, I'm <GradientText>David</GradientText> 👋
        </>
      }
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
        </>
      }
    />
  </Section>
);

export { Hero };
