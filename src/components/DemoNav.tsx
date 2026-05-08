import { Link } from 'react-router-dom';

const Chevron = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M10 3L5 8l5 5" />
  </svg>
);

type Props = { title: string; badge: string };

export function DemoNav({ title, badge }: Props) {
  return (
    <nav>
      <Link className="nav-back" to="/">
        <Chevron />
        Back to Dashboard
      </Link>
      <div className="nav-title">{title}</div>
      <div className="nav-badge">{badge}</div>
    </nav>
  );
}
