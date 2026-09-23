'use client';

import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [currentCode, setCurrentCode] = useState(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>기본 웹사이트</title>
    <style>
        body { font-family: sans-serif; text-align: center; padding: 50px; background-color: #f9f9f9; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>🚀 웹사이트 오케스트레이터에 오신 것을 환영합니다!</h1>
    <p>아래 입력창에 원하시는 개선사항을 적고 [웹사이트 자동 개선 시작하기]를 눌러보세요.</p>
</body>
</html>`);

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

  // iframe에 현재 HTML 업데이트
  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(currentCode);
        doc.close();
      }
    }
  }, [currentCode]);

  // [기능 추가] HTML 파일 다운로드 함수
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
              setCurrentCode(data.finalCode);
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

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif', color: '#111' }}>
      <header style={{ marginBottom: '24px', borderBottom: '2px solid #eee', pb: '16px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>🤖 AI 웹사이트 오케스트레이터</h1>
        <p style={{ margin: 0, color: '#666' }}>Grok과 Gemini가 협업하여 사이트 디자인과 코드를 실시간으로 완성합니다.</p>
        
        {/* [기능 추가] 현재 웹사이트 주소 표시 */}
        {siteUrl && (
          <div style={{ marginTop: '12px', background: '#f0f4f9', padding: '8px 12px', borderRadius: '6px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <strong>🌐 현재 실행 주소:</strong>
            <a href={siteUrl} target="_blank" rel="noreferrer" style={{ color: '#0066cc', wordBreak: 'break-all' }}>
              {siteUrl}
            </a>
          </div>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* 좌측: 제어 및 로그 패널 */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <h3 style={{ marginTop: 0 }}>1. 개선 요청사항 입력</h3>
            <textarea
              rows={4}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              placeholder="예: 다크모드 스타일로 바꿔주고, 상단에 네비게이션 바와 화려한 메인 슬로건 문구를 추가해줘."
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

          <div style={{ background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
            <h3 style={{ marginTop: 0 }}>2. 오케스트레이터 진행 상태</h3>
            <p style={{ fontWeight: 'bold', color: activeStep === 4 ? 'red' : '#0066cc' }}>{statusText}</p>

            {grokReport && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#eef2ff', borderRadius: '6px', borderLeft: '4px solid #4f46e5' }}>
                <strong>📊 Grok 디자인/UX 분석 요약:</strong>
                <p style={{ margin: '8px 0 0 0', whiteSpace: 'pre-line', fontSize: '14px' }}>{grokReport}</p>
              </div>
            )}
          </div>
        </div>

        {/* 우측: 실시간 미리보기 및 다운로드 패널 */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>실시간 웹사이트 미리보기</h3>
              
              {/* [기능 추가] HTML 다운로드 버튼 */}
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
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                💾 index.html 다운로드
              </button>
            </div>

            <iframe
              ref={iframeRef}
              title="preview"
              style={{
                width: '100%',
                height: '500px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                backgroundColor: '#fff'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
