
import { Link } from 'react-router-dom';
import { useApp } from '../state';
import { getQuestionsByCategory } from '../lib/questionBank';

export function CategorizedTrainingPage() {
  const { categories, theoryQuestions, codeQuestions } = useApp();
  const allQuestions = [...theoryQuestions, ...codeQuestions];

  if (categories.length === 0) {
    return <div className="container">暂无分类</div>;
  }

  const theoretical = categories.filter((category) =>
    getQuestionsByCategory(theoryQuestions, category.id).length > 0,
  );
  const operational = categories.filter((category) =>
    getQuestionsByCategory(codeQuestions, category.id).length > 0,
  );

  return (
    <div className="container" style={{ display: 'grid', gap: 24 }}>
      <div className="page-hero">
        <h2 className="section-title" style={{ margin: 0 }}>分类练习</h2>
        <p className="muted" style={{ marginTop: 6 }}>按模块选择主题，循序渐进</p>
      </div>

      {theoretical.length > 0 && (
        <section>
          <div className="panel" style={{ marginBottom: 16 }}>
            <strong>理论知识</strong>
            <div className="muted">通过习题巩固知识，掌握理论基础</div>
          </div>
          <div className="list">
            {theoretical.map((category) => {
              const count = getQuestionsByCategory(allQuestions, category.id).length;
              return (
                <Link key={category.id} to={`/category/${category.id}`} className="list-tile">
                  <div className="tile-icon" style={{ background: '#2563eb' }}>📚</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{category.name}</div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {category.description}
                    </div>
                    <div className="tag" style={{ marginTop: 6 }}>
                      {count} 题
                    </div>
                  </div>
                  <div className="tile-chevron">›</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {operational.length > 0 && (
        <section>
          <div className="panel" style={{ marginBottom: 16 }}>
            <strong>操作技能</strong>
            <div className="muted">通过实践任务锻炼动手能力</div>
          </div>
          <div className="list">
            {operational.map((category) => {
              const count = getQuestionsByCategory(allQuestions, category.id).length;
              return (
                <Link key={category.id} to={`/operational-skills/${category.id}`} className="list-tile">
                  <div className="tile-icon" style={{ background: '#7c3aed' }}>💻</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{category.name}</div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {category.description}
                    </div>
                    <div className="tag" style={{ marginTop: 6 }}>
                      {count} 题
                    </div>
                  </div>
                  <div className="tile-chevron">›</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
