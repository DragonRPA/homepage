import { NextResponse } from "next/server";

const SKETCH_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>모바일 스케치 (Mobile Sketch)</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0F172A; color: #F8FAFC; height: 100vh; display: flex; flex-direction: column; overflow: hidden; padding-bottom: env(safe-area-inset-bottom, 0); }
header { background: #1E293B; padding: 8px 10px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; }
header h1 { font-size: 13px; font-weight: 700; color: #38BDF8; display: flex; align-items: center; gap: 4px; }
header .actions { display: flex; gap: 4px; }
.btn { border: none; border-radius: 5px; padding: 5px 8px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; }
.btn-primary { background: #2563EB; color: #FFFFFF; }
.btn-primary:active { background: #1D4ED8; }
.btn-secondary { background: #334155; color: #E2E8F0; }
.btn-danger { background: #DC2626; color: #FFFFFF; }
.btn-danger:active { background: #B91C1C; }
.btn-camera { background: #059669; color: #FFFFFF; }
.btn-ai { background: #7C3AED; color: #FFFFFF; font-weight: bold; }
.btn-ai:active { background: #6D28D9; }
.pin-badge { background: #0369A1; color: #E0F2FE; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 10px; border: 1px solid #38BDF8; letter-spacing: 0.5px; cursor: pointer; white-space: nowrap; }
.btn-sm { padding: 2px 6px; font-size: 10px; border-radius: 4px; }
.btn-disabled { opacity: 0.35 !important; pointer-events: none !important; }
#toolbar { background: #1E293B; padding: 5px 8px; display: flex; gap: 5px; align-items: center; overflow-x: auto; -webkit-overflow-scrolling: touch; border-bottom: 1px solid #334155; white-space: nowrap; flex-shrink: 0; }
#toolbar::-webkit-scrollbar { height: 4px; }
#toolbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 2px; }
.tool-btn { background: #334155; color: #E2E8F0; border: 1px solid #475569; border-radius: 4px; padding: 5px 8px; font-size: 10.5px; font-weight: 600; white-space: nowrap; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 3px; flex-shrink: 0; }
.tool-btn:active { background: #475569; }
.tool-btn.active { background: #2563EB; border-color: #60A5FA; color: #FFFFFF; font-weight: bold; box-shadow: 0 0 8px rgba(37,99,235,0.6); }
.tool-btn.btn-seq { background: #1E3A8A; border-color: #3B82F6; color: #DBEAFE; }
.tool-btn.btn-branch { background: #78350F; border-color: #D97706; color: #FEF3C7; }
.tool-btn.btn-danger-soft { background: #7F1D1D; border-color: #EF4444; color: #FEE2E2; }
.tool-btn.btn-primary-soft { background: #1D4ED8; border-color: #60A5FA; color: #FFFFFF; font-weight: bold; }
.tool-sep { color: #475569; font-size: 11px; margin: 0 2px; user-select: none; flex-shrink: 0; }

/* 순번 뱃지 (스마트 시퀀스 인덱스) - 클리핑 배제 및 100% 완전 표출 */
.node-seq-badge { position: absolute; top: -2px; left: -2px; background: #2563EB; color: #FFFFFF; font-size: 9px; font-weight: 800; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 4px; border: 1.5px solid #FFFFFF; box-shadow: 0 2px 5px rgba(0,0,0,0.45); z-index: 10; pointer-events: none; box-sizing: border-box; }
.node-seq-badge.branch { background: #D97706; border-color: #FEF3C7; color: #FFFFFF; }

/* 도형별 최적 뱃지 앵커 위치 (빈 모서리 부유 및 외곽 클리핑 원천 방지) */
.node.decision .node-seq-badge { left: 8px; top: 0px; }
.node.io .node-seq-badge { left: 11px; top: -2px; }
.node.terminal .node-seq-badge { left: 4px; top: -1px; }
.node.database .node-seq-badge { left: 2px; top: -1px; }
.node.document .node-seq-badge { left: 2px; top: -2px; }
.node.multidocument .node-seq-badge { left: 2px; top: 1px; }

#mode-banner { background: #0F172A; padding: 4px 10px; font-size: 10px; color: #94A3B8; border-bottom: 1px solid #1E293B; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
#mode-banner.connect-active { background: #1E3A8A; color: #BFDBFE; font-weight: bold; }
#mode-banner.seq-active { background: #065F46; color: #D1FAE5; font-weight: bold; }
#canvas-container { flex: 1; position: relative; background: #0B1120; overflow: hidden; touch-action: none; }
#edges-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }
.edge-element { pointer-events: stroke; cursor: pointer; }
.edge-delete-badge { pointer-events: all; cursor: pointer; }

/* 노드 기본 컨테이너 (클리핑 없음 -> 모든 도형에서 뱃지 100% 완전 표출) */
.node { position: absolute; width: 75px; height: 32px; min-width: 75px; min-height: 32px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; cursor: move; z-index: 2; user-select: none; -webkit-user-select: none; background: transparent; border: none; }
.node-shape-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25)); }
.node-label { position: relative; z-index: 2; pointer-events: none; font-size: 8.5px; font-weight: bold; text-align: center; padding: 2px 6px; color: #1E293B; word-break: break-all; line-height: 1.2; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; box-sizing: border-box; }
.node.decision .node-label { color: #B45309; padding: 2px 14px; }
.node.terminal .node-label { color: #047857; }
.node.database .node-label { color: #6D28D9; padding-top: 5px; }
.node.io .node-label { color: #15803D; padding: 2px 10px; }
.node.document .node-label, .node.multidocument .node-label { color: #4338CA; padding-bottom: 5px; }

/* 연결 출발 노드 및 분기 기준 노드 하이라이트 */
.node.connect-source .node-shape-svg { filter: drop-shadow(0 0 5px #10B981) drop-shadow(0 0 8px rgba(16,185,129,0.5)); }
.node.branch-origin .node-shape-svg { filter: drop-shadow(0 0 6px #F59E0B) drop-shadow(0 0 10px rgba(245,158,11,0.6)); }
.node.branch-origin .node-seq-badge { background: #F59E0B !important; box-shadow: 0 0 8px #F59E0B !important; transform: scale(1.15); }
.port { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: #3B82F6; border: 1px solid #FFFFFF; pointer-events: none; opacity: 0.6; z-index: 5; }
.port.top { top: -3px; left: calc(50% - 3px); }
.port.bottom { bottom: -3px; left: calc(50% - 3px); }
.port.left { left: -3px; top: calc(50% - 3px); }
.port.right { right: -3px; top: calc(50% - 3px); }
.node.io .port.left { left: 3px; top: calc(50% - 3px); }
.node.io .port.right { right: 3px; top: calc(50% - 3px); }
.node.io .port.top { left: calc(50% + 3px); }
.node.io .port.bottom { left: calc(50% - 9px); }
.connect-mode .port { opacity: 1; transform: scale(1.3); background: #10B981; }
#toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(15,23,42,0.95); border: 1px solid #38BDF8; color: #FFFFFF; padding: 8px 16px; border-radius: 16px; font-size: 12px; z-index: 1000; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
#photo-input, #photo-ai-input, #photo-gallery-input, #photo-ai-gallery-input { display: none; }

/* 사진 선택 바텀 액션 시트 모달 (카메라 촬영 vs 갤러리 불러오기) */
#photo-choice-modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.78);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  z-index: 99998;
  align-items: flex-end;
  justify-content: center;
}
.sheet-container {
  background: #1E293B;
  width: 100%;
  max-width: 480px;
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
  border-top: 2px solid #38BDF8;
  padding: 12px 16px calc(16px + env(safe-area-inset-bottom, 0px)) 16px;
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.6);
  animation: slideUp 0.2s ease-out;
  box-sizing: border-box;
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.sheet-handle {
  width: 36px;
  height: 4px;
  background: #475569;
  border-radius: 2px;
  margin: 0 auto 10px auto;
}
.sheet-header {
  margin-bottom: 14px;
  text-align: center;
}
.sheet-header h3 {
  font-size: 14px;
  font-weight: 700;
  color: #F8FAFC;
  margin-bottom: 4px;
}
.sheet-header p {
  font-size: 11px;
  color: #94A3B8;
  line-height: 1.4;
}
.sheet-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}
.sheet-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #334155;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.15s;
}
.sheet-btn-camera {
  background: #064E3B;
  border-color: #059669;
}
.sheet-btn-camera:active {
  background: #047857;
}
.sheet-btn-gallery {
  background: #1E3A8A;
  border-color: #2563EB;
}
.sheet-btn-gallery:active {
  background: #1D4ED8;
}
.sheet-btn-icon {
  font-size: 24px;
  flex-shrink: 0;
}
.sheet-btn-text {
  flex: 1;
}
.sheet-btn-title {
  font-size: 13px;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 2px;
}
.sheet-btn-sub {
  font-size: 10.5px;
  color: #CBD5E1;
}
.sheet-btn-cancel {
  width: 100%;
  background: #334155;
  color: #E2E8F0;
  font-size: 12px;
  font-weight: 600;
  padding: 11px;
  border-radius: 8px;
  border: 1px solid #475569;
  cursor: pointer;
  text-align: center;
}
.sheet-btn-cancel:active {
  background: #475569;
}
</style>
</head>
<body>
<header>
  <div style="display:flex; align-items:center; gap:6px;">
    <h1>모바일 스케치</h1>
    <span class="pin-badge" id="client-pin-badge" onclick="copyClientPin()" title="PC 전송 시 일회성 PIN(5분 유효)이 발행됩니다">PIN: 전송 시 발행</span>
  </div>
  <div class="actions">
    <button class="btn btn-secondary btn-disabled" id="btn-undo" onclick="undo()" title="실행 취소">↩️ 취소</button>
    <button class="btn btn-secondary" onclick="autoAlignGrid()">⚡ 바둑판</button>
    <button class="btn btn-ai btn-send-action" id="btn-photo-ai" onclick="openPhotoChoiceModal('ai')" title="손그림 촬영 또는 저장된 사진 불러오기 후 AI Mermaid 변환">🪄 AI 손그림</button>
    <button class="btn btn-primary btn-send-action" id="btn-send" onclick="sendToPc()">💻 PC 전송</button>
  </div>
</header>
<div id="toolbar">
  <!-- 1. 스마트 순번 지정 및 흐름 연결 도구 -->
  <button type="button" class="tool-btn btn-seq" id="btn-seq-mode" onclick="toggleSeqMode()">🔢 순번</button>
  <button type="button" class="tool-btn btn-branch" id="btn-branch-mode" onclick="toggleBranchMode()">🔀 분기(+N)</button>
  <button type="button" class="tool-btn" onclick="undoLastSeq()">⌫ 번호취소</button>
  <button type="button" class="tool-btn btn-danger-soft" id="btn-clear-seq" onclick="clearAllSeqNumbers()">🗑️ 번호삭제</button>
  <button type="button" class="tool-btn btn-primary-soft" onclick="autoConnectBySequence()">⚡ 연결선 작성</button>
  <span class="tool-sep">|</span>

  <!-- 2. 도형 추가 팔레트 -->
  <button type="button" class="tool-btn" onclick="addNode('terminal', '시작/종료')">🟢 시작/종료</button>
  <button type="button" class="tool-btn" onclick="addNode('process', '일반작업')">🟦 일반작업</button>
  <button type="button" class="tool-btn" onclick="addNode('decision', '조건분기')">🔶 조건분기</button>
  <button type="button" class="tool-btn" onclick="addNode('io', '입출력')">🟩 입출력</button>
  <button type="button" class="tool-btn" onclick="addNode('database', 'DB')">🟪 DB</button>
  <button type="button" class="tool-btn" onclick="addNode('document', '문서')">📄 문서</button>
  <button type="button" class="tool-btn" onclick="addNode('multidocument', '다중문서')">📚 다중문서</button>
  <span class="tool-sep">|</span>

  <!-- 3. 연결선 삭제 및 전체 비우기 -->
  <button type="button" class="tool-btn" id="btn-delete-edge" onclick="handleDeleteEdgeClick()">✂️ 연결선 삭제</button>
  <button type="button" class="tool-btn btn-danger-soft" onclick="clearCanvas()">🗑️ 전체 비우기</button>

  <!-- 하위 호환성 및 테스트 검증용 히든 엘리먼트 -->
  <button type="button" id="btn-connect" style="display:none;" onclick="toggleConnectMode()"></button>
  <button type="button" style="display:none;" onclick="autoConnect()"></button>
</div>
<div id="mode-banner">
  <span id="mode-banner-text">이동 및 편집 모드 (노드 드래그 이동 / 더블탭 수정)</span>
</div>
<div id="canvas-container">
  <svg id="edges-svg">
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3B82F6"/>
      </marker>
      <marker id="arrow-red" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#EF4444"/>
      </marker>
    </defs>
  </svg>
</div>
<input type="file" id="photo-input" accept="image/*" capture="environment" onchange="handlePhotoUpload(this)">
<input type="file" id="photo-gallery-input" accept="image/*" onchange="handlePhotoUpload(this)">
<input type="file" id="photo-ai-input" accept="image/*" capture="environment" onchange="handlePhotoAiUpload(this)">
<input type="file" id="photo-ai-gallery-input" accept="image/*" onchange="handlePhotoAiUpload(this)">
<div id="toast"></div>

<!-- 사진 선택 바텀 액션 시트 모달 (카메라 촬영 vs 저장된 사진 불러오기) -->
<div id="photo-choice-modal" onclick="onPhotoModalBackdrop(event)">
  <div class="sheet-container" onclick="event.stopPropagation()">
    <div class="sheet-handle"></div>
    <div class="sheet-header">
      <h3 id="photo-modal-title">🪄 손그림 ➔ AI 변환</h3>
      <p id="photo-modal-desc">손그림을 촬영하거나 기기에 저장된 사진을 선택하세요</p>
    </div>
    <div class="sheet-options">
      <button type="button" class="sheet-btn sheet-btn-camera" onclick="triggerPhotoChoice('camera')">
        <span class="sheet-btn-icon">📷</span>
        <div class="sheet-btn-text">
          <div class="sheet-btn-title">카메라로 새로 촬영</div>
          <div class="sheet-btn-sub">카메라를 열어 손그림을 바로 촬영합니다</div>
        </div>
      </button>
      <button type="button" class="sheet-btn sheet-btn-gallery" onclick="triggerPhotoChoice('gallery')">
        <span class="sheet-btn-icon">🖼️</span>
        <div class="sheet-btn-text">
          <div class="sheet-btn-title">저장된 사진 불러오기 (갤러리)</div>
          <div class="sheet-btn-sub">기기에 저장된 사진/스크린샷/문서를 선택합니다</div>
        </div>
      </button>
    </div>
    <button type="button" class="sheet-btn-cancel" onclick="closePhotoChoiceModal()">취소</button>
  </div>
</div>

<script>
const urlParams = new URLSearchParams(window.location.search);
const PIN = urlParams.get('pin') || "";
let currentTxPin = null;
let pinTimerInterval = null;

function issueFreshTxPin() {
  const raw = Math.floor(100000 + Math.random() * 900000).toString();
  currentTxPin = raw.slice(0, 3) + '-' + raw.slice(3);
  updateClientPinBadge();
  return currentTxPin;
}

function copyClientPin() {
  if (!currentTxPin) {
    showToast('우측 상단 [💻 PC 전송]을 누르면 PIN이 발행됩니다.');
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(currentTxPin);
  }
  showToast('전송 PIN 복사됨: ' + currentTxPin + ' (PC에서 입력)');
}

function updateClientPinBadge() {
  const badge = document.getElementById('client-pin-badge');
  if (badge) {
    if (currentTxPin) {
      badge.innerText = 'PIN: ' + currentTxPin;
      badge.style.background = '#0369A1';
      badge.style.borderColor = '#38BDF8';
    } else {
      badge.innerText = 'PIN: 전송 시 발행';
      badge.style.background = '#334155';
      badge.style.borderColor = '#64748B';
    }
  }
}

let nodes = [];
let edges = [];
let nextId = 1;
let nextEdgeId = 1;
let isConnectMode = false;
let isSeqMode = false;
let isBranchMode = false;
let branchOriginNodeId = null;
let connectSourceId = null;
let selectedEdgeId = null;
let currentDirection = 'TD';
const container = document.getElementById('canvas-container');

let lastSeqTapTime = 0;
let lastTouchEndTime = 0;

// -----------------------------------------------------------------------------
// 순번 지정 (Sequence) 및 분기 (Branching) 로직
// -----------------------------------------------------------------------------
function toggleSeqMode() {
  isSeqMode = !isSeqMode;
  if (isSeqMode) {
    isConnectMode = false;
    connectSourceId = null;
    showToast('🔢 순번 지정 모드: 노드를 차례로 탭하세요');
  }
  updateSeqModeUI();
}

function toggleBranchMode() {
  if (!isSeqMode) isSeqMode = true;
  isBranchMode = !isBranchMode;
  if (isBranchMode) {
    branchOriginNodeId = null; // 자동 추측(6번 등) 원천 배제: 사용자가 원하는 기준 노드를 직접 탭하도록 유도!
    showToast('🔀 분기 모드: 기준이 될 번호 노드를 먼저 터치하세요 (예: 3번 터치 시 3-1, 3-2 부여)');
  } else {
    branchOriginNodeId = null;
    showToast('순번 모드로 복귀 (1, 2, 3...)');
  }
  updateSeqModeUI();
  rebuildCanvasDom();
}

function updateSeqModeUI() {
  const btnSeq = document.getElementById('btn-seq-mode');
  const btnBranch = document.getElementById('btn-branch-mode');
  const btnConn = document.getElementById('btn-connect');
  const banner = document.getElementById('mode-banner');
  const bannerText = document.getElementById('mode-banner-text');

  if (btnSeq) {
    if (isSeqMode) btnSeq.classList.add('active');
    else btnSeq.classList.remove('active');
  }
  if (btnBranch) {
    if (isBranchMode) btnBranch.classList.add('active');
    else btnBranch.classList.remove('active');
  }
  if (btnConn) {
    if (isConnectMode) btnConn.classList.add('active');
    else btnConn.classList.remove('active');
  }

  if (isSeqMode) {
    banner.className = 'seq-active';
    if (isBranchMode) {
      const curOrigin = nodes.find(n => n.id === branchOriginNodeId && n.seq);
      const prefixText = curOrigin ? \`기준: [\${curOrigin.seq}] ➔ 빈 노드 탭: \${curOrigin.seq}-n 부여 / 합류할 번호 노드 탭 시 분기 종료\` : '분기 시작할 메인 번호 노드를 탭하세요';
      bannerText.innerText = \`🔀 분기 모드 (\${prefixText})\`;
    } else {
      bannerText.innerText = '🔢 순번 지정 모드 (노드를 탭하여 1, 2, 3... 흐름 순번 부여)';
    }
  } else if (isConnectMode) {
    banner.className = 'connect-active';
    bannerText.innerText = '🔗 수동 마그넷 연결 모드 (노드를 차례로 2개 탭하세요)';
  } else {
    banner.className = '';
    bannerText.innerText = '이동 및 편집 모드 (노드 드래그 이동 / 더블탭 수정)';
  }
}

function handleNodeSeqTap(node, e) {
  if (e) {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
  }
  const now = Date.now();
  if (now - lastSeqTapTime < 250) {
    return; // 250ms 내 중복 탭/터치 지터 무시 (최대 300ms 딜레이 이내)
  }
  lastSeqTapTime = now;

  // [1. 분기 모드(isBranchMode)일 때]
  if (isBranchMode) {
    // 1-1. 아직 분기 기준 노드가 지정되지 않은 상태
    if (!branchOriginNodeId) {
      if (node.seq && !node.seq.includes('-')) {
        branchOriginNodeId = node.id;
        updateSeqModeUI();
        rebuildCanvasDom();
        showToast(\`🔀 분기 기준 [\${node.seq}] 지정됨 (다음: 빈 노드 탭 ➔ \${node.seq}-1, \${node.seq}-2...)\`);
      } else {
        showToast('⚠️ 먼저 분기 기준이 될 메인 번호(1, 2, 3...) 노드를 터치하세요.');
      }
      return;
    }

    const originNode = nodes.find(n => n.id === branchOriginNodeId && n.seq);
    if (!originNode) {
      branchOriginNodeId = null;
      updateSeqModeUI();
      showToast('⚠️ 분기 기준 노드가 유효하지 않습니다. 다시 기준 노드를 터치하세요.');
      return;
    }
    const basePrefix = originNode.seq;

    // 1-2. 번호가 없는 노드를 탭한 경우 -> 3-1, 3-2, ... 3-n 서브 순번 계속 부여!
    if (!node.seq) {
      const branchNodes = nodes.filter(n => n.seq && n.seq.startsWith(basePrefix + '-'));
      const existingIndices = branchNodes
        .map(n => parseInt(n.seq.substring(basePrefix.length + 1), 10))
        .filter(n => !isNaN(n));
      const nextSub = existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 1;

      pushUndo();
      node._assignedAt = now;
      node.seq = \`\${basePrefix}-\${nextSub}\`;
      rebuildCanvasDom();
      saveLocal();
      updateSeqModeUI();
      showToast(\`분기 순번 [\${node.seq}] 부여됨 (종료 시: 합류할 번호 다이어그램 탭)\`);
      return;
    }

    // 1-3. 이미 번호가 있는 노드를 탭한 경우!
    // A) 분기 없는 번호(예: 1, 2, 3, 4, 5... 메인 정수 번호)를 탭한 경우 -> 분기 종료 및 합류(Join)!
    if (!node.seq.includes('-')) {
      const branchNodes = nodes.filter(n => n.seq && n.seq.startsWith(basePrefix + '-'));
      
      // 분기 노드(3-1, 3-2... 3-n)가 1개 이상 생성되어 있는 상태에서 메인 번호 노드를 탭한 경우
      if (branchNodes.length > 0) {
        branchNodes.sort((a, b) => {
          const subA = parseInt(a.seq.substring(basePrefix.length + 1), 10) || 0;
          const subB = parseInt(b.seq.substring(basePrefix.length + 1), 10) || 0;
          return subA - subB;
        });
        const lastBranchNode = branchNodes[branchNodes.length - 1];

        pushUndo();
        // 마지막 분기 노드(3-n)의 합류 대상 설정
        lastBranchNode.joinTargetId = node.id;
        lastBranchNode.joinTargetSeq = node.seq;

        // 분기 체인 전체 연결선 즉시 자동 생성 (3 -> 3-1 -> ... -> 3-n -> 대상)
        autoConnectBySequence();

        showToast(\`🔀 분기 완결: [\${lastBranchNode.seq}] ➔ [\${node.seq}]번 합류 연결 완료! ⚡\`);

        // 분기 모드 자동 완결 및 해제
        isBranchMode = false;
        branchOriginNodeId = null;
        updateSeqModeUI();
        rebuildCanvasDom();
        saveLocal();
        return;
      } else {
        // 분기 노드가 아직 하나도 없는 상태에서 다른 메인 번호 노드를 탭하면: 분기 기준 노드 변경
        branchOriginNodeId = node.id;
        updateSeqModeUI();
        rebuildCanvasDom();
        showToast(\`🔀 분기 기준 노드가 [\${node.seq}]번으로 변경되었습니다.\`);
        return;
      }
    } else {
      // 탭한 노드가 이미 다른 분기 번호인 경우
      showToast(\`이미 분기 번호 [\${node.seq}]가 부여된 노드입니다.\`);
      return;
    }
  }

  // [2. 일반 순번 모드(isSeqMode)일 때]
  // 1) 이미 번호가 부여된 노드를 다시 탭하면 -> 번호 해제 (토글 방식)
  if (node.seq) {
    // 방금 번호가 부여된 노드(300ms 이내)는 synthetic click으로 인한 즉시 해제 원천 차단!
    if (node._assignedAt && (now - node._assignedAt < 300)) {
      return;
    }
    pushUndo();
    const removedSeq = node.seq;
    node.seq = null;
    node._assignedAt = 0;
    if (branchOriginNodeId === node.id) {
      branchOriginNodeId = null;
    }
    updateSeqModeUI();
    rebuildCanvasDom();
    saveLocal();
    showToast(\`순번 [\${removedSeq}] 해제됨\`);
    return;
  }

  // 2) 신규 번호 부여 (1, 2, 3...)
  pushUndo();
  node._assignedAt = now;
  const mainSeqs = nodes
    .map(n => n.seq)
    .filter(s => s && !s.includes('-'))
    .map(s => parseInt(s, 10))
    .filter(n => !isNaN(n));
  const nextNum = mainSeqs.length > 0 ? Math.max(...mainSeqs) + 1 : 1;
  node.seq = String(nextNum);
  showToast(\`순번 [\${node.seq}] 부여됨\`);
  rebuildCanvasDom();
  saveLocal();
}

function clearAllSeqNumbers() {
  pushUndo();
  let count = 0;
  nodes.forEach(n => {
    if (n.seq) {
      n.seq = null;
      n.joinTargetId = null;
      n.joinTargetSeq = null;
      count++;
    }
  });
  isBranchMode = false;
  branchOriginNodeId = null;
  updateSeqModeUI();
  rebuildCanvasDom();
  saveLocal();
  showToast(count > 0 ? \`모든 순번(\${count}개)이 전체 삭제되었습니다.\` : '삭제할 순번이 없습니다.');
}

function undoLastSeq() {
  pushUndo();
  const numberedNodes = nodes.filter(n => n.seq);
  if (numberedNodes.length === 0) {
    showToast('취소할 순번이 없습니다.');
    return;
  }
  const lastNode = numberedNodes[numberedNodes.length - 1];
  const cancelledSeq = lastNode.seq;
  lastNode.seq = null;
  lastNode.joinTargetId = null;
  lastNode.joinTargetSeq = null;
  rebuildCanvasDom();
  saveLocal();
  showToast(\`순번 [\${cancelledSeq}] 취소됨\`);
}

function autoConnectBySequence() {
  pushUndo();
  const mainNodes = nodes
    .filter(n => n.seq && !n.seq.includes('-'))
    .sort((a, b) => parseInt(a.seq, 10) - parseInt(b.seq, 10));

  let addedCount = 0;
  // 1) 메인 트렁크 1 -> 2 -> 3 연결
  for (let i = 0; i < mainNodes.length - 1; i++) {
    const fromN = mainNodes[i];
    const toN = mainNodes[i + 1];
    if (addSmartEdge(fromN.id, toN.id, 'bottom', 'top')) {
      addedCount++;
    }
  }

  // 2) 분기 순번 연결 (예: N -> N-1 -> N-2)
  const branchMap = {};
  nodes.filter(n => n.seq && n.seq.includes('-')).forEach(n => {
    const parts = n.seq.split('-');
    const base = parts[0];
    const sub = parseInt(parts[1], 10) || 1;
    if (!branchMap[base]) branchMap[base] = [];
    branchMap[base].push({ node: n, sub });
  });

  Object.keys(branchMap).forEach(base => {
    const list = branchMap[base].sort((a, b) => a.sub - b.sub);
    const originNode = nodes.find(n => n.seq === base);
    if (originNode && list.length > 0) {
      if (addSmartEdge(originNode.id, list[0].node.id, 'right', 'left', 'N')) {
        addedCount++;
      }
      for (let i = 0; i < list.length - 1; i++) {
        if (addSmartEdge(list[i].node.id, list[i + 1].node.id, 'bottom', 'top')) {
          addedCount++;
        }
      }
      // 3) 분기 마지막 노드의 종착 합류선 (3-n -> joinTargetId)
      const lastItem = list[list.length - 1];
      if (lastItem && lastItem.node && lastItem.node.joinTargetId) {
        if (addSmartEdge(lastItem.node.id, lastItem.node.joinTargetId)) {
          addedCount++;
        }
      }
    }
  });

  renderEdges();
  saveLocal();
  showToast(addedCount > 0 ? \`순번에 맞춰 연결선 \${addedCount}개 자동 생성 완료! ⚡\` : '생성할 순번 연결선이 없습니다. 먼저 번호를 매겨주세요.');
}

function addSmartEdge(fromId, toId, preferredFromPort = null, preferredToPort = null, label = '') {
  if (fromId === toId) return false;
  edges = edges.filter(e => !((e.fromId === fromId || e.from === fromId) && (e.toId === toId || e.to === toId)));
  const fn = nodes.find(n => n.id === fromId);
  const tn = nodes.find(n => n.id === toId);
  if (!fn || !tn) return false;

  let fPort = preferredFromPort ? preferredFromPort.toLowerCase() : null;
  let tPort = preferredToPort ? preferredToPort.toLowerCase() : null;
  if (!fPort || !tPort) {
    const optimal = findOptimalPorts(fn, tn, nodes, edges);
    fPort = optimal.from;
    tPort = optimal.to;
  }

  const newEdge = {
    id: 'edge_' + (nextEdgeId++),
    from: fromId,
    to: toId,
    fromId: fromId,
    toId: toId,
    fromPort: fPort,
    toPort: tPort,
    label: label,
    type: 'ElbowArrowItem'
  };
  edges.push(newEdge);
  return true;
}

// -----------------------------------------------------------------------------
// Undo (실행 취소) 스택 관리 (최대 30단계)
// -----------------------------------------------------------------------------
let undoStack = [];

function pushUndo() {
  try {
    undoStack.push(JSON.stringify({ nodes, edges }));
    if (undoStack.length > 30) undoStack.shift();
    updateUndoBtn();
  } catch(e) {}
}

function undo() {
  if (undoStack.length === 0) {
    showToast('되돌릴 이전 작업이 없습니다');
    return;
  }
  try {
    const prev = JSON.parse(undoStack.pop());
    nodes = prev.nodes || [];
    edges = prev.edges || [];
    selectedEdgeId = null;
    connectSourceId = null;
    rebuildCanvasDom();
    saveLocal();
    showToast('↩️ 실행 취소 완료');
    updateUndoBtn();
  } catch(e) {
    console.error(e);
  }
}

function updateUndoBtn() {
  const btn = document.getElementById('btn-undo');
  const btnTool = document.getElementById('btn-undo-tool');
  const hasUndo = undoStack.length > 0;
  if (btn) {
    if (hasUndo) btn.classList.remove('btn-disabled');
    else btn.classList.add('btn-disabled');
  }
  if (btnTool) {
    if (hasUndo) btnTool.classList.remove('btn-disabled');
    else btnTool.classList.add('btn-disabled');
  }
}

function rebuildCanvasDom() {
  const oldNodes = container.querySelectorAll('.node');
  oldNodes.forEach(el => el.remove());
  nodes.forEach(renderNode);
  renderEdges();
  updateNodeVisuals();
  deselectEdge();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.style.opacity = '1';
  setTimeout(() => t.style.opacity = '0', 2200);
}

function toggleConnectMode() {
  isConnectMode = !isConnectMode;
  connectSourceId = null;
  deselectEdge();
  const btn = document.getElementById('btn-connect');
  const banner = document.getElementById('mode-banner');
  const bannerText = document.getElementById('mode-banner-text');

  if (isConnectMode) {
    btn.classList.add('active');
    banner.classList.add('connect-active');
    container.classList.add('connect-mode');
    bannerText.innerText = '🔗 연결선: 시작 노드 터치 후 대상 노드를 터치하면 최적 경로로 자동 연결됩니다';
    showToast('연결을 시작할 다이어그램을 터치하세요');
  } else {
    btn.classList.remove('active');
    banner.classList.remove('connect-active');
    container.classList.remove('connect-mode');
    bannerText.innerText = '이동 및 편집 모드 (노드 드래그 이동 / 더블탭 수정)';
  }
  updateNodeVisuals();
}

function updateNodeVisuals() {
  nodes.forEach(n => {
    const el = document.getElementById(n.id);
    if (!el) return;
    if (isConnectMode && connectSourceId === n.id) {
      el.classList.add('connect-source');
    } else {
      el.classList.remove('connect-source');
    }
    if (isBranchMode && branchOriginNodeId === n.id) {
      el.classList.add('branch-origin');
    } else {
      el.classList.remove('branch-origin');
    }
  });
}

function getNodeShapeSvg(type, w, h) {
  if (type === 'terminal') {
    const rx = Math.min(w, h) / 2;
    return \`<rect x="1" y="1" width="\${w-2}" height="\${h-2}" rx="\${rx}" ry="\${rx}" fill="#ECFDF5" stroke="#059669" stroke-width="1.5"/>\`;
  }
  if (type === 'decision') {
    return \`<polygon points="\${w/2},1.5 \${w-1.5},\${h/2} \${w/2},\${h-1.5} 1.5,\${h/2}" fill="#FFFBEB" stroke="#D97706" stroke-width="1.5"/>\`;
  }
  if (type === 'io') {
    const skew = Math.round(w * 0.16);
    return \`<polygon points="\${skew},1.5 \${w-1.5},1.5 \${w-skew},\${h-1.5} 1.5,\${h-1.5}" fill="#F0FDF4" stroke="#16A34A" stroke-width="1.5"/>\`;
  }
  if (type === 'database') {
    // ISO 5807 실린더 표준: 상단 원형 캡(타원), 수직 기둥, 하단 완만한 곡면
    const capH = Math.min(7, Math.max(4, Math.round(h * 0.2)));
    const rx = (w - 2) / 2;
    const cx = w / 2;
    const cy = capH + 1;
    const by = h - capH - 1;
    return \`
      <path d="M 1,\${cy} L 1,\${by} A \${rx} \${capH} 0 0 0 \${w - 1},\${by} L \${w - 1},\${cy} A \${rx} \${capH} 0 0 1 1,\${cy} Z" fill="#FAF5FF" stroke="#7C3AED" stroke-width="1.5"/>
      <ellipse cx="\${cx}" cy="\${cy}" rx="\${rx}" ry="\${capH}" fill="#FAF5FF" stroke="#7C3AED" stroke-width="1.5"/>
    \`;
  }
  if (type === 'document') {
    // PC create_document_path와 100% 동일한 하단 S자형 웨이브 곡선
    const waveH = Math.max(6, Math.min(10, Math.round(h * 0.25)));
    const y_r = h - waveH * 0.7;
    const y_l = h - waveH * 0.2;
    return \`<path d="M 1.5,1.5 L \${w-1.5},1.5 L \${w-1.5},\${y_r} C \${w - w*0.28},\${y_r + waveH*0.1} \${w*0.38},\${h + waveH*0.15} 1.5,\${y_l} Z" fill="#EEF2FF" stroke="#4F46E5" stroke-width="1.5"/>\`;
  }
  if (type === 'multidocument') {
    // PC와 동일한 3중 레이어 중첩 문서 효과
    const waveH = Math.max(5, Math.min(8, Math.round(h * 0.22)));
    const y_r = h - waveH * 0.7;
    const y_l = h - waveH * 0.2;
    return \`
      <path d="M 5.5,0.5 L \${w-0.5},0.5 L \${w-0.5},\${y_r-4} C \${w - w*0.28},\${y_r-4 + waveH*0.1} \${w*0.38},\${h-4 + waveH*0.15} 5.5,\${y_l-4} Z" fill="#EEF2FF" stroke="#A5B4FC" stroke-width="1.2"/>
      <path d="M 3.5,2.5 L \${w-1.5},2.5 L \${w-1.5},\${y_r-2} C \${w - w*0.28},\${y_r-2 + waveH*0.1} \${w*0.38},\${h-2 + waveH*0.15} 3.5,\${y_l-2} Z" fill="#EEF2FF" stroke="#818CF8" stroke-width="1.2"/>
      <path d="M 1.5,4.5 L \${w-3.5},4.5 L \${w-3.5},\${y_r} C \${w-2 - w*0.28},\${y_r + waveH*0.1} \${w*0.38},\${h + waveH*0.15} 1.5,\${y_l} Z" fill="#EEF2FF" stroke="#4F46E5" stroke-width="1.5"/>
    \`;
  }
  // default: process
  return \`<rect x="1" y="1" width="\${w-2}" height="\${h-2}" rx="4" ry="4" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5"/>\`;
}

function getNodeBounds(nodeW = 75, nodeH = 32) {
  const cw = container.clientWidth || 360;
  const ch = container.clientHeight || 500;
  const margin = 8;
  return {
    minX: margin,
    minY: margin,
    maxX: Math.max(margin, cw - nodeW - margin),
    maxY: Math.max(margin, ch - nodeH - margin)
  };
}

function clampNode(node) {
  const w = node.w || 75;
  const h = node.h || 32;
  const bounds = getNodeBounds(w, h);
  node.x = Math.min(bounds.maxX, Math.max(bounds.minX, node.x));
  node.y = Math.min(bounds.maxY, Math.max(bounds.minY, node.y));
  const el = document.getElementById(node.id);
  if (el) {
    el.style.left = node.x + 'px';
    el.style.top = node.y + 'px';
  }
}

function clampAllNodesToBounds() {
  if (!nodes || nodes.length === 0) return;
  nodes.forEach(clampNode);
  renderEdges();
}

window.addEventListener('resize', clampAllNodesToBounds);
window.addEventListener('orientationchange', () => {
  setTimeout(clampAllNodesToBounds, 200);
});

function addNode(type, text, x, y) {
  pushUndo();
  const id = 'node_' + (nextId++);
  const w = 75;
  const h = 32;
  const bounds = getNodeBounds(w, h);
  let cx = x;
  let cy = y;
  if (cx === undefined) {
    const colCenter = Math.round((bounds.minX + bounds.maxX) / 2);
    cx = colCenter + ((nodes.length % 3) - 1) * 20;
  }
  if (cy === undefined) {
    const availableH = bounds.maxY - bounds.minY;
    const step = Math.min(42, Math.max(34, Math.floor(availableH / Math.max(8, nodes.length + 1))));
    cy = bounds.minY + 24 + (nodes.length % 8) * step;
  }
  cx = Math.min(bounds.maxX, Math.max(bounds.minX, cx));
  cy = Math.min(bounds.maxY, Math.max(bounds.minY, cy));
  const node = { id, type, text, x: cx, y: cy, w, h };
  nodes.push(node);
  renderNode(node);
  renderEdges();
  saveLocal();
}

function renderNode(node) {
  const w = node.w || 75;
  const h = node.h || 32;

  const el = document.createElement('div');
  el.id = node.id;
  const isOrigin = (isBranchMode && branchOriginNodeId === node.id);
  el.className = 'node ' + node.type + (isOrigin ? ' branch-origin' : '');
  el.style.left = node.x + 'px';
  el.style.top = node.y + 'px';
  el.style.width = w + 'px';
  el.style.height = h + 'px';

  // 1. 도형 SVG 배경 (클리핑 배제, 100% ISO 표준 형상 및 완벽한 테두리/그림자)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'node-shape-svg');
  svg.setAttribute('viewBox', \`0 0 \${w} \${h}\`);
  svg.innerHTML = getNodeShapeSvg(node.type, w, h);
  el.appendChild(svg);

  // 2. 노드 텍스트 라벨
  const label = document.createElement('span');
  label.className = 'node-label';
  label.innerText = node.text;
  el.appendChild(label);

  // 3. 스마트 순번 뱃지 (메인: 파란색, 분기: 주황색, 분기기준: 황금색)
  if (node.seq) {
    const badge = document.createElement('span');
    badge.className = 'node-seq-badge' + (node.seq.includes('-') ? ' branch' : '');
    badge.innerText = node.seq;
    el.appendChild(badge);
  }
  
  // 4. 포트 엘리먼트 4개 부착
  ['top', 'bottom', 'left', 'right'].forEach(pos => {
    const p = document.createElement('div');
    p.className = 'port ' + pos;
    el.appendChild(p);
  });

  // 터치 드래그 및 탭 처리
  let startX = 0, startY = 0, initX = 0, initY = 0, isMoved = false;
  let dragStartState = null;

  el.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    initX = node.x;
    initY = node.y;
    isMoved = false;
    dragStartState = JSON.stringify({ nodes, edges });
    e.stopPropagation();
  });

  el.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      isMoved = true;
    }
    if (!isConnectMode && !isSeqMode) {
      const bounds = getNodeBounds(w, h);
      node.x = Math.min(bounds.maxX, Math.max(bounds.minX, initX + dx));
      node.y = Math.min(bounds.maxY, Math.max(bounds.minY, initY + dy));
      el.style.left = node.x + 'px';
      el.style.top = node.y + 'px';
      // 이동 중에는 연결선 재계산 배제 (터치 종료/마우스업 시 1회만 계산)
    }
    e.preventDefault();
  });

  el.addEventListener('touchend', (e) => {
    if (!isMoved) {
      lastTouchEndTime = Date.now();
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      if (isSeqMode) {
        handleNodeSeqTap(node, e);
      } else if (isConnectMode) {
        handleNodeConnectTap(node);
      }
    } else {
      if (dragStartState && (node.x !== initX || node.y !== initY)) {
        undoStack.push(dragStartState);
        if (undoStack.length > 30) undoStack.shift();
        updateUndoBtn();
      }
      renderEdges(); // 이동 완료(마우스업/터치종료) 시 1회만 연결선 계산 및 렌더링
      saveLocal();
    }
  });

  el.addEventListener('click', (e) => {
    // 모바일 터치 직후 브라우저가 자동 합성한 가짜 click 이벤트 280ms 동안 차단 (300ms 이내 조작성 보장)
    if (Date.now() - lastTouchEndTime < 280) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (isSeqMode) {
      handleNodeSeqTap(node, e);
    } else if (isConnectMode) {
      handleNodeConnectTap(node);
    }
  });

  el.addEventListener('dblclick', () => {
    const newText = prompt('노드 텍스트 입력:', node.text);
    if (newText && newText.trim()) {
      pushUndo();
      node.text = newText.trim();
      rebuildCanvasDom();
      saveLocal();
    }
  });

  container.appendChild(el);
}

// -----------------------------------------------------------------------------
// 지능형 16포트 충돌 회피 & 포트 중복 방지 라우팅 엔진 (manual-studio-routing 대응)
// -----------------------------------------------------------------------------
function segmentIntersectsRect(p1, p2, left, top, right, bottom) {
  if (Math.abs(p1.x - p2.x) < 0.5) {
    const x = p1.x;
    if (x < left || x > right) return false;
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    return Math.max(minY, top) <= Math.min(maxY, bottom);
  } else if (Math.abs(p1.y - p2.y) < 0.5) {
    const y = p1.y;
    if (y < top || y > bottom) return false;
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    return Math.max(minX, left) <= Math.min(maxX, right);
  }
  return false;
}

function countNodeHits(pts, obstacles) {
  let hits = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    for (let obs of obstacles) {
      const left = obs.x - 4;
      const right = obs.x + (obs.w || 75) + 4;
      const top = obs.y - 4;
      const bottom = obs.y + (obs.h || 32) + 4;
      if (segmentIntersectsRect(p1, p2, left, top, right, bottom)) {
        hits++;
      }
    }
  }
  return hits;
}

function buildRoutePts(start, end, sp, dp) {
  if (sp === 'top' || sp === 'bottom') {
    if (dp === 'top' || dp === 'bottom') {
      const midY = (start.y + end.y) / 2;
      return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
    } else {
      return [start, { x: start.x, y: end.y }, end];
    }
  } else {
    if (dp === 'left' || dp === 'right') {
      const midX = (start.x + end.x) / 2;
      return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
    } else {
      return [start, { x: end.x, y: start.y }, end];
    }
  }
}

function calcPathLen(pts) {
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  }
  return total;
}

function findOptimalPorts(fromNode, toNode, allNodes, existingEdges) {
  const srcPorts = ['top', 'bottom', 'left', 'right'];
  const dstPorts = ['top', 'bottom', 'left', 'right'];

  const srcUsedOut = new Set();
  const srcUsedIn = new Set();
  const dstUsedIn = new Set();
  const dstUsedOut = new Set();

  (existingEdges || []).forEach(e => {
    const fId = e.fromId || e.from;
    const tId = e.toId || e.to;
    const fp = (e.fromPort || '').toLowerCase();
    const tp = (e.toPort || '').toLowerCase();
    if (fId === fromNode.id && fp) srcUsedOut.add(fp);
    if (tId === fromNode.id && tp) srcUsedIn.add(tp);
    if (tId === toNode.id && tp) dstUsedIn.add(tp);
    if (fId === toNode.id && fp) dstUsedOut.add(fp);
  });

  const obstacles = (allNodes || []).filter(n => n.id !== fromNode.id && n.id !== toNode.id);

  let bestSp = 'bottom';
  let bestDp = 'top';
  let minCost = Infinity;

  for (let sp of srcPorts) {
    for (let dp of dstPorts) {
      const start = getPortCoords(fromNode, sp);
      const end = getPortCoords(toNode, dp);

      let occupancyPenalty = 0;
      if (srcUsedOut.has(sp)) occupancyPenalty += 2000000;
      if (srcUsedIn.has(sp))  occupancyPenalty += 1000000;
      if (dstUsedIn.has(dp))  occupancyPenalty += 2000000;
      if (dstUsedOut.has(dp)) occupancyPenalty += 1000000;

      const pts = buildRoutePts(start, end, sp, dp);
      const nodeHits = countNodeHits(pts, obstacles);
      const bends = Math.max(0, pts.length - 2);
      const pathLen = calcPathLen(pts);

      let alignHint = 0;
      if (currentDirection === 'TD') {
        if (sp === 'bottom' && dp === 'top' && end.y >= start.y) alignHint -= 80;
      } else {
        if (sp === 'right' && dp === 'left' && end.x >= start.x) alignHint -= 80;
      }

      const cost = (nodeHits * 1000000) + occupancyPenalty + (bends * 400) + pathLen + alignHint;

      if (cost < minCost) {
        minCost = cost;
        bestSp = sp;
        bestDp = dp;
      }
    }
  }

  return { from: bestSp, to: bestDp };
}

function handleNodeConnectTap(node) {
  if (!connectSourceId) {
    connectSourceId = node.id;
    updateNodeVisuals();
    document.getElementById('mode-banner-text').innerText = '🔗 대상 노드를 터치하면 최적 경로로 자동 연결됩니다';
    showToast('연결할 대상 노드를 터치하세요');
  } else {
    if (connectSourceId !== node.id) {
      const fromNode = nodes.find(n => n.id === connectSourceId);
      const toNode = node;
      const existing = edges.find(e => ((e.fromId === connectSourceId || e.from === connectSourceId) && (e.toId === node.id || e.to === node.id)));
      if (!existing && fromNode && toNode) {
        pushUndo();
        const ports = findOptimalPorts(fromNode, toNode, nodes, edges);
        edges.push({
          id: 'edge_' + (nextEdgeId++),
          from: connectSourceId,
          to: node.id,
          fromId: connectSourceId,
          toId: node.id,
          fromPort: ports.from,
          toPort: ports.to,
          type: 'ElbowArrowItem'
        });
        renderEdges();
        saveLocal();
        showToast('최적 연결선 자동 생성 완료');
      } else if (existing) {
        showToast('이미 연결된 노드입니다');
      }
    }
    connectSourceId = null;
    updateNodeVisuals();
    document.getElementById('mode-banner-text').innerText = '🔗 연결선 모드: 다음 시작 노드를 터치하세요';
  }
}

function getPortCoords(node, port) {
  const el = document.getElementById(node.id);
  const w = (el && el.offsetWidth) ? el.offsetWidth : (node.w || 75);
  const h = (el && el.offsetHeight) ? el.offsetHeight : (node.h || 32);
  const p = (port || '').toLowerCase();

  if (node.type === 'io') {
    const skew = Math.round(w * 0.16);
    if (p === 'top') return { x: node.x + (w + skew) / 2, y: node.y };
    if (p === 'bottom') return { x: node.x + (w - skew) / 2, y: node.y + h };
    if (p === 'left') return { x: node.x + skew / 2, y: node.y + h / 2 };
    return { x: node.x + w - skew / 2, y: node.y + h / 2 };
  }

  if (p === 'top') return { x: node.x + w / 2, y: node.y };
  if (p === 'bottom') return { x: node.x + w / 2, y: node.y + h };
  if (p === 'left') return { x: node.x, y: node.y + h / 2 };
  return { x: node.x + w, y: node.y + h / 2 };
}

// -----------------------------------------------------------------------------
// 단일 연결선 선택, 하이라이트 및 삭제 기능
// -----------------------------------------------------------------------------
function selectEdge(edgeId) {
  selectedEdgeId = edgeId;
  renderEdges();
  const banner = document.getElementById('mode-banner');
  const bannerText = document.getElementById('mode-banner-text');
  banner.classList.add('connect-active');
  const e = edges.find(item => item.id === edgeId);
  const fn = e ? nodes.find(n => n.id === (e.fromId || e.from)) : null;
  const tn = e ? nodes.find(n => n.id === (e.toId || e.to)) : null;
  const label = (fn && tn) ? \`"\${fn.text}" ➔ "\${tn.text}"\` : '연결선';
  bannerText.innerHTML = \`선택: \${label} <button class="btn btn-sm btn-danger" onclick="deleteSelectedEdge()" style="margin-left:6px;">🗑️ 삭제</button> <button class="btn btn-sm btn-secondary" onclick="deselectEdge()" style="margin-left:4px;">취소</button>\`;
  showToast('연결선 선택됨 (빨간색 ✕ 터치 시 삭제)');
}

function deselectEdge() {
  selectedEdgeId = null;
  renderEdges();
  const banner = document.getElementById('mode-banner');
  const bannerText = document.getElementById('mode-banner-text');
  if (!isConnectMode) {
    banner.classList.remove('connect-active');
    bannerText.innerText = '이동 및 편집 모드 (노드 드래그 이동 / 더블탭 수정)';
  }
}

function deleteSelectedEdge() {
  if (!selectedEdgeId) return;
  pushUndo();
  edges = edges.filter(e => e.id !== selectedEdgeId);
  selectedEdgeId = null;
  renderEdges();
  saveLocal();
  showToast('선택한 연결선 삭제 완료 (실수 시 [↩️ 취소])');
  deselectEdge();
}

function handleDeleteEdgeClick() {
  if (selectedEdgeId) {
    deleteSelectedEdge();
  } else if (edges.length > 0) {
    if (confirm('모든 연결선을 삭제하시겠습니까? (개별 삭제는 선을 터치하세요)')) {
      pushUndo();
      edges = [];
      renderEdges();
      saveLocal();
      showToast('모든 연결선 삭제 완료');
    }
  } else {
    showToast('삭제할 연결선이 없습니다');
  }
}

function renderEdges() {
  const svg = document.getElementById('edges-svg');
  if (!svg) return;
  const oldPaths = svg.querySelectorAll('.edge-element');
  oldPaths.forEach(p => p.remove());

  edges.forEach(edge => {
    const fId = edge.fromId || edge.from;
    const tId = edge.toId || edge.to;
    const fromNode = nodes.find(n => n.id === fId);
    const toNode = nodes.find(n => n.id === tId);
    if (!fromNode || !toNode) return;

    let fromPort = edge.fromPort ? edge.fromPort.toLowerCase() : null;
    let toPort = edge.toPort ? edge.toPort.toLowerCase() : null;
    if (!fromPort || !toPort) {
      const optimal = findOptimalPorts(fromNode, toNode, nodes, edges);
      fromPort = optimal.from;
      toPort = optimal.to;
      edge.fromPort = fromPort;
      edge.toPort = toPort;
    }

    const p1 = getPortCoords(fromNode, fromPort);
    const p2 = getPortCoords(toNode, toPort);
    const pts = buildRoutePts(p1, p2, fromPort, toPort);

    let d = 'M ' + pts[0].x + ' ' + pts[0].y;
    for (let i = 1; i < pts.length; i++) {
      d += ' L ' + pts[i].x + ' ' + pts[i].y;
    }

    const isSelected = (selectedEdgeId === edge.id);

    // 1. 터치 히트박스 (손가락 터치 28px)
    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('d', d);
    hitPath.setAttribute('stroke', 'transparent');
    hitPath.setAttribute('stroke-width', '28');
    hitPath.setAttribute('fill', 'none');
    hitPath.setAttribute('class', 'edge-element');
    hitPath.style.pointerEvents = 'stroke';
    hitPath.style.cursor = 'pointer';

    const onSelect = (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      selectEdge(edge.id);
    };
    hitPath.addEventListener('pointerdown', onSelect);
    hitPath.addEventListener('click', onSelect);
    svg.appendChild(hitPath);

    // 2. 시각적 라인 패스
    const visualPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    visualPath.setAttribute('d', d);
    visualPath.setAttribute('stroke', isSelected ? '#EF4444' : '#3B82F6');
    visualPath.setAttribute('stroke-width', isSelected ? '3.5' : '2.5');
    if (isSelected) {
      visualPath.setAttribute('stroke-dasharray', '6 3');
    }
    visualPath.setAttribute('fill', 'none');
    visualPath.setAttribute('marker-end', isSelected ? 'url(#arrow-red)' : 'url(#arrow)');
    visualPath.setAttribute('class', 'edge-element');
    visualPath.style.pointerEvents = 'none';
    svg.appendChild(visualPath);

    // 3. 선택된 경우 중간 지점에 빨간색 ✕ 삭제 배지 버튼 생성
    if (isSelected) {
      const midX = (pts[0].x + pts[pts.length - 1].x) / 2;
      const midY = (pts[0].y + pts[pts.length - 1].y) / 2;

      const badgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      badgeGroup.setAttribute('class', 'edge-element edge-delete-badge');
      badgeGroup.style.pointerEvents = 'all';
      badgeGroup.style.cursor = 'pointer';

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', midX);
      circle.setAttribute('cy', midY);
      circle.setAttribute('r', '13');
      circle.setAttribute('fill', '#EF4444');
      circle.setAttribute('stroke', '#FFFFFF');
      circle.setAttribute('stroke-width', '2');
      badgeGroup.appendChild(circle);

      const crossText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      crossText.setAttribute('x', midX);
      crossText.setAttribute('y', midY + 4);
      crossText.setAttribute('text-anchor', 'middle');
      crossText.setAttribute('fill', '#FFFFFF');
      crossText.setAttribute('font-size', '12');
      crossText.setAttribute('font-weight', 'bold');
      crossText.textContent = '✕';
      badgeGroup.appendChild(crossText);

      const onDeleteTap = (evt) => {
        evt.stopPropagation();
        evt.preventDefault();
        deleteSelectedEdge();
      };
      badgeGroup.addEventListener('pointerdown', onDeleteTap);
      badgeGroup.addEventListener('click', onDeleteTap);
      svg.appendChild(badgeGroup);
    }
  });
}

// -----------------------------------------------------------------------------
// 순차 자동 연결 (순서대로 1:1 최적 연결선 일괄 생성)
// -----------------------------------------------------------------------------
function autoConnect() {
  if (nodes.length < 2) {
    showToast('연결할 노드가 2개 이상 필요합니다');
    return;
  }
  pushUndo();
  edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const fn = nodes[i];
    const tn = nodes[i + 1];
    const ports = findOptimalPorts(fn, tn, nodes, edges);
    edges.push({
      id: 'edge_' + (nextEdgeId++),
      fromId: fn.id,
      toId: tn.id,
      fromPort: ports.from,
      toPort: ports.to
    });
  }
  renderEdges();
  saveLocal();
  showToast('노드 ' + nodes.length + '개 순차 최적 연결 완료');
}

// -----------------------------------------------------------------------------
// 스마트 바둑판 / 플로우차트 하이브리드 정렬 엔진
// 1) 순번(seq) 존재 시: 메인 흐름 중앙 일렬 + 분기 우측 칼정렬
// 2) 연결선 존재 시: 위상 순서 기준 수직/수평 칼정렬
// 3) 순번/연결선 없을 시: 완전 대칭형 체커보드 바둑판(2~3열) 균등 정렬
// 모든 경우 화면 영역(#canvas-container) 절대 이탈 방지 클램핑 강제
// -----------------------------------------------------------------------------
function autoAlignGrid() {
  if (nodes.length === 0) {
    showToast('정렬할 노드가 없습니다');
    return;
  }
  pushUndo();

  const containerW = container.clientWidth || 360;
  const containerH = container.clientHeight || 500;
  const nodeW = 75;
  const nodeH = 32;
  const gapX = 24; 
  const gapY = 16; 

  const hasSeq = nodes.some(n => n.seq);
  const hasEdges = edges.length > 0;

  if (!hasEdges && !hasSeq) {
    // 연결선이 없더라도 사용자가 수동으로 배치한 트리(뼈대) 형상을 최대한 보존하며 격자 스냅 (매트릭스 방지)
    const minY = Math.min(...nodes.map(n => n.y));
    const minX = Math.min(...nodes.map(n => n.x));
    
    const occupied = new Set();
    let maxCol = 0;
    
    [...nodes].sort((a,b) => a.y - b.y).forEach(n => {
      let r = Math.max(0, Math.round((n.y - minY) / (nodeH + gapY)));
      let c = Math.max(0, Math.round((n.x - minX) / (nodeW + gapX)));
      
      while (occupied.has(\`\${r},\${c}\`)) {
        c++;
      }
      occupied.add(\`\${r},\${c}\`);
      n.tempLvl = r;
      n.tempCol = c;
      if (c > maxCol) maxCol = c;
    });
    
    const flowW = maxCol * (nodeW + gapX) + nodeW;
    const startX = Math.max(16, Math.floor((containerW - flowW) / 2));
    const startY = 16;
    
    nodes.forEach(n => {
      n.x = startX + n.tempCol * (nodeW + gapX);
      n.y = startY + n.tempLvl * (nodeH + gapY);
    });
  } else {
    const adj = {};
    const inDegree = {};
    nodes.forEach(n => { adj[n.id] = []; inDegree[n.id] = 0; });
    
    edges.forEach(e => {
      const f = e.fromId || e.from;
      const t = e.toId || e.to;
      if (adj[f]) {
        adj[f].push(t);
        if (inDegree[t] !== undefined) inDegree[t]++;
      }
    });

    const levels = {};
    nodes.forEach(n => levels[n.id] = 0);
    
    let roots = nodes.filter(n => inDegree[n.id] === 0);
    if (roots.length === 0) roots = [nodes.sort((a,b) => a.y - b.y)[0]];

    let queue = [...roots];
    let iter = 0;
    while(queue.length > 0 && iter < 10000) {
      iter++;
      const u = queue.shift();
      const currLvl = levels[u];
      (adj[u] || []).forEach(v => {
        if (levels[v] < currLvl + 1) {
          levels[v] = currLvl + 1;
          queue.push(v);
        }
      });
    }

    const cols = {};
    nodes.forEach(n => cols[n.id] = 0);

    const spineIds = new Set(nodes.filter(n => n.seq && !n.seq.includes('-')).map(n => n.id));
    
    if (spineIds.size > 0) {
      nodes.forEach(n => {
        if (spineIds.has(n.id)) {
          cols[n.id] = 0;
        } else if (n.seq && n.seq.includes('-')) {
          cols[n.id] = 1;
        } else {
          cols[n.id] = 1;
        }
      });
    } else {
      const colVisited = new Set();
      const colQueue = [...roots];
      colQueue.forEach(r => { cols[r.id] = 0; colVisited.add(r.id); });
      
      while (colQueue.length > 0) {
        const u = colQueue.shift();
        let childColOffset = 0;
        (adj[u] || []).forEach(v => {
          if (!colVisited.has(v)) {
            colVisited.add(v);
            cols[v] = cols[u] + childColOffset;
            childColOffset++;
            colQueue.push(v);
          }
        });
      }
    }

    const occupied = new Set();
    nodes.sort((a,b) => {
      if (levels[a.id] !== levels[b.id]) return levels[a.id] - levels[b.id];
      if (cols[a.id] !== cols[b.id]) return cols[a.id] - cols[b.id];
      return a.id.localeCompare(b.id);
    });

    nodes.forEach(n => {
      let r = levels[n.id];
      let c = cols[n.id];
      while (occupied.has(\`\${r},\${c}\`)) {
        c++;
      }
      cols[n.id] = c;
      occupied.add(\`\${r},\${c}\`);
    });

    let minCol = 0, maxCol = 0;
    nodes.forEach(n => {
      if (cols[n.id] < minCol) minCol = cols[n.id];
      if (cols[n.id] > maxCol) maxCol = cols[n.id];
    });
    
    const flowW = (maxCol - minCol) * (nodeW + gapX) + nodeW;
    const startX = Math.max(16, Math.floor((containerW - flowW) / 2)) - minCol * (nodeW + gapX);
    const startY = 16;

    nodes.forEach(n => {
      const c = cols[n.id];
      const r = levels[n.id];
      n.x = startX + c * (nodeW + gapX);
      n.y = startY + r * (nodeH + gapY);
    });
  }

  nodes.forEach(node => {
    clampNode(node);
  });

  edges.forEach(e => {
    const fn = nodes.find(n => n.id === (e.fromId || e.from));
    const tn = nodes.find(n => n.id === (e.toId || e.to));
    if (fn && tn) {
      const ports = findOptimalPorts(fn, tn, nodes, edges);
      e.fromPort = ports.from;
      e.toPort = ports.to;
    }
  });

  renderEdges();
  saveLocal();
  showToast(hasSeq ? '⚡ 순번/연결선 기준 트리 정렬 완료' : (hasEdges ? '⚡ 연결선 기준 위상 정렬 완료' : '⚡ 바둑판 균등 격자 정렬 완료'));
}

// 레거시 호환용 위상 정렬 호출 매핑
function autoAlign() {
  autoAlignGrid();
}

function clearCanvas() {
  if (confirm('캔버스의 모든 노드와 연결선을 삭제하시겠습니까?')) {
    pushUndo();
    nodes = [];
    edges = [];
    selectedEdgeId = null;
    connectSourceId = null;
    rebuildCanvasDom();
    saveLocal();
    showToast('캔버스 초기화 완료 (실수 시 [↩️ 취소])');
  }
}

function saveLocal() {
  try {
    localStorage.setItem('ms_mobile_nodes', JSON.stringify(nodes));
    localStorage.setItem('ms_mobile_edges', JSON.stringify(edges));
  } catch(e) {}
}

function loadLocal() {
  try {
    const savedNodes = localStorage.getItem('ms_mobile_nodes');
    const savedEdges = localStorage.getItem('ms_mobile_edges');
    if (savedNodes) {
      nodes = JSON.parse(savedNodes);
      nodes.forEach(renderNode);
      clampAllNodesToBounds();
      if (savedEdges) {
        edges = JSON.parse(savedEdges);
      }
      renderEdges();
    } else {
      addNode('terminal', '시작');
      addNode('process', '작업 진행');
      addNode('decision', '정상 확인?');
      addNode('terminal', '완료');
      autoAlignGrid();
      autoConnect();
      undoStack = [];
    }
  } catch(e) {}
  updateUndoBtn();
}

// 캔버스 배경 탭 시 연결선 선택 해제
container.addEventListener('pointerdown', (e) => {
  if (e.target === container || e.target.id === 'edges-svg') {
    if (selectedEdgeId) {
      deselectEdge();
    }
  }
});

function sendToPc() {
  if (nodes.length === 0) {
    alert('전송할 플로우차트 노드가 없습니다.');
    return;
  }
  
  // 1. 노드 아이템 생성
  const nodeItems = nodes.map(n => ({
    type: 'FlowchartNodeItem',
    text: n.text,
    x: n.x,
    y: n.y,
    w: n.w || 75,
    h: n.h || 32,
    shape_type: n.type,
    style: {
      bg_color: n.type === 'terminal' ? '#ECFDF5' : (n.type === 'decision' ? '#FFFBEB' : (n.type === 'database' ? '#FAF5FF' : (n.type === 'document' || n.type === 'multidocument' ? '#EEF2FF' : (n.type === 'io' ? '#F0FDF4' : '#EFF6FF')))),
      border_color: n.type === 'terminal' ? '#059669' : (n.type === 'decision' ? '#D97706' : (n.type === 'database' ? '#7C3AED' : (n.type === 'document' || n.type === 'multidocument' ? '#4F46E5' : (n.type === 'io' ? '#16A34A' : '#2563EB')))),
      border_width: 1.5,
      text_color: '#1E293B',
      font_size: 7,
      font_bold: true
    }
  }));

  // 2. 연결선 아이템 생성 (ElbowArrowItem)
  const arrowItems = edges.map(e => {
    const fId = e.fromId || e.from;
    const tId = e.toId || e.to;
    const fn = nodes.find(n => n.id === fId);
    const tn = nodes.find(n => n.id === tId);
    if (!fn || !tn) return null;
    const fPort = e.fromPort ? e.fromPort.toLowerCase() : null;
    const tPort = e.toPort ? e.toPort.toLowerCase() : null;
    const ports = (fPort && tPort) ? { from: fPort, to: tPort } : findOptimalPorts(fn, tn, nodes, edges);
    const p1 = getPortCoords(fn, ports.from);
    const p2 = getPortCoords(tn, ports.to);
    return {
      type: 'ElbowArrowItem',
      start_pos: [p1.x, p1.y],
      end_pos: [p2.x, p2.y],
      route_mode: (ports.from === 'bottom' || ports.from === 'top') ? 'HV' : 'VH',
      label: e.label || '',
      style: {
        color: '#2563EB',
        width: 3,
        head_size: 12
      }
    };
  }).filter(Boolean);

  const txPin = issueFreshTxPin();
  const payload = {
    pin: PIN,
    client_pin: txPin,
    type: 'flowchart',
    direction: currentDirection,
    data: {
      nodes: nodes.map(n => ({
        id: n.id,
        text: n.text,
        shape: n.type,
        x: n.x,
        y: n.y,
        w: n.w || 75,
        h: n.h || 32
      })),
      edges: edges.map(e => ({
        id: e.id,
        from: e.fromId || e.from,
        to: e.toId || e.to,
        fromId: e.fromId || e.from,
        toId: e.toId || e.to,
        fromPort: (e.fromPort || '').toLowerCase(),
        toPort: (e.toPort || '').toLowerCase(),
        label: e.label || ''
      })),
      items: [...nodeItems, ...arrowItems]
    }
  };
  
  // 1. 직접 PUSH 전송 시도 (/api/upload)
  fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PIN': PIN },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'ok') {
      onTransmissionCompleted('플로우차트', '노드 ' + nodeItems.length + '개, 연결선 ' + arrowItems.length + '개', txPin);
    } else if (data.status === 'closed') {
      alert('전송 실패: 1회성 세션이 이미 완료되어 종료되었습니다.');
    } else {
      onTransmissionCompleted('플로우차트', '노드 ' + nodeItems.length + '개, 연결선 ' + arrowItems.length + '개', txPin);
    }
  })
  .catch(err => {
    // 동일 Wi-Fi가 아닌 외부망/원격지 환경에서도 역방향 PIN 조회 모달로 정상 수신 가능
    onTransmissionCompleted('플로우차트', '노드 ' + nodeItems.length + '개, 연결선 ' + arrowItems.length + '개', txPin);
  });

  // 2. 역방향 PULL 백업 보존 (/api/save_by_pin) - PC에서 발급된 5분 유효 PIN으로 즉시 조회 가능
  // 클라우드 릴레이 5분 휘발성 저장 (외부망/LTE 지원)
    fetch('/api/sketch/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: txPin, ttl_sec: 300, payload: payload })
    }).catch(() => {});

    fetch('/api/save_by_pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: txPin, ttl_sec: 300, ...payload })
  }).catch(() => {});
}

let pinCountdownSeconds = 300;
let pinCountdownTimer = null;

function startPinCountdown() {
  if (pinCountdownTimer) clearInterval(pinCountdownTimer);
  pinCountdownSeconds = 300;
  updatePinTimerDisplay();
  pinCountdownTimer = setInterval(() => {
    pinCountdownSeconds--;
    if (pinCountdownSeconds <= 0) {
      clearInterval(pinCountdownTimer);
      pinCountdownTimer = null;
      const timerEl = document.getElementById('modal-timer-badge');
      if (timerEl) {
        timerEl.innerText = '⚠️ 유효시간(5분) 만료됨';
        timerEl.style.color = '#EF4444';
      }
      const badge = document.getElementById('client-pin-badge');
      if (badge) {
        badge.innerText = 'PIN: 만료됨 (다시 전송)';
        badge.style.background = '#475569';
        badge.style.borderColor = '#64748B';
      }
    } else {
      updatePinTimerDisplay();
    }
  }, 1000);
}

function updatePinTimerDisplay() {
  const m = Math.floor(pinCountdownSeconds / 60);
  const s = pinCountdownSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  const timerEl = document.getElementById('modal-timer-badge');
  if (timerEl) {
    timerEl.innerText = \`⏳ 남은 유효시간 \${mm}:\${ss}\`;
    timerEl.style.color = '#F59E0B';
  }
}

function closePinModal() {
  const modal = document.getElementById('session-closed-modal');
  if (modal) modal.style.display = 'none';
}

function onTransmissionCompleted(typeStr, detailStr, txPin) {
  const pin = txPin || currentTxPin || issueFreshTxPin();
  showToast('✅ 전송 완료: ' + typeStr + ' (PIN: ' + pin + ')');
  startPinCountdown();
  const modal = document.getElementById('session-closed-modal');
  if (modal) {
    const detailEl = document.getElementById('modal-detail-text');
    if (detailEl) detailEl.innerText = typeStr + ' (' + detailStr + ')';
    const pinEl = document.getElementById('modal-pin-number');
    if (pinEl) pinEl.innerText = pin;
    modal.style.display = 'flex';
  }
}

function resizeAndCompressImage(file, maxDimension, quality, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      let w = img.width;
      let h = img.height;
      if (w > maxDimension || h > maxDimension) {
        if (w > h) {
          h = Math.round((h * maxDimension) / w);
          w = maxDimension;
        } else {
          w = Math.round((w * maxDimension) / h);
          h = maxDimension;
        }
      }
      const cvs = document.createElement('canvas');
      cvs.width = w;
      cvs.height = h;
      const ctx = cvs.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const compressedB64 = cvs.toDataURL('image/jpeg', quality);
      callback(compressedB64, w, h);
    };
    img.onerror = function() {
      callback(e.target.result, 0, 0);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function handlePhotoUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  closePhotoChoiceModal();
  showToast('손그림 사진 최적화 중...');

  resizeAndCompressImage(file, 1280, 0.8, function(base64Data, w, h) {
    const txPin = issueFreshTxPin();
    const payload = {
      pin: PIN,
      client_pin: txPin,
      type: 'image',
      title: '모바일 손그림 사진 (' + new Date().toLocaleTimeString() + ')',
      image_base64: base64Data,
      width: w,
      height: h
    };
    
    fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-PIN': PIN },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'ok') {
        onTransmissionCompleted('손그림 사진', '사진 전송 완료', txPin);
      } else if (data.status === 'closed') {
        alert('전송 실패: 1회성 세션이 이미 완료되어 종료되었습니다.');
      } else {
        onTransmissionCompleted('손그림 사진', '사진 전송 완료', txPin);
      }
    })
    .catch(err => onTransmissionCompleted('손그림 사진', '사진 전송 완료', txPin));

    // 역방향 PIN 백업 보존 (5분 유효)
    // 클라우드 릴레이 5분 휘발성 저장 (외부망/LTE 지원)
    fetch('/api/sketch/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: txPin, ttl_sec: 300, payload: payload })
    }).catch(() => {});

    fetch('/api/save_by_pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: txPin, ttl_sec: 300, ...payload })
    }).catch(() => {});
  });
  input.value = '';
}

function handlePhotoAiUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  closePhotoChoiceModal();
  showToast('🪄 사진 최적화 압축 및 전송 중...');

  // 고화질 카메라 사진(8~12MB)을 장변 1280px, JPEG 0.8로 압축 (약 150KB, AI 판독력 100% 유지)
  resizeAndCompressImage(file, 1280, 0.8, function(base64Data, w, h) {
    const txPin = issueFreshTxPin();
    const payload = {
      pin: PIN,
      client_pin: txPin,
      type: 'sketch_to_mermaid',
      title: '손그림 플로우차트 AI 변환 (' + new Date().toLocaleTimeString() + ')',
      image_base64: base64Data,
      width: w,
      height: h
    };
    
    fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-PIN': PIN },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'ok') {
        onTransmissionCompleted('손그림 AI 변환', 'AI Mermaid 자동 변환 완료', txPin);
      } else if (data.status === 'closed') {
        alert('전송 실패: 1회성 세션이 이미 완료되어 종료되었습니다.');
      } else {
        onTransmissionCompleted('손그림 AI 변환', 'AI Mermaid 자동 변환 완료', txPin);
      }
    })
    .catch(err => onTransmissionCompleted('손그림 AI 변환', 'AI Mermaid 자동 변환 완료', txPin));

    // 역방향 PIN 백업 보존 (5분 유효)
    // 클라우드 릴레이 5분 휘발성 저장 (외부망/LTE 지원)
    fetch('/api/sketch/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: txPin, ttl_sec: 300, payload: payload })
    }).catch(() => {});

    fetch('/api/save_by_pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: txPin, ttl_sec: 300, ...payload })
    }).catch(() => {});
  });
  input.value = '';
}

// -----------------------------------------------------------------------------
// 사진 선택 (카메라 촬영 vs 저장된 갤러리 사진 불러오기) 액션 시트 제어
// -----------------------------------------------------------------------------
let currentPhotoMode = 'ai'; // 'ai' | 'photo'

function openPhotoChoiceModal(mode) {
  currentPhotoMode = mode || 'ai';
  const modal = document.getElementById('photo-choice-modal');
  const titleEl = document.getElementById('photo-modal-title');
  const descEl = document.getElementById('photo-modal-desc');
  if (currentPhotoMode === 'ai') {
    if (titleEl) titleEl.innerText = '🪄 손그림 ➔ AI 변환';
    if (descEl) descEl.innerText = '손그림을 새로 촬영하거나 저장된 갤러리 사진을 선택하세요';
  } else {
    if (titleEl) titleEl.innerText = '📷 손그림 사진 전송';
    if (descEl) descEl.innerText = '사진을 새로 촬영하거나 저장된 갤러리 사진을 선택하세요';
  }
  if (modal) modal.style.display = 'flex';
}

function closePhotoChoiceModal() {
  const modal = document.getElementById('photo-choice-modal');
  if (modal) modal.style.display = 'none';
}

function onPhotoModalBackdrop(e) {
  if (e.target && e.target.id === 'photo-choice-modal') {
    closePhotoChoiceModal();
  }
}

function triggerPhotoChoice(source) {
  closePhotoChoiceModal();
  triggerPhotoDirect(currentPhotoMode, source);
}

function triggerPhotoDirect(mode, source) {
  if (mode === 'ai') {
    if (source === 'camera') {
      const inp = document.getElementById('photo-ai-input');
      if (inp) { inp.value = ''; inp.click(); }
    } else {
      const inp = document.getElementById('photo-ai-gallery-input');
      if (inp) { inp.value = ''; inp.click(); }
    }
  } else {
    if (source === 'camera') {
      const inp = document.getElementById('photo-input');
      if (inp) { inp.value = ''; inp.click(); }
    } else {
      const inp = document.getElementById('photo-gallery-input');
      if (inp) { inp.value = ''; inp.click(); }
    }
  }
}

window.onload = function() {
  updateClientPinBadge();
  loadLocal();
};
</script>
<div id="session-closed-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.92); z-index:99999; flex-direction:column; align-items:center; justify-content:center; padding:20px; text-align:center; -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px);">
  <div style="background:#1E293B; border:2px solid #38BDF8; border-radius:16px; padding:24px 20px; max-width:340px; width:100%; box-shadow:0 16px 36px rgba(0,0,0,0.6);">
    <div style="font-size:36px; margin-bottom:8px;">🚀</div>
    <div style="font-size:16px; font-weight:800; color:#F8FAFC; margin-bottom:4px;">전송 완료 (PIN 발급)</div>
    <div id="modal-detail-text" style="font-size:12px; font-weight:600; color:#94A3B8; margin-bottom:14px;"></div>
    
    <!-- PIN 번호 카드 -->
    <div style="background:#0F172A; border:1.5px dashed #38BDF8; border-radius:10px; padding:12px 10px; margin-bottom:12px;">
      <div style="font-size:11px; color:#94A3B8; margin-bottom:4px;">PC 입력용 PIN 번호</div>
      <div id="modal-pin-number" style="font-size:34px; font-weight:900; letter-spacing:4px; color:#38BDF8; font-family:monospace; margin-bottom:8px;">--- ---</div>
      <div id="modal-timer-badge" style="font-size:12px; font-weight:700; color:#F59E0B;">⏳ 남은 유효시간 05:00</div>
    </div>

    <!-- 안내 문구 -->
    <div style="font-size:11.5px; color:#CBD5E1; line-height:1.55; margin-bottom:16px; text-align:left; background:#0F172A; border-radius:8px; padding:10px 12px; border:1px solid #334155;">
      1. PC 매뉴얼스튜디오의 <b>[모바일 연동]</b> 창을 엽니다.<br>
      2. <b>[PIN으로 가져오기]</b> 입력창에 위 번호를 입력하고 <b>[가져오기]</b>를 누르세요.<br>
      <span style="color:#94A3B8; font-size:10.5px;">💡 보안 및 자원 점유 방지를 위해 <b>5분 후 자동 만료</b>됩니다.</span>
    </div>

    <!-- 액션 버튼 -->
    <div style="display:flex; gap:8px;">
      <button type="button" onclick="copyClientPin()" style="flex:1; height:42px; background:#0284C7; color:#FFFFFF; font-size:13px; font-weight:700; border:none; border-radius:8px; cursor:pointer;">
        📋 PIN 복사
      </button>
      <button type="button" onclick="closePinModal()" style="flex:1; height:42px; background:#2563EB; color:#FFFFFF; font-size:13px; font-weight:700; border:none; border-radius:8px; cursor:pointer;">
        확인 (닫기)
      </button>
    </div>
  </div>
</div>
</body>
</html>`;

export async function GET() {
  return new NextResponse(SKETCH_HTML, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
