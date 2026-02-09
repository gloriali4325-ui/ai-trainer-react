import { useNavigate } from 'react-router-dom';

export function MockExamIntroPage() {
  const navigate = useNavigate();

  return (
    <div className="container" style={{ display: 'grid', gap: 16 }}>
      <div className="page-hero">
        <h2 style={{ margin: 0 }}>模拟考试说明</h2>
        <p className="muted" style={{ marginTop: 6 }}>请在规定时间内完成所有题目，提交后查看成绩。</p>
      </div>

      <div className="panel" style={{ display: 'grid', gap: 10 }}>
        <div>总题数：190 题</div>
        <div>考试时长：90 分钟</div>
        <div>及格线：60 分</div>
      </div>

      <div className="panel" style={{ display: 'grid', gap: 10 }}>
        <strong>题型分布与分值</strong>
        <div>判断题：40 题 · 20 分</div>
        <div>单选题：140 题 · 70 分</div>
        <div>多选题：10 题 · 10 分</div>
      </div>

      <button
        className="button"
        onClick={() => navigate('/mock-exam/start')}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        开始考试
      </button>
    </div>
  );
}
