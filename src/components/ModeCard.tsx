
import React from 'react';
import { Link } from 'react-router-dom';

type ModeCardProps = {
  title: string;
  subtitle: string;
  accent: string;
  to: string;
  icon: string;
};

export function ModeCard({ title, subtitle, accent, to, icon }: ModeCardProps) {
  return (
    <Link to={to} className="list-tile">
      <div className="tile-icon" style={{ background: accent }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div className="muted" style={{ marginTop: 4 }}>
          {subtitle}
        </div>
      </div>
      <div className="tile-chevron">›</div>
    </Link>
  );
}
