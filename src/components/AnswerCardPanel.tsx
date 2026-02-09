import React from 'react';

export type AnswerStatus = 'unseen' | 'unanswered' | 'answered' | 'flagged' | 'correct' | 'incorrect';

type AnswerCardItem = {
  id: string;
  index: number;
  status: AnswerStatus;
};

type AnswerCardPanelProps = {
  title?: string;
  items: AnswerCardItem[];
  currentIndex: number;
  onJump: (index: number) => void;
  showLegend?: boolean;
  legendMode?: 'full' | 'exam';
  sections?: Array<{ label: string; startIndex: number; endIndex: number }>;
};

export function AnswerCardPanel({
  title = '答题记录',
  items,
  currentIndex,
  onJump,
  showLegend = true,
  legendMode = 'full',
  sections,
}: AnswerCardPanelProps) {
  return (
    <div className="card side-panel">
      <div style={{ fontWeight: 600, marginBottom: 12 }}>{title}</div>
      {showLegend && legendMode === 'full' && (
        <div className="answer-legend">
          <span className="legend-item"><span className="legend-dot correct" />正确</span>
          <span className="legend-item"><span className="legend-dot incorrect" />错误</span>
          <span className="legend-item"><span className="legend-dot answered" />已答</span>
          <span className="legend-item"><span className="legend-dot unanswered" />未作答</span>
          <span className="legend-item"><span className="legend-dot unseen" />未见</span>
        </div>
      )}
      {showLegend && legendMode === 'exam' && (
        <div className="answer-legend">
          <span className="legend-item"><span className="legend-dot answered" />已答</span>
          <span className="legend-item"><span className="legend-dot unanswered" />未作答</span>
          <span className="legend-item"><span className="legend-dot flagged" />标记</span>
          <span className="legend-item"><span className="legend-dot unseen" />未见</span>
        </div>
      )}
      {sections && sections.length > 0 ? (
        <div style={{ display: 'grid', gap: 14 }}>
          {sections.map((section) => {
            const sectionItems = items.filter(
              (item) => item.index >= section.startIndex && item.index <= section.endIndex,
            );
            return (
              <div key={section.label}>
                <div className="muted" style={{ marginBottom: 8, fontWeight: 600 }}>
                  {section.label}
                </div>
                <div className="answer-grid">
                  {sectionItems.map((item) => {
                    const isCurrent = item.index === currentIndex;
                    return (
                      <button
                        key={item.id}
                        className={`answer-chip ${item.status} ${isCurrent ? 'current' : ''}`}
                        onClick={() => onJump(item.index)}
                      >
                        {item.index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="answer-grid">
          {items.map((item) => {
            const isCurrent = item.index === currentIndex;
            return (
              <button
                key={item.id}
                className={`answer-chip ${item.status} ${isCurrent ? 'current' : ''}`}
                onClick={() => onJump(item.index)}
              >
                {item.index + 1}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
