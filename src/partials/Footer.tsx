import { Section } from '@/components/Section';
import { AppConfig } from '@/utils/AppConfig';

// Current date in YYYY-MM-DD format
const date = new Date().toISOString().split('T')[0];

const Footer = () => (
  <Section>
    {/* v4 uses modern CSS nesting and simpler utility handling */}
    <div className="no-print border-t border-gray-600 pt-5">
      <div className="text-sm text-gray-200">
        © Copyright {new Date().getFullYear()} by {AppConfig.site_name}. Built
        with ♥ by{' '}
        <a
          className="text-cyan-400 transition-colors hover:underline"
          href="https://github.com/FriendlyUser"
          target="_blank"
          rel="noopener noreferrer"
        >
          FriendlyUser
        </a>
        . Last updated on {date}.
      </div>
    </div>
  </Section>
);

export { Footer };