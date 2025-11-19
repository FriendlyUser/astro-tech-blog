import { GradientText } from '@/components/GradientText';
import { Project } from '@/components/Project';
import { Section } from '@/components/Section';
import { ColorTags, Tags } from '@/components/Tags';

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
        link="https://grandfleet.eu.org"
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
      <Project
        name="Ai Books"
        description="Generate AI Books for free on the internet, learned a lot about decefits with LLMs. The chatbot on this site was trained using this data."
        link="https://books.grandfleet.eu.org/books"
        img={{ src: '/imgs/2024/ai_logo.jpg', alt: 'Books' }}
        category={
          <>
            <Tags color={ColorTags.FUCHSIA}>AI</Tags>
            <Tags color={ColorTags.INDIGO}>books</Tags>
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
