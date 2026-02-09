
import { ModeCard } from '../components/ModeCard';
import { StatCard } from '../components/StatCard';
import { useApp } from '../state';

export function HomePage() {
  const { stats, mistakes, profile, loading } = useApp();

  if (loading.questions) {
    return <div className="container">题库加载中...</div>;
  }

  const accuracy = stats.totalQuestionsAttempted
    ? ((stats.totalQuestionsCorrect / stats.totalQuestionsAttempted) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="container" style={{ display: 'grid', gap: 20 }}>
      <div className="page-hero">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>人工智能训练师考试备考</h1>
            <div className="muted" style={{ marginTop: 6 }}>
              欢迎回来，{profile?.name ?? '学员'} · 三级职业技能等级证书
            </div>
          </div>
          <span className="badge">今日可继续练习</span>
        </div>
      </div>

      <div className="grid grid-2">
        <StatCard title="已答题目" value={`${stats.totalQuestionsAttempted}`} accent="#3b5bff" />
        <StatCard title="正确率" value={`${accuracy}%`} accent="#1fbf8f" />
        <StatCard title="模拟测试" value={`${stats.mockExamsTaken}`} accent="#f4a261" />
        <StatCard title="错题本" value={`${mistakes.filter((m) => !m.reviewed).length}`} accent="#e24a4a" />
      </div>

      <div className="panel">
        <h2 className="section-title">选择练习模式</h2>
        <div className="list" style={{ marginTop: 12 }}>
          <ModeCard title="理论知识 · 随机练习" subtitle="单选 / 多选 / 判断" accent="#3b5bff" to="/drilling" icon="📚" />
          <ModeCard title="操作技能 · 随机练习" subtitle="代码与实操任务" accent="#7c5cff" to="/drilling-operational" icon="💻" />
          <ModeCard title="分类练习" subtitle="按主题深度学习" accent="#1fbf8f" to="/categorized" icon="🧭" />
          <ModeCard title="模拟考试" subtitle="限时全真练习" accent="#f4a261" to="/mock-exam" icon="📝" />
          <ModeCard title="错题本" subtitle="复盘错题并强化" accent="#e24a4a" to="/mistakes" icon="📌" />
        </div>
      </div>
    </div>
  );
}
