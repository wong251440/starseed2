import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  answeredCount, instructions, isCompleteAnswer, QUESTION_COUNT, questions, quizIntro,
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
  const heading = useRef<HTMLHeadingElement>(null);
  const question = questions[draft.index];
  const value = draft.responses[question.id];
  const answered = answeredCount(draft.responses);
  const currentComplete = isCompleteAnswer(question, value);
  const lastQuestion = draft.index === QUESTION_COUNT - 1;
  const name = `question-${draft.index + 1}`;

  useEffect(() => { heading.current?.focus(); }, [draft.index]);

  function save(answer: DraftAnswer) {
    setDraft({ ...draft, responses: { ...draft.responses, [question.id]: answer } });
  }

  function move(index: number) {
    setDraft({ ...draft, index });
    setMapOpen(false);
  }

  function next() {
    if (!currentComplete) return;
    if (!lastQuestion) return move(draft.index + 1);
    if (answered === QUESTION_COUNT) return complete(draft.responses as Responses);
    move(questions.findIndex(item => !isCompleteAnswer(item, draft.responses[item.id])));
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
      <span>第 {draft.index + 1} 題 / {QUESTION_COUNT}</span>
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
          className={`${done ? 'answered' : partial ? 'partial' : ''} ${index === draft.index ? 'current' : ''}`}
          aria-current={index === draft.index ? 'step' : undefined}
          aria-label={`第 ${index + 1} 題，${done ? '已回答' : partial ? '尚未答完' : '未回答'}`}>
          {index + 1}
        </button>;
      })}
    </nav>}
    <details className="quiz-reminder">
      <summary>作答提醒</summary>
      <p>{quizIntro}</p>
    </details>

    <div className="question-content" key={draft.index}>
      <h1 ref={heading} id="quiz-question-heading" tabIndex={-1}>{question.stem}</h1>
      <p id="quiz-format-instruction" className="question-hint">{instructions[question.format].instruction}</p>

      {question.format === 'BIP' && <>
        <div className="poles">
          <div><span>左側</span><p>{question.left}</p></div>
          <div><span>右側</span><p>{question.right}</p></div>
        </div>
        <fieldset className="strict-scale" aria-describedby="quiz-format-instruction">
          <legend className="sr-only">你的傾向</legend>
          <div className="strict-scale-options">
            {instructions.BIP.scale.map((label, index) => <label key={index} className={value === index + 1 ? 'selected' : ''}>
              <input type="radio" name={name} value={index + 1} checked={value === index + 1}
                onChange={() => save(index + 1)} aria-label={`${index + 1}，${label}`} />
              <span className="strict-scale-number" aria-hidden="true">{index + 1}</span>
              <span className="strict-scale-label">{label}</span>
            </label>)}
          </div>
        </fieldset>
      </>}

      {question.format === 'BWS' && <fieldset className="preference-options" aria-describedby="quiz-format-instruction">
        <legend className="sr-only">選出最像與最不像你會優先做的反應</legend>
        {(Object.entries(question.options) as [Choice, string][]).map(([choice, text]) => {
          const best = typeof value === 'object' && 'best' in value && value.best === choice;
          const worst = typeof value === 'object' && 'worst' in value && value.worst === choice;
          return <div key={choice} className={`preference-option ${best ? 'is-best' : worst ? 'is-worst' : ''}`}>
            <p><span className="option-letter" aria-hidden="true">{choice}</span>{text}</p>
            <div className="preference-picks">
              <label className={best ? 'selected' : ''}>
                <input type="radio" name={`${name}-most`} value={choice} checked={best}
                  onChange={() => selectPreference('best', choice)} aria-label={`最像我會優先做的：${text}`} />
                <span>最像我會優先做的</span>
              </label>
              <label className={worst ? 'selected' : ''}>
                <input type="radio" name={`${name}-least`} value={choice} checked={worst}
                  onChange={() => selectPreference('worst', choice)} aria-label={`最不像我會優先做的：${text}`} />
                <span>最不像我會優先做的</span>
              </label>
            </div>
          </div>;
        })}
      </fieldset>}

      {question.format === 'CROSS' && <div className="priority-parts">
        {([
          { part: 'operation', prompt: question.operation_prompt, options: question.operations },
          { part: 'goal', prompt: question.goal_prompt, options: question.goals },
        ] as const).map(({ part, prompt, options }, partIndex) => <fieldset className="priority-part" key={part}>
          <legend>{prompt}</legend>
          <div className="priority-options">
            {(Object.entries(options) as [string, string][]).map(([key, text]) => {
              const priority = Number(key) as Priority;
              const selected = typeof value === 'object' && part in value && (value as { operation?: Priority; goal?: Priority })[part] === priority;
              return <label key={key} className={selected ? 'selected' : ''}>
                <input type="radio" name={`${name}-part-${partIndex + 1}`} value={priority} checked={selected}
                  onChange={() => selectPriority(part, priority)} />
                <span>{text}</span>
              </label>;
            })}
          </div>
        </fieldset>)}
      </div>}
    </div>

    <div className="quiz-actions">
      <button type="button" className="text-button" disabled={draft.index === 0} onClick={() => move(draft.index - 1)}>
        <ChevronLeft size={17} aria-hidden="true" />上一題
      </button>
      <button type="button" className="button gold" onClick={next} disabled={!currentComplete}>
        {lastQuestion ? answered === QUESTION_COUNT ? '開啟我的星際報告' : '完成尚未回答的題目' : '下一題'}
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </div>
    <p className="quiz-answer-status" role="status">
      {currentComplete ? '這題已完成，你可以繼續旅程。' : question.format === 'BWS' ? '請各選一項最像與最不像你的反應。' : question.format === 'CROSS' ? '完成 A、B 兩部分後即可繼續。' : '選擇一個最貼近你的傾向。'}
    </p>
  </section>;
}
