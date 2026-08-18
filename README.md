# Codex-Practice

IITP AI 기반 업무 자동화 교육 평가·관리 심화 1 수업 중 서비스 배포를
위한 repository입니다.

## 실습 결과

1. [기관소개 랜딩페이지](https://iitp-introduction.lumiolab-4734.chatgpt.site/)
2. [회의록 자동 생성기](https://meeting-minutes-public.vercel.app/)

## 회의록 자동 생성기

회의 녹취록 파일을 업로드하고 회의 내용을 요약·정리하는 Next.js 앱입니다.

### 실행 방법

```bash
pnpm install
pnpm dev
```

프로덕션 빌드는 다음 명령으로 확인할 수 있습니다.

```bash
pnpm build
pnpm lint
```

### 주요 구성

- `app/`: 페이지, 스타일, 요약 API 라우트
- `app/api/summarize/`: 회의록 요약 처리 엔드포인트
- `tests/`: 렌더링 검증 테스트
- `.openai/hosting.json`: Sites 호스팅 바인딩 설정

### 요구 사항

- Node.js `>=22.13.0`
- pnpm

## 과제

- [ ] '26.8.18

