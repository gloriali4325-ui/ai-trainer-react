
import type { CodeQuestion, Question, TheoryQuestion } from '../lib/types';
import { checkAnswer, isCode, isTheory } from '../lib/utils';

const isMultiple = (question: TheoryQuestion) => question.type === 'multipleChoice';

type QuestionCardProps = {
  question: Question;
  questionNumber: number;
  selectedAnswer: unknown;
  onAnswerSelected: (answer: unknown) => void;
  showExplanation?: boolean;
  readOnly?: boolean;
};

export function QuestionCard({
  question,
  questionNumber,
  selectedAnswer,
  onAnswerSelected,
  showExplanation = false,
  readOnly = false,
}: QuestionCardProps) {
  return (
    <div className="card question-card">
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span className="tag">第 {questionNumber} 题</span>
        <span className="tag">{question.section === 'theoretical' ? '理论' : '操作'}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{question.text}</div>
      {isTheory(question) && (
        <TheoryOptions
          question={question}
          selectedAnswer={selectedAnswer}
          onAnswerSelected={onAnswerSelected}
          readOnly={readOnly}
        />
      )}
      {isCode(question) && (
        <CodeAnswer question={question} selectedAnswer={selectedAnswer} onAnswerSelected={onAnswerSelected} readOnly={readOnly} />
      )}
      {showExplanation && (
        <div className={checkAnswer(question, selectedAnswer) ? 'notice notice-success' : 'notice notice-error'}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            {checkAnswer(question, selectedAnswer) ? '回答正确' : '回答不正确'}
          </div>
          <div>{question.explanation || '暂无解析。'}</div>
          {isCode(question) && question.correctCode && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>参考答案</div>
              <pre className="code-box">{question.correctCode}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TheoryOptions({
  question,
  selectedAnswer,
  onAnswerSelected,
  readOnly,
}: {
  question: TheoryQuestion;
  selectedAnswer: unknown;
  onAnswerSelected: (answer: unknown) => void;
  readOnly: boolean;
}) {
  const selectedList = Array.isArray(selectedAnswer) ? selectedAnswer : [];

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {question.options.map((option) => {
        const isSelected = isMultiple(question)
          ? selectedList.includes(option)
          : selectedAnswer === option;
        return (
          <div
            key={option}
            className={`option ${isSelected ? 'selected' : ''}`}
            onClick={() => {
              if (readOnly) return;
              if (isMultiple(question)) {
                const next = new Set(selectedList);
                if (next.has(option)) {
                  next.delete(option);
                } else {
                  next.add(option);
                }
                onAnswerSelected(Array.from(next));
              } else {
                onAnswerSelected(option);
              }
            }}
          >
            <input
              type={isMultiple(question) ? 'checkbox' : 'radio'}
              checked={isSelected}
              readOnly
            />
            <span>{option}</span>
          </div>
        );
      })}
    </div>
  );
}

function CodeAnswer({
  question,
  selectedAnswer,
  onAnswerSelected,
  readOnly,
}: {
  question: CodeQuestion;
  selectedAnswer: unknown;
  onAnswerSelected: (answer: unknown) => void;
  readOnly: boolean;
}) {
  return (
    <div>
      {question.codeTemplate && (
        <pre className="code-box">{question.codeTemplate}</pre>
      )}
      <textarea
        className="code-box"
        style={{ marginTop: 12 }}
        value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
        onChange={(event) => onAnswerSelected(event.target.value)}
        placeholder="请输入你的代码答案..."
        readOnly={readOnly}
      />
    </div>
  );
}
