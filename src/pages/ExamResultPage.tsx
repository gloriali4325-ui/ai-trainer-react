
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../state';

export function ExamResultPage() {
  const { id } = useParams();
  const { examResults } = useApp();

  const result = examResults.find((item) => item.id === id);

  if (!result) {
    return <div className="container">成绩信息未找到。</div>;
  }

  const scorePercentage = (result.totalScore / result.maxScore) * 100;
  const passed = scorePercentage >= 60;
  const minutes = Math.floor(result.duration / 60);
  const seconds = result.duration % 60;

  return (
    <div className="container" style={{ display: 'grid', gap: 20 }}>
      <div className="page-hero" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, fontWeight: 700, color: passed ? '#16a085' : '#e74c3c' }}>
          {scorePercentage.toFixed(1)}%
        </div>
        <div className="muted">{passed ? '通过' : '未通过'}</div>
      </div>
      <div className="panel" style={{ display: 'grid', gap: 10 }}>
        <div>总题数：{result.totalQuestions}</div>
        <div>得分：{result.totalScore.toFixed(1)} / {result.maxScore.toFixed(1)}</div>
        <div>耗时：{minutes} 分 {seconds} 秒</div>
      </div>
      {!passed && (
        <div className="notice">需要达到 60% 或以上才能通过。继续加油！</div>
      )}
      <div style={{ display: 'grid', gap: 12 }}>
        <Link className="button" to={`/exam-result/${result.id}/review`} style={{ width: '100%' }}>
          题目解析
        </Link>
        <Link className="button secondary" to="/mock-exam" style={{ width: '100%' }}>
          再考一次
        </Link>
      </div>
    </div>
  );
}
