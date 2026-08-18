'use client';

import { ChangeEvent, DragEvent, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import mammoth from 'mammoth/mammoth.browser';
import remarkGfm from 'remark-gfm';

type Provider = 'openai' | 'gemini';
type Step = 'input' | 'process' | 'output';
type SummaryStyle = 'practical' | 'executive' | 'brief';
type SummaryLength = 'concise' | 'standard' | 'detailed';

const providerConfig = {
  openai: { label: 'OpenAI', model: 'gpt-5.6-luna', badge: 'LUNA' },
  gemini: { label: 'Gemini', model: 'gemini-3.5-flash-lite', badge: 'FLASH-LITE' },
} as const;

const styleOptions: Array<{ value: SummaryStyle; label: string; description: string }> = [
  { value: 'practical', label: '실무형', description: '결정사항과 액션 아이템 중심' },
  { value: 'executive', label: '임원 보고형', description: '핵심 이슈와 결론을 빠르게' },
  { value: 'brief', label: '간단 요약형', description: '짧고 빠르게 핵심만' },
];

const lengthOptions: Array<{ value: SummaryLength; label: string }> = [
  { value: 'concise', label: '간결하게' },
  { value: 'standard', label: '표준 분량' },
  { value: 'detailed', label: '상세하게' },
];

const steps: Array<{ id: Step; number: string; label: string }> = [
  { id: 'input', number: '01', label: 'Input' },
  { id: 'process', number: '02', label: 'Process' },
  { id: 'output', number: '03', label: 'Output' },
];

export default function Home() {
  const [step, setStep] = useState<Step>('input');
  const [provider, setProvider] = useState<Provider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [fileName, setFileName] = useState('');
  const [transcript, setTranscript] = useState('');
  const [style, setStyle] = useState<SummaryStyle>('practical');
  const [length, setLength] = useState<SummaryLength>('standard');
  const [result, setResult] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const activeModel = providerConfig[provider];
  const canContinue = Boolean(apiKey.trim() && transcript.trim());
  const stepIndex = steps.findIndex((item) => item.id === step);

  const readDocx = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) { setError('회의 전사문은 .docx 파일만 업로드할 수 있어요.'); return; }
    if (file.size > 20 * 1024 * 1024) { setError('파일은 20MB 이하로 업로드해 주세요.'); return; }
    try {
      const extracted = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      setFileName(file.name); setTranscript(extracted.value); setError('');
    } catch { setError('파일을 읽지 못했어요. .docx 파일인지 확인해 주세요.'); }
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) await readDocx(file); };
  const onDrop = async (event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); setIsDragging(false); const file = event.dataTransfer.files?.[0]; if (file) await readDocx(file); };

  const summarize = async () => {
    if (!canContinue) { setError('API 키와 회의 전사문을 먼저 준비해 주세요.'); setStep('input'); return; }
    setIsLoading(true); setError(''); setResult('');
    try {
      const response = await fetch('/api/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider, apiKey: apiKey.trim(), transcript, style, length }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '요약 요청에 실패했어요.');
      setResult(data.result); setStep('output');
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '요약 중 오류가 발생했어요.'); }
    finally { setIsLoading(false); }
  };

  const downloadMarkdown = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${fileName.replace(/\.docx$/i, '') || '회의록'}-정리본.md`; link.click(); URL.revokeObjectURL(url);
  };
  const startOver = () => { setStep('input'); setFileName(''); setTranscript(''); setResult(''); setError(''); };

  return (
    <main className="site-shell">
      <nav className="topbar"><a className="brand" href="#top" aria-label="Minutes 홈"><span className="brand-mark">✳</span><span>minutes</span></a><span className="topbar-note">회의 후 5분을 되찾는 방법</span><span className="status-pill"><span /> 브라우저에서 바로 사용</span></nav>
      {step === 'input' && <section className="hero" id="top"><div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" /> MEETING → MOMENTUM</p><h1>회의가 끝나면,<br /><em>할 일만 남게.</em></h1><p className="hero-text">전사문이 길어도 괜찮아요.<br />결정사항과 액션 아이템이 선명한 회의록으로 정리됩니다.</p></div><div className="hero-stamp" aria-hidden="true"><span>READ LESS</span><strong>DO<br />MORE</strong><span>MINUTES / 01</span></div></section>}
      <section className={`flow-shell ${step !== 'input' ? 'compact-flow' : ''}`} aria-label="회의록 요약 3단계">
        <div className="stepper" aria-label="진행 단계">{steps.map((item, index) => <button key={item.id} className={`step-item ${step === item.id ? 'active' : ''} ${index < stepIndex ? 'complete' : ''}`} onClick={() => index <= stepIndex && setStep(item.id)} disabled={index > stepIndex}><span>{item.number}</span><b>{item.label}</b></button>)}</div>
        {step === 'input' && <div className="stage-card"><div className="workspace-header"><div><p className="section-label">01 / INPUT</p><h2>자료와 엔진을 준비해 주세요</h2></div><p className="privacy-note">API 키와 문서는 저장하지 않습니다.<br />요청이 끝나면 브라우저 메모리에서 사라져요.</p></div>
          <label className={`dropzone ${isDragging ? 'is-dragging' : ''} ${fileName ? 'has-file' : ''}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={onDrop}><input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onFileChange} /><span className="file-icon">{fileName ? '✓' : '✳'}</span><span className="drop-copy"><strong>{fileName || '회의 전사문 .docx 파일을 끌어다 놓기'}</strong><small>{fileName ? '텍스트를 읽었습니다. 다른 파일로 교체하려면 클릭하세요.' : '또는 클릭해서 파일 선택 · 최대 20MB'}</small></span><span className="browse-button">파일 선택</span></label>
          <div className="paste-group"><label className="field-label" htmlFor="transcript">회의록 전문 직접 입력</label><textarea id="transcript" value={transcript} onChange={(event) => { setTranscript(event.target.value); setFileName(''); }} placeholder="파일이 없다면 회의 전사문을 여기에 붙여넣으세요." rows={5} /></div>
          <div className="settings-grid"><div className="field-group"><label className="field-label" htmlFor="provider">요약 엔진</label><div className="select-wrap"><select id="provider" value={provider} onChange={(event) => setProvider(event.target.value as Provider)}><option value="openai">OpenAI</option><option value="gemini">Gemini</option></select><span className="select-arrow">⌄</span></div></div><div className="field-group"><span className="field-label">기본 모델</span><div className="model-display"><span className="model-dot" /> {activeModel.model}<span className="model-badge">{activeModel.badge}</span></div></div><div className="field-group api-field"><label className="field-label" htmlFor="api-key">{activeModel.label} API 키</label><input id="api-key" type="password" placeholder={`${activeModel.label} API 키를 입력하세요`} value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" /></div></div>
          {error && <p className="error-message" role="alert">{error}</p>}<div className="action-row"><p><span className="key-dot" /> 현재 선택: <b>{activeModel.label}</b> · {activeModel.model}</p><button className="primary-button" onClick={() => canContinue ? setStep('process') : setError('API 키와 회의 전사문을 먼저 준비해 주세요.')} disabled={!canContinue}>다음: 요약 설정 <span>→</span></button></div>
        </div>}
        {step === 'process' && <div className="stage-card process-card"><div className="stage-heading"><p className="section-label">02 / PROCESS</p><h2>어떤 회의록으로 만들까요?</h2><p>회의 목적에 맞는 스타일과 분량을 선택한 뒤 생성을 시작하세요.</p></div><div className="source-summary"><span className="source-icon">✳</span><div><strong>{fileName || '직접 입력한 회의 전사문'}</strong><small>{transcript.length.toLocaleString()}자 · {activeModel.label} / {activeModel.model}</small></div><button className="text-button" onClick={() => setStep('input')}>자료 수정</button></div><div className="option-block"><span className="field-label">요약 스타일</span><div className="option-grid">{styleOptions.map((option) => <button key={option.value} className={`option-card ${style === option.value ? 'selected' : ''}`} onClick={() => setStyle(option.value)}><span className="option-check">{style === option.value ? '✓' : ''}</span><strong>{option.label}</strong><small>{option.description}</small></button>)}</div></div><div className="option-block"><span className="field-label">출력 분량</span><div className="length-options">{lengthOptions.map((option) => <button key={option.value} className={`length-button ${length === option.value ? 'selected' : ''}`} onClick={() => setLength(option.value)}>{option.label}</button>)}</div></div>{error && <p className="error-message" role="alert">{error}</p>}<div className="navigation-row"><button className="secondary-button" onClick={() => setStep('input')}>← 이전</button><button className="primary-button" onClick={summarize} disabled={isLoading}>{isLoading ? '회의록 만드는 중…' : <>회의록 생성하기 <span>→</span></>}</button></div></div>}
        {step === 'output' && <div className="stage-card output-card"><div className="result-header"><div><p className="section-label">03 / OUTPUT</p><h2>정리된 회의록</h2></div><div className="output-actions"><button className="copy-button" onClick={() => navigator.clipboard.writeText(result)}>마크다운 복사 <span>↗</span></button><button className="copy-button" onClick={downloadMarkdown}>다운로드 .md <span>↓</span></button></div></div><div className="result-card is-ready"><ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown></div><div className="navigation-row output-navigation"><button className="secondary-button" onClick={() => setStep('process')}>← 설정으로 돌아가기</button><button className="text-button" onClick={startOver}>처음부터 다시</button></div></div>}
      </section>
      <footer className="footer"><span>minutes / meeting intelligence</span><span>YOUR KEY. YOUR CONTROL.</span></footer>
    </main>
  );
}
