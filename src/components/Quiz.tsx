import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  answeredCount, instructions, isCompleteAnswer, QUESTION_COUNT, questions,
  type Choice, type DraftAnswer, type Priority, type Responses,
} from '../shared/questionnaire';
import type { Draft } from '../shared/session';

type Props = {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  complete: (responses: Responses) => void;
};

export default function Quiz({ draft, setDraft, complete }: Props) {
  const [mapOpen, setMapOpen] = useState(false);
  const [crossStep, setCrossStep] = useState<0 | 1>(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const currentIndex = Number.isInteger(draft.index) && draft.index >= 0 && draft.index < questions.length ? draft.index : 0;
  const question = questions[currentIndex];
  const value = draft.responses[question.id];
  const answered = answeredCount(draft.responses);
  const currentComplete = isCompleteAnswer(question, value);
  const lastQuestion = currentIndex === QUESTION_COUNT - 1;
  const name = `question-${currentIndex + 1}`;

  useEffect(() => { heading.current?.focus(); }, [currentIndex]);
  useEffect(() => { setCrossStep(0); }, [currentIndex]);

  function save(answer: DraftAnswer) {
    setDraft({ ...draft, responses: { ...draft.responses, [question.id]: answer } });
  }

  function move(index: number) {
    const target = Number.isInteger(index) && index >= 0 && index < questions.length ? index : 0;
    setDraft({ ...draft, index: target });
    setMapOpen(false);
  }

  function next() {
    if (!currentComplete) return;
    if (!lastQuestion) return move(currentIndex + 1);
    if (answered === QUESTION_COUNT) return complete(draft.responses as Responses);
    const nextUnanswered = questions.findIndex(item => !isCompleteAnswer(item, draft.responses[item.id]));
    if (nextUnanswered >= 0) move(nextUnanswered);
  }

  function selectPreference(kind: 'best' | 'worst', choice: Choice) {
    const previous = typeof value === 'object' && ('best' in value || 'worst' in value) ? value : {};
    const answer: { best?: Choice; worst?: Choice } = { ...previous, [kind]: choice };
    const opposite = kind === 'best' ? 'worst' : 'best';
    if (answer[opposite] === choice) delete answer[opposite];
    save(answer);
  }

  function selectPriority(part: 'operation' | 'goal', priority: Priority) {
    const previous = typeof value === 'object' && ('operation' in value || 'goal' in value) ? value : {};
    save({ ...previous, [part]: priority });
  }

  return <section className="quiz-shell strict-quiz">
    <div className="quiz-top">
      <Link to="/" className="text-button"><ChevronLeft size={17} aria-hidden="true" />暫存並離開</Link>
      <span>旅程會保存在此裝置</span>
    </div>
    <div className="quiz-progress">
      <span>第 {currentIndex + 1} 題 / {QUESTION_COUNT}</span>
      <button type="button" onClick={() => setMapOpen(!mapOpen)} aria-expanded={mapOpen} aria-controls="quiz-question-map">
        已回答 {answered} / {QUESTION_COUNT}<Menu size={16} aria-hidden="true" />
      </button>
    </div>
    <progress max={QUESTION_COUNT} value={answered} aria-label={`已回答 ${answered} 題，共 ${QUESTION_COUNT} 題`} />
    {mapOpen && <nav id="quiz-question-map" className="question-map" aria-label="題目導覽">
      {questions.map((item, index) => {
        const answer = draft.responses[item.id];
        const done = isCompleteAnswer(item, answer);
        const partial = answer !== undefined && !done;
        return <button key={index} type="button" onClick={() => move(index)}
          className={`${done ? 'answered' : partial ? 'partial' : ''} ${index === currentIndex ? 'current' : ''}`}
          aria-current={index === currentIndex ? 'step' : undefined}
          aria-label={`第 ${index + 1} 題，${done ? '已回答' : partial ? '尚未答完' : '未回答'}`}>
          {index + 1}
        </button>;
      })}
    </nav>}
    <div className="question-content" key={currentIndex}>
      <h1 ref={heading} id="quiz-question-heading" tabIndex={-1}>{question.stem}</h1>

      {question.format === 'BIP' && <>
        <div className="poles">
          <div><span>左側</span><p>{question.left}</p></div>
          <div><span>右側</span><p>{question.right}</p></div>
        </div>
        <fieldset className="strict-scale">
          <legend className="sr-only">你的傾向</legend>
          <div className="strict-scale-options">
            {instructions.BIP.scale.map((label, index) => <label key={index} className={`${value === index + 1 ? 'selected ' : ''}strength-${Math.abs(index - 3)}`}>
              <input type="radio" name={name} value={index + 1} checked={value === index + 1}
                onChange={() => save(index + 1)} aria-label={`${index + 1}，${label}`} />
              <span className="strict-scale-number" aria-hidden="true">{index + 1}</span>
              <span className="strict-scale-label">{label}</span>
            </label>)}
          </div>
          <div className="strict-scale-captions" aria-hidden="true">
            <span>明顯偏左</span><span>左右差不多</span><span>明顯偏右</span>
          </div>
        </fieldset>
      </>}

      {question.format === 'BWS' && <fieldset className="preference-options">
        <legend className="sr-only">選出最像與最不像你會優先做的反應</legend>
        <div className="preference-header" aria-hidden="true"><span>選項</span><span>最像</span><span>最不像</span></div>
        {(Object.entries(question.options) as [Choice, string][]).map(([choice, text]) => {
          const best = typeof value === 'object' && 'best' in value && value.best === choice;
          const worst = typeof value === 'object' && 'worst' in value && value.worst === choice;
          return <div key={choice} className={`preference-option ${best ? 'is-best' : worst ? 'is-worst' : ''}`}>
            <p><span className="option-letter" aria-hidden="true">{choice}</span><span>{text}</span></p>
            <div className="preference-picks">
              <label className={best ? 'selected' : ''}>
                <input type="radio" name={`${name}-most`} value={choice} checked={best}
                  onChange={() => selectPreference('best', choice)} aria-label={`最像我會優先做的：${text}`} />
                <span>最像</span>
              </label>
              <label className={worst ? 'selected' : ''}>
                <input type="radio" name={`${name}-least`} value={choice} checked={worst}
                  onChange={() => selectPreference('worst', choice)} aria-label={`最不像我會優先做的：${text}`} />
                <span>最不像</span>
              </label>
            </div>
          </div>;
        })}
      </fieldset>}

      {question.format === 'CROSS' && (() => {
        const part = crossStep === 0 ? 'operation' : 'goal';
        const prompt = crossStep === 0 ? question.operation_prompt : question.goal_prompt;
        const options = crossStep === 0 ? question.operations : question.goals;
        const selectedValue = typeof value === 'object' && value !== null && part in value ? (value as { operation?: Priority; goal?: Priority })[part] : undefined;
        return <div className="priority-parts cross-steps">
          <fieldset className="priority-part">
            <legend>{prompt}</legend>
            <div className="priority-options">
              {(Object.entries(options) as [string, string][]).map(([key, text]) => {
                const priority = Number(key) as Priority;
                const selected = selectedValue === priority;
                return <label key={key} className={selected ? 'selected' : ''}>
                  <input type="radio" name={`${name}-cross-${part}`} value={priority} checked={selected}
                    onChange={() => selectPriority(part, priority)} />
                  <span>{text}</span>
                </label>;
              })}
            </div>
          </fieldset>
          <div className="cross-step-actions">
            {crossStep === 1 && <button type="button" className="text-button" onClick={() => setCrossStep(0)}>返回介入方式</button>}
            {crossStep === 0 && <button type="button" className="button cross-next" disabled={selectedValue === undefined} onClick={() => setCrossStep(1)}>下一步：選擇到位結果 <ArrowRight size={17} aria-hidden="true" /></button>}
          </div>
        </div>;
      })()}
    </div>

    <div className="quiz-actions">
      <button type="button" className="text-button" disabled={currentIndex === 0} onClick={() => move(currentIndex - 1)}>
        <ChevronLeft size={17} aria-hidden="true" />上一題
      </button>
      <button type="button" className="button gold" onClick={next} disabled={!currentComplete}>
        {lastQuestion ? answered === QUESTION_COUNT ? '開啟我的星際報告' : '完成尚未回答的題目' : '下一題'}
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </div>
  </section>;
}
