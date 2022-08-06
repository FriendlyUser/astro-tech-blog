import { Section } from 'astro-boilerplate-components';

import { AppConfig } from '@/utils/AppConfig';

const Footer = () => (
  <Section>
    <div className="border-t border-gray-600 pt-5">
      <div className="text-sm text-gray-200">
        © Copyright {new Date().getFullYear()} by {AppConfig.site_name}. Built
        with ♥ by{' '}
        <a
          className="text-cyan-400 hover:underline"
          href="https://github.com/FriendlyUser"
          target="_blank"
          rel="noopener noreferrer"
        >
          FriendlyUser
        </a>
        .
      </div>
    </div>
  </Section>
);

export { Footer };
