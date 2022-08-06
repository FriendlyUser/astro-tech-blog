import {
  ColorTags,
  GradientText,
  Project,
  Section,
  Tags,
} from 'astro-boilerplate-components';

const ProjectList = () => (
  <Section
    title={
      <>
        Recent <GradientText>Projects</GradientText>
      </>
    }
  >
    <div className="flex flex-col gap-6">
      <Project
        name="Latex Diagrams"
        description="Latex Diagrams that I have generated for university or have taken from internet."
        link="https://github.com/FriendlyUser/LatexDiagrams"
        img={{
          src: '/assets/images/project-fire.png',
          alt: 'Project Fire ',
        }}
        category={
          <>
            <Tags color={ColorTags.FUCHSIA}>Latex</Tags>
            <Tags color={ColorTags.LIME}>Diagram</Tags>
            <Tags color={ColorTags.SKY}>Saber</Tags>
          </>
        }
      />
      <Project
        name=" vuepress-theme-cool-starter"
        description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
        bibendum. Nunc non posuere consectetur, justo erat semper enim, non
        hendrerit dui odio id enim."
        link="https://github.com/FriendlyUser/vuepress-theme-cool-starter"
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
  </Section>
);

export { ProjectList };
