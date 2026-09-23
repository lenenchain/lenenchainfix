'use client';

import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const defaultHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>기본 웹사이트</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 50px; background-color: #f9f9f9; color: #333; }
        h1 { color: #0066cc; }
        .card { background: white; border-radius: 12px; padding: 24px; max-width: 500px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div class="card">
        <h1>🚀 웹사이트 오케스트레이터</h1>
        <p>아래 입력창에 원하시는 개선사항을 적고 [웹사이트 자동 개선 시작하기]를 눌러보세요.</p>
    </div>
</body>
</html>`;

  const [prompt, setPrompt] = useState('');
  const [currentCode, setCurrentCode] = useState(defaultHtml);
  
  // [기능 추가 1] 버전 히스토리 상태 관리
  const [history, setHistory] = useState([{ version: 1, name: '초기 상태', code: defaultHtml }]);
  const [currentVersionIdx, setCurrentVersionIdx] = useState(0);

  // [기능 추가 2] 탭 상태 (preview: 미리보기 / code: 소스코드 수정)
  const [activeTab, setActiveTab] = useState('preview');

  // [기능 추가 3] 반응형 Viewport 너비 (desktop: 100%, tablet: 768px, mobile: 375px)
  const [viewportMode, setViewportMode] = useState('desktop');

  const [statusText, setStatusText] = useState('대기 중...');
  const [activeStep, setActiveStep] = useState(0);
  const [grokReport, setGrokReport] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [siteUrl, setSiteUrl] = useState('');

  const iframeRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteUrl(window.location.href);
    }
  }, []);

  // iframe 업데이트
  useEffect(() => {
    if (iframeRef.current && activeTab === 'preview') {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(currentCode);
        doc.close();
      }
    }
  }, [currentCode, activeTab, viewportMode]);

  // HTML 파일 다운로드
  const handleDownloadHtml = () => {
    const blob = new Blob([currentCode], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'index.html');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // [기능 추가 4] 빠른 프롬프트 프리셋 적용
  const applyPreset = (text) => {
    setPrompt(text);
  };

  // [기능 추가 1] 히스토리 버전 되돌리기
  const restoreVersion = (index) => {
    setCurrentVersionIdx(index);
    setCurrentCode(history[index].code);
  };

  const handleStartOrchestrator = async () => {
    if (!prompt.trim()) {
      alert('개선 요청사항을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setActiveStep(1);
    setStatusText('1단계: Grok이 최신 UI/UX 트렌드를 분석 중입니다...');
    setGrokReport('');

    try {
      const res = await fetch('/api/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, currentCode }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.replace('data: ', ''));

            setActiveStep(data.step);
            setStatusText(data.status);

            if (data.grokReport) {
              setGrokReport(data.grokReport);
            }

            if (data.finalCode) {
              const newCode = data.finalCode;
              setCurrentCode(newCode);

              // 히스토리에 새 버전 추가
              const nextVer = history.length + 1;
              const shortPrompt = prompt.length > 15 ? prompt.substring(0, 15) + '...' : prompt;
              const newHistory = [...history, { version: nextVer, name: `v${nextVer} (${shortPrompt})`, code: newCode }];
              setHistory(newHistory);
              setCurrentVersionIdx(newHistory.length - 1);
            }
          }
        }
      }
    } catch (err) {
      setStatusText(`오류 발생: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 미리보기 크기 너비 계산
  const getIframeWidth = () => {
    if (viewportMode === 'mobile') return '375px';
    if (viewportMode === 'tablet') return '768px';
    return '100%';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'sans-serif', color: '#111' }}>
      <header style={{ marginBottom: '20px', borderBottom: '2px solid #eee', pb: '16px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>🤖 AI 웹사이트 오케스트레이터 (v2.0)</h1>
        <p style={{ margin: 0, color: '#666' }}>Grok과 Gemini가 협업하여 사이트 디자인과 코드를 실시간으로 리뉴얼 및 관리합니다.</p>
        
        {siteUrl && (
          <div style={{ marginTop: '12px', background: '#f0f4f9', padding: '8px 12px', borderRadius: '6px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <strong>🌐 현재 실행 주소:</strong>
            <a href={siteUrl} target="_blank" rel="noreferrer" style={{ color: '#0066cc', wordBreak: 'break-all' }}>
              {siteUrl}
            </a>
          </div>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '24px' }}>
        {/* 좌측: 제어 및 설정 패널 */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <h3 style={{ marginTop: 0, fontSize: '16px' }}>1. 개선 요청사항 입력</h3>
            
            {/* [기능 4] 빠른 템플릿 프리셋 */}
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>💡 빠른 추천 프롬프트:</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button onClick={() => applyPreset('다크모드 스타일로 고급스럽고 모던하게 변경해줘')} style={presetBtnStyle}>🌙 다크모드</button>
                <button onClick={() => applyPreset('https://lenenchain.github.io/lenenchainmem/ 디자인을 훨씬 깔끔하게 리뉴얼해줘')} style={presetBtnStyle}>🔗 URL 불러오기</button>
                <button onClick={() => applyPreset('네비게이션 바와 모바일 반응형 카드 레이아웃을 추가해줘')} style={presetBtnStyle}>📱 반응형 UI</button>
              </div>
            </div>

            <textarea
              rows={4}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px' }}
              placeholder="예: https://site.com/ 주소를 분석해서 다크모드 및 모바일 반응형 UI로 전면 리뉴얼해줘."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
            />
            <button
              onClick={handleStartOrchestrator}
              disabled={isLoading}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '12px',
                backgroundColor: isLoading ? '#999' : '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? 'AI 오케스트레이팅 진행 중...' : '🚀 웹사이트 자동 개선 시작하기'}
            </button>
          </div>

          {/* [기능 1] 히스토리 복원 패널 */}
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <h3 style={{ marginTop: 0, fontSize: '16px' }}>⏪ 버전 히스토리 (Undo / Redo)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
              {history.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => restoreVersion(idx)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    border: '1px solid #eee',
                    backgroundColor: currentVersionIdx === idx ? '#eef2ff' : '#f9f9f9',
                    borderColor: currentVersionIdx === idx ? '#6366f1' : '#eee',
                    fontWeight: currentVersionIdx === idx ? 'bold' : 'normal',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  {currentVersionIdx === idx ? '▶ ' : ''}{item.name}
                </button>
              ))}
            </div>
          </div>

          {/* 진행 상태 패널 */}
          <div style={{ background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
            <h3 style={{ marginTop: 0, fontSize: '16px' }}>2. 오케스트레이터 진행 상태</h3>
            <p style={{ fontWeight: 'bold', fontSize: '14px', color: activeStep === 4 ? 'red' : '#0066cc' }}>{statusText}</p>

            {grokReport && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#eef2ff', borderRadius: '6px', borderLeft: '4px solid #4f46e5' }}>
                <strong>📊 Grok 디자인/UX 분석 요약:</strong>
                <p style={{ margin: '8px 0 0 0', whiteSpace: 'pre-line', fontSize: '13px' }}>{grokReport}</p>
              </div>
            )}
          </div>
        </div>

        {/* 우측: 실시간 미리보기 및 코드 편집 패널 */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
            {/* 상단 툴바: 탭 / 반응형 크기 설정 / 다운로드 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #eee', pb: '12px', flexWrap: 'wrap', gap: '10px' }}>
              
              {/* [기능 2] 미리보기 vs 소스코드 탭 */}
              <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '6px' }}>
                <button
                  onClick={() => setActiveTab('preview')}
                  style={{ ...tabBtnStyle, backgroundColor: activeTab === 'preview' ? '#fff' : 'transparent', fontWeight: activeTab === 'preview' ? 'bold' : 'normal' }}
                >
                  👁️ 실시간 미리보기
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  style={{ ...tabBtnStyle, backgroundColor: activeTab === 'code' ? '#fff' : 'transparent', fontWeight: activeTab === 'code' ? 'bold' : 'normal' }}
                >
                  💻 HTML 소스코드 보기/수정
                </button>
              </div>

              {/* [기능 3] 반응형 Viewport 선택 */}
              {activeTab === 'preview' && (
                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '6px' }}>
                  <button onClick={() => setViewportMode('desktop')} style={{ ...viewBtnStyle, fontWeight: viewportMode === 'desktop' ? 'bold' : 'normal' }}>💻 데스크톱</button>
                  <button onClick={() => setViewportMode('tablet')} style={{ ...viewBtnStyle, fontWeight: viewportMode === 'tablet' ? 'bold' : 'normal' }}>📑 태블릿</button>
                  <button onClick={() => setViewportMode('mobile')} style={{ ...viewBtnStyle, fontWeight: viewportMode === 'mobile' ? 'bold' : 'normal' }}>📱 모바일</button>
                </div>
              )}

              {/* HTML 다운로드 버튼 */}
              <button
                onClick={handleDownloadHtml}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                💾 index.html 다운로드
              </button>
            </div>

            {/* 탭 콘텐츠 1: 미리보기 iframe */}
            {activeTab === 'preview' && (
              <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#e2e8f0', padding: '16px', borderRadius: '6px' }}>
                <iframe
                  ref={iframeRef}
                  title="preview"
                  style={{
                    width: getIframeWidth(),
                    height: '600px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    transition: 'width 0.3s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                />
              </div>
            )}

            {/* 탭 콘텐츠 2: 소스코드 편집기 */}
            {activeTab === 'code' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>※ 코드를 직접 수정하면 실시간 미리보기에 즉시 반영됩니다.</span>
                </div>
                <textarea
                  value={currentCode}
                  onChange={(e) => setCurrentCode(e.target.value)}
                  style={{
                    width: '100%',
                    height: '600px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    padding: '12px',
                    backgroundColor: '#1e293b',
                    color: '#f8fafc',
                    borderRadius: '6px',
                    border: 'none',
                    boxSizing: 'border-box',
                    lineHeight: '1.5'
                  }}
                />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

const presetBtnStyle = {
  padding: '4px 8px',
  fontSize: '12px',
  backgroundColor: '#f1f5f9',
  border: '1px solid #cbd5e1',
  borderRadius: '4px',
  cursor: 'pointer'
};

const tabBtnStyle = {
  padding: '6px 12px',
  fontSize: '13px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
};

const viewBtnStyle = {
  padding: '4px 8px',
  fontSize: '12px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  background: 'transparent'
};
