

type StatCardProps = {
  title: string;
  value: string;
  accent: string;
  caption?: string;
};

export function StatCard({ title, value, accent, caption }: StatCardProps) {
  return (
    <div className="card" style={{ borderLeft: `6px solid ${accent}`, background: 'linear-gradient(180deg, #ffffff 0%, #f4f6fb 100%)' }}>
      <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
        {title}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{value}</div>
      {caption && (
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
          {caption}
        </div>
      )}
    </div>
  );
}
