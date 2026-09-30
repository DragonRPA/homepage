"use client";

import React, { useEffect, useRef } from "react";

export default function MobileSketchPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 모바일 터치 및 동적 스크립트 구동
    const initApp = () => {
      // 1. 전송 PIN 발급 및 상태 관리
      let currentTxPin: string | null = null;
      let pinCountdownTimer: any = null;
      let pinCountdownSeconds = 300;

      const issueFreshTxPin = (): string => {
        const raw = Math.floor(100000 + Math.random() * 900000).toString();
        currentTxPin = raw.slice(0, 3) + "-" + raw.slice(3);
        updateClientPinBadge();
        return currentTxPin;
      };

      const updateClientPinBadge = () => {
        const badge = document.getElementById("client-pin-badge");
        if (badge) {
          if (currentTxPin) {
            badge.innerText = "PIN: " + currentTxPin;
            badge.style.background = "#0369A1";
            badge.style.borderColor = "#38BDF8";
          } else {
            badge.innerText = "PIN: 전송 시 발행";
            badge.style.background = "#334155";
            badge.style.borderColor = "#64748B";
          }
        }
      };

      const showToast = (msg: string) => {
        const toast = document.getElementById("toast");
        if (!toast) return;
        toast.innerText = msg;
        toast.style.opacity = "1";
        setTimeout(() => {
          toast.style.opacity = "0";
        }, 2200);
      };

      // 2. 캔버스 상태
      interface FlowNode {
        id: string;
        type: string;
        text: string;
        x: number;
        y: number;
        w: number;
        h: number;
        seq?: string;
        _assignedAt?: number;
      }

      interface FlowEdge {
        id: string;
        from: string;
        to: string;
        fromId: string;
        toId: string;
        fromPort?: string;
        toPort?: string;
        label?: string;
        type?: string;
      }

      let nodes: FlowNode[] = [];
      let edges: FlowEdge[] = [];
      let nextId = 1;
      let nextEdgeId = 1;
      let isConnectMode = false;
      let isSeqMode = false;
      let isBranchMode = false;
      let branchOriginNodeId: string | null = null;
      let connectSourceId: string | null = null;
      let selectedEdgeId: string | null = null;
      const currentDirection = "TD";
      let undoStack: string[] = [];

      let lastSeqTapTime = 0;
      let lastTouchEndTime = 0;

      const container = document.getElementById("canvas-container");
      if (!container) return;

      const pushUndo = () => {
        undoStack.push(JSON.stringify({ nodes, edges }));
        if (undoStack.length > 30) undoStack.shift();
        updateUndoBtn();
      };

      const updateUndoBtn = () => {
        const btn = document.getElementById("btn-undo");
        if (btn) {
          if (undoStack.length > 0) {
            btn.classList.remove("btn-disabled");
          } else {
            btn.classList.add("btn-disabled");
          }
        }
      };

      const undo = () => {
        if (undoStack.length === 0) return;
        const stateStr = undoStack.pop();
        if (stateStr) {
          try {
            const state = JSON.parse(stateStr);
            nodes = state.nodes || [];
            edges = state.edges || [];
            selectedEdgeId = null;
            connectSourceId = null;
            branchOriginNodeId = null;
            rebuildCanvasDom();
            saveLocal();
            showToast("실행 취소 완료");
          } catch (e) {}
        }
        updateUndoBtn();
      };

      const getNodeShapeSvg = (type: string, w: number, h: number): string => {
        if (type === "terminal") {
          const rx = Math.min(w, h) / 2;
          return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${rx}" ry="${rx}" fill="#ECFDF5" stroke="#059669" stroke-width="1.5"/>`;
        }
        if (type === "decision") {
          return `<polygon points="${w / 2},1.5 ${w - 1.5},${h / 2} ${w / 2},${h - 1.5} 1.5,${h / 2}" fill="#FFFBEB" stroke="#D97706" stroke-width="1.5"/>`;
        }
        if (type === "io") {
          const skew = Math.round(w * 0.16);
          return `<polygon points="${skew},1.5 ${w - 1.5},1.5 ${w - skew},${h - 1.5} 1.5,${h - 1.5}" fill="#F0FDF4" stroke="#16A34A" stroke-width="1.5"/>`;
        }
        if (type === "database") {
          const capH = Math.min(7, Math.max(4, Math.round(h * 0.2)));
          const rx = (w - 2) / 2;
          const cx = w / 2;
          const cy = capH + 1;
          const by = h - capH - 1;
          return `
            <path d="M 1,${cy} L 1,${by} A ${rx} ${capH} 0 0 0 ${w - 1},${by} L ${w - 1},${cy} A ${rx} ${capH} 0 0 1 1,${cy} Z" fill="#FAF5FF" stroke="#7C3AED" stroke-width="1.5"/>
            <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${capH}" fill="#FAF5FF" stroke="#7C3AED" stroke-width="1.5"/>
          `;
        }
        if (type === "document") {
          const waveH = Math.max(6, Math.min(10, Math.round(h * 0.25)));
          const y_r = h - waveH * 0.7;
          const y_l = h - waveH * 0.2;
          return `<path d="M 1.5,1.5 L ${w - 1.5},1.5 L ${w - 1.5},${y_r} C ${w - w * 0.28},${y_r + waveH * 0.1} ${w * 0.38},${h + waveH * 0.15} 1.5,${y_l} Z" fill="#EEF2FF" stroke="#4F46E5" stroke-width="1.5"/>`;
        }
        if (type === "multidocument") {
          const waveH = Math.max(5, Math.min(8, Math.round(h * 0.22)));
          const y_r = h - waveH * 0.7;
          const y_l = h - waveH * 0.2;
          return `
            <path d="M 5.5,0.5 L ${w - 0.5},0.5 L ${w - 0.5},${y_r - 4} C ${w - w * 0.28},${y_r - 4 + waveH * 0.1} ${w * 0.38},${h - 4 + waveH * 0.15} 5.5,${y_l - 4} Z" fill="#EEF2FF" stroke="#A5B4FC" stroke-width="1.2"/>
            <path d="M 3.5,2.5 L ${w - 1.5},2.5 L ${w - 1.5},${y_r - 2} C ${w - w * 0.28},${y_r - 2 + waveH * 0.1} ${w * 0.38},${h - 2 + waveH * 0.15} 3.5,${y_l - 2} Z" fill="#EEF2FF" stroke="#818CF8" stroke-width="1.2"/>
            <path d="M 1.5,4.5 L ${w - 3.5},4.5 L ${w - 3.5},${y_r} C ${w - 2 - w * 0.28},${y_r + waveH * 0.1} ${w * 0.38},${h + waveH * 0.15} 1.5,${y_l} Z" fill="#EEF2FF" stroke="#4F46E5" stroke-width="1.5"/>
          `;
        }
        // 기본 process (사각형)
        return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="4" ry="4" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5"/>`;
      };

      const getNodeBounds = (nodeW: number, nodeH: number) => {
        const cw = container.clientWidth || window.innerWidth;
        const ch = container.clientHeight || window.innerHeight - 85;
        const margin = 10;
        return {
          minX: margin,
          minY: margin,
          maxX: Math.max(margin, cw - nodeW - margin),
          maxY: Math.max(margin, ch - nodeH - margin),
        };
      };

      const clampNode = (node: FlowNode) => {
        const w = node.w || 75;
        const h = node.h || 32;
        const bounds = getNodeBounds(w, h);
        node.x = Math.min(bounds.maxX, Math.max(bounds.minX, node.x));
        node.y = Math.min(bounds.maxY, Math.max(bounds.minY, node.y));
        const el = document.getElementById(node.id);
        if (el) {
          el.style.left = node.x + "px";
          el.style.top = node.y + "px";
        }
      };

      const clampAllNodesToBounds = () => {
        if (!nodes || nodes.length === 0) return;
        nodes.forEach(clampNode);
        renderEdges();
      };

      const getPortCoords = (node: FlowNode, port?: string) => {
        const el = document.getElementById(node.id);
        const w = el && el.offsetWidth ? el.offsetWidth : node.w || 75;
        const h = el && el.offsetHeight ? el.offsetHeight : node.h || 32;
        const p = (port || "").toLowerCase();

        if (node.type === "io") {
          const skew = Math.round(w * 0.16);
          if (p === "top") return { x: node.x + (w + skew) / 2, y: node.y };
          if (p === "bottom") return { x: node.x + (w - skew) / 2, y: node.y + h };
          if (p === "left") return { x: node.x + skew / 2, y: node.y + h / 2 };
          return { x: node.x + w - skew / 2, y: node.y + h / 2 };
        }

        if (p === "top") return { x: node.x + w / 2, y: node.y };
        if (p === "bottom") return { x: node.x + w / 2, y: node.y + h };
        if (p === "left") return { x: node.x, y: node.y + h / 2 };
        return { x: node.x + w, y: node.y + h / 2 };
      };

      const segmentIntersectsRect = (
        p1: { x: number; y: number },
        p2: { x: number; y: number },
        left: number,
        top: number,
        right: number,
        bottom: number
      ) => {
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
      };

      const countNodeHits = (pts: { x: number; y: number }[], obstacles: FlowNode[]) => {
        let hits = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          const p1 = pts[i];
          const p2 = pts[i + 1];
          for (const obs of obstacles) {
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
      };

      const buildRoutePts = (
        start: { x: number; y: number },
        end: { x: number; y: number },
        sp: string,
        dp: string
      ) => {
        if (sp === "top" || sp === "bottom") {
          if (dp === "top" || dp === "bottom") {
            const midY = (start.y + end.y) / 2;
            return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
          } else {
            return [start, { x: start.x, y: end.y }, end];
          }
        } else {
          if (dp === "left" || dp === "right") {
            const midX = (start.x + end.x) / 2;
            return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
          } else {
            return [start, { x: end.x, y: start.y }, end];
          }
        }
      };

      const calcPathLen = (pts: { x: number; y: number }[]) => {
        let total = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
        }
        return total;
      };

      const findOptimalPorts = (
        fromNode: FlowNode,
        toNode: FlowNode,
        allNodes: FlowNode[],
        existingEdges: FlowEdge[]
      ) => {
        const srcPorts = ["top", "bottom", "left", "right"];
        const dstPorts = ["top", "bottom", "left", "right"];

        const srcUsedOut = new Set<string>();
        const srcUsedIn = new Set<string>();
        const dstUsedIn = new Set<string>();
        const dstUsedOut = new Set<string>();

        (existingEdges || []).forEach((e) => {
          const fId = e.fromId || e.from;
          const tId = e.toId || e.to;
          const fp = (e.fromPort || "").toLowerCase();
          const tp = (e.toPort || "").toLowerCase();
          if (fId === fromNode.id && fp) srcUsedOut.add(fp);
          if (tId === fromNode.id && tp) srcUsedIn.add(tp);
          if (tId === toNode.id && tp) dstUsedIn.add(tp);
          if (fId === toNode.id && fp) dstUsedOut.add(fp);
        });

        const obstacles = (allNodes || []).filter((n) => n.id !== fromNode.id && n.id !== toNode.id);

        let bestSp = "bottom";
        let bestDp = "top";
        let minCost = Infinity;

        for (const sp of srcPorts) {
          for (const dp of dstPorts) {
            const start = getPortCoords(fromNode, sp);
            const end = getPortCoords(toNode, dp);

            let occupancyPenalty = 0;
            if (srcUsedOut.has(sp)) occupancyPenalty += 2000000;
            if (srcUsedIn.has(sp)) occupancyPenalty += 1000000;
            if (dstUsedIn.has(dp)) occupancyPenalty += 2000000;
            if (dstUsedOut.has(dp)) occupancyPenalty += 1000000;

            const pts = buildRoutePts(start, end, sp, dp);
            const nodeHits = countNodeHits(pts, obstacles);
            const bends = Math.max(0, pts.length - 2);
            const pathLen = calcPathLen(pts);

            let alignHint = 0;
            if (currentDirection === "TD") {
              if (sp === "bottom" && dp === "top" && end.y >= start.y) alignHint -= 80;
            } else {
              if (sp === "right" && dp === "left" && end.x >= start.x) alignHint -= 80;
            }

            const cost = nodeHits * 1000000 + occupancyPenalty + bends * 400 + pathLen + alignHint;

            if (cost < minCost) {
              minCost = cost;
              bestSp = sp;
              bestDp = dp;
            }
          }
        }

        return { from: bestSp, to: bestDp };
      };

      const selectEdge = (edgeId: string) => {
        selectedEdgeId = edgeId;
        renderEdges();
        const banner = document.getElementById("mode-banner");
        const bannerText = document.getElementById("mode-banner-text");
        if (banner && bannerText) {
          banner.classList.add("connect-active");
          const e = edges.find((item) => item.id === edgeId);
          const fn = e ? nodes.find((n) => n.id === (e.fromId || e.from)) : null;
          const tn = e ? nodes.find((n) => n.id === (e.toId || e.to)) : null;
          const label = fn && tn ? `"${fn.text}" ➔ "${tn.text}"` : "연결선";
          bannerText.innerHTML = `선택: ${label} <button class="btn btn-sm btn-danger" id="btn-del-sel-edge" style="margin-left:6px;">🗑️ 삭제</button> <button class="btn btn-sm btn-secondary" id="btn-cancel-sel-edge" style="margin-left:4px;">취소</button>`;
          document.getElementById("btn-del-sel-edge")?.addEventListener("click", deleteSelectedEdge);
          document.getElementById("btn-cancel-sel-edge")?.addEventListener("click", deselectEdge);
        }
        showToast("연결선 선택됨 (빨간색 ✕ 터치 시 삭제)");
      };

      const deselectEdge = () => {
        selectedEdgeId = null;
        renderEdges();
        const banner = document.getElementById("mode-banner");
        const bannerText = document.getElementById("mode-banner-text");
        if (banner && bannerText) {
          if (!isConnectMode) {
            banner.classList.remove("connect-active");
            bannerText.innerText = "이동 및 편집 모드 (노드 드래그 이동 / 더블탭 수정)";
          }
        }
      };

      const deleteSelectedEdge = () => {
        if (!selectedEdgeId) return;
        pushUndo();
        edges = edges.filter((e) => e.id !== selectedEdgeId);
        selectedEdgeId = null;
        renderEdges();
        saveLocal();
        showToast("선택한 연결선 삭제 완료");
        deselectEdge();
      };

      const handleDeleteEdgeClick = () => {
        if (selectedEdgeId) {
          deleteSelectedEdge();
        } else if (edges.length > 0) {
          if (confirm("모든 연결선을 삭제하시겠습니까? (개별 삭제는 선을 터치하세요)")) {
            pushUndo();
            edges = [];
            renderEdges();
            saveLocal();
            showToast("모든 연결선 삭제 완료");
          }
        } else {
          showToast("삭제할 연결선이 없습니다");
        }
      };

      const renderEdges = () => {
        const svg = document.getElementById("edges-svg");
        if (!svg) return;
        const oldPaths = svg.querySelectorAll(".edge-element");
        oldPaths.forEach((p) => p.remove());

        edges.forEach((edge) => {
          const fId = edge.fromId || edge.from;
          const tId = edge.toId || edge.to;
          const fromNode = nodes.find((n) => n.id === fId);
          const toNode = nodes.find((n) => n.id === tId);
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

          let d = "M " + pts[0].x + " " + pts[0].y;
          for (let i = 1; i < pts.length; i++) {
            d += " L " + pts[i].x + " " + pts[i].y;
          }

          const isSelected = selectedEdgeId === edge.id;

          // 1. 투명 히트박스 경로 (모바일 터치 타겟 28px)
          const hitPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          hitPath.setAttribute("class", "edge-element");
          hitPath.setAttribute("d", d);
          hitPath.setAttribute("fill", "none");
          hitPath.setAttribute("stroke", "transparent");
          hitPath.setAttribute("stroke-width", "28");
          hitPath.setAttribute("stroke-linecap", "round");
          hitPath.setAttribute("stroke-linejoin", "round");
          hitPath.style.cursor = "pointer";
          hitPath.addEventListener("click", (e) => {
            e.stopPropagation();
            selectEdge(edge.id);
          });
          svg.appendChild(hitPath);

          // 2. 가시적 연결선 경로
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("class", "edge-element");
          path.setAttribute("d", d);
          path.setAttribute("fill", "none");
          path.setAttribute("stroke", isSelected ? "#EF4444" : "#3B82F6");
          path.setAttribute("stroke-width", isSelected ? "3.5" : "2.2");
          path.setAttribute("marker-end", isSelected ? "url(#arrow-red)" : "url(#arrow)");
          path.style.cursor = "pointer";
          path.addEventListener("click", (e) => {
            e.stopPropagation();
            selectEdge(edge.id);
          });
          svg.appendChild(path);

          // 3. 선택된 선의 중앙에 빨간색 ✕ 삭제 버튼 배지 표출
          if (isSelected && pts.length >= 2) {
            const midIdx = Math.floor((pts.length - 1) / 2);
            const mx = (pts[midIdx].x + pts[midIdx + 1].x) / 2;
            const my = (pts[midIdx].y + pts[midIdx + 1].y) / 2;

            const badgeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            badgeGroup.setAttribute("class", "edge-element edge-delete-badge");
            badgeGroup.setAttribute("transform", `translate(${mx}, ${my})`);

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("r", "12");
            circle.setAttribute("fill", "#EF4444");
            circle.setAttribute("stroke", "#FFFFFF");
            circle.setAttribute("stroke-width", "2");

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("dy", "4");
            text.setAttribute("fill", "#FFFFFF");
            text.setAttribute("font-size", "13");
            text.setAttribute("font-weight", "bold");
            text.textContent = "✕";

            badgeGroup.appendChild(circle);
            badgeGroup.appendChild(text);

            badgeGroup.addEventListener("click", (e) => {
              e.stopPropagation();
              deleteSelectedEdge();
            });

            svg.appendChild(badgeGroup);
          }
        });
      };

      const updateNodeVisuals = () => {
        nodes.forEach((n) => {
          const el = document.getElementById(n.id);
          if (el) {
            if (connectSourceId === n.id) {
              el.classList.add("connect-source");
            } else {
              el.classList.remove("connect-source");
            }
            if (isBranchMode && branchOriginNodeId === n.id) {
              el.classList.add("branch-origin");
            } else {
              el.classList.remove("branch-origin");
            }
          }
        });
      };

      const handleNodeConnectTap = (node: FlowNode) => {
        if (!connectSourceId) {
          connectSourceId = node.id;
          updateNodeVisuals();
          const bannerText = document.getElementById("mode-banner-text");
          if (bannerText) bannerText.innerText = "🔗 대상 노드를 터치하면 최적 경로로 자동 연결됩니다";
          showToast("연결할 대상 노드를 터치하세요");
        } else {
          if (connectSourceId !== node.id) {
            const fromNode = nodes.find((n) => n.id === connectSourceId);
            const toNode = node;
            const existing = edges.find(
              (e) =>
                (e.fromId === connectSourceId || e.from === connectSourceId) &&
                (e.toId === node.id || e.to === node.id)
            );
            if (!existing && fromNode && toNode) {
              pushUndo();
              const ports = findOptimalPorts(fromNode, toNode, nodes, edges);
              edges.push({
                id: "edge_" + nextEdgeId++,
                from: connectSourceId,
                to: node.id,
                fromId: connectSourceId,
                toId: node.id,
                fromPort: ports.from,
                toPort: ports.to,
                type: "ElbowArrowItem",
              });
              renderEdges();
              saveLocal();
              showToast("최적 연결선 자동 생성 완료");
            } else if (existing) {
              showToast("이미 연결된 노드입니다");
            }
          }
          connectSourceId = null;
          updateNodeVisuals();
          const bannerText = document.getElementById("mode-banner-text");
          if (bannerText) bannerText.innerText = "🔗 연결선 모드: 다음 시작 노드를 터치하세요";
        }
      };

      const handleNodeSeqTap = (node: FlowNode, e?: any) => {
        if (e) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
        }
        const now = Date.now();
        if (now - lastSeqTapTime < 250) {
          return;
        }
        lastSeqTapTime = now;

        // [1. 분기 모드(isBranchMode)일 때]
        if (isBranchMode) {
          if (!branchOriginNodeId) {
            if (node.seq && !node.seq.includes("-")) {
              branchOriginNodeId = node.id;
              updateSeqModeUI();
              rebuildCanvasDom();
              showToast(`🔀 분기 기준 [${node.seq}] 지정됨 (다음: 빈 노드 탭 ➔ ${node.seq}-1, ${node.seq}-2...)`);
            } else {
              showToast("⚠️ 먼저 분기 기준이 될 메인 번호(1, 2, 3...) 노드를 터치하세요.");
            }
            return;
          }

          const originNode = nodes.find((n) => n.id === branchOriginNodeId && n.seq);
          if (!originNode) {
            branchOriginNodeId = null;
            updateSeqModeUI();
            showToast("⚠️ 분기 기준 노드가 유효하지 않습니다. 다시 기준 노드를 터치하세요.");
            return;
          }
          const basePrefix = originNode.seq;

          if (!node.seq) {
            const branchNodes = nodes.filter((n) => n.seq && n.seq.startsWith(basePrefix + "-"));
            const existingIndices = branchNodes
              .map((n) => parseInt(n.seq!.substring(basePrefix!.length + 1), 10))
              .filter((n) => !isNaN(n));
            const nextSub = existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 1;

            pushUndo();
            node._assignedAt = now;
            node.seq = `${basePrefix}-${nextSub}`;
            rebuildCanvasDom();
            saveLocal();
            updateSeqModeUI();
            showToast(`분기 순번 [${node.seq}] 부여됨 (종료 시: 합류할 번호 다이어그램 탭)`);
            return;
          }

          if (!node.seq.includes("-")) {
            branchOriginNodeId = null;
            isBranchMode = false;
            updateSeqModeUI();
            rebuildCanvasDom();
            showToast(`🔀 분기 종료: [${node.seq}]번 노드로 합류 완료 (순번 모드 복귀)`);
            return;
          } else {
            showToast(`이미 분기 번호 [${node.seq}]가 부여된 노드입니다.`);
            return;
          }
        }

        // [2. 일반 순번 모드(1, 2, 3...)]
        const mainNodes = nodes.filter((n) => n.seq && !n.seq.includes("-"));
        const existingNums = mainNodes.map((n) => parseInt(n.seq!, 10)).filter((n) => !isNaN(n));
        const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;

        pushUndo();
        node._assignedAt = now;
        node.seq = String(nextNum);
        rebuildCanvasDom();
        saveLocal();
        showToast(`순번 [${node.seq}] 부여됨 (이어서 다음 노드를 탭하세요)`);
      };

      const toggleSeqMode = () => {
        isSeqMode = !isSeqMode;
        if (isSeqMode) {
          isConnectMode = false;
          connectSourceId = null;
          showToast("🔢 순번 지정 모드: 노드를 차례로 탭하세요");
        }
        updateSeqModeUI();
      };

      const toggleBranchMode = () => {
        if (!isSeqMode) isSeqMode = true;
        isBranchMode = !isBranchMode;
        if (isBranchMode) {
          branchOriginNodeId = null;
          showToast("🔀 분기 모드: 기준이 될 번호 노드를 먼저 터치하세요 (예: 3번 터치 시 3-1, 3-2 부여)");
        } else {
          branchOriginNodeId = null;
          showToast("순번 모드로 복귀 (1, 2, 3...)");
        }
        updateSeqModeUI();
        rebuildCanvasDom();
      };

      const updateSeqModeUI = () => {
        const btnSeq = document.getElementById("btn-seq-mode");
        const btnBranch = document.getElementById("btn-branch-mode");
        const banner = document.getElementById("mode-banner");
        const bannerText = document.getElementById("mode-banner-text");

        if (btnSeq) {
          if (isSeqMode) btnSeq.classList.add("active");
          else btnSeq.classList.remove("active");
        }
        if (btnBranch) {
          if (isBranchMode) btnBranch.classList.add("active");
          else btnBranch.classList.remove("active");
        }

        if (banner && bannerText) {
          if (isSeqMode) {
            banner.className = "seq-active";
            if (isBranchMode) {
              const curOrigin = nodes.find((n) => n.id === branchOriginNodeId && n.seq);
              const prefixText = curOrigin
                ? `기준: [${curOrigin.seq}] ➔ 빈 노드 탭: ${curOrigin.seq}-n 부여 / 합류할 번호 노드 탭 시 분기 종료`
                : "분기 시작할 메인 번호 노드를 탭하세요";
              bannerText.innerText = `🔀 분기 모드 (${prefixText})`;
            } else {
              bannerText.innerText = "🔢 순번 지정 모드 (노드를 탭하여 1, 2, 3... 흐름 순번 부여)";
            }
          } else if (isConnectMode) {
            banner.className = "connect-active";
            bannerText.innerText = "🔗 수동 마그넷 연결 모드 (노드를 차례로 2개 탭하세요)";
          } else {
            banner.className = "";
            bannerText.innerText = "이동 및 편집 모드 (노드 드래그 이동 / 더블탭 수정)";
          }
        }
      };

      const undoLastSeq = () => {
        const assignedNodes = nodes.filter((n) => n.seq);
        if (assignedNodes.length === 0) {
          showToast("취소할 순번이 없습니다");
          return;
        }
        assignedNodes.sort((a, b) => (b._assignedAt || 0) - (a._assignedAt || 0));
        const target = assignedNodes[0];
        pushUndo();
        delete target.seq;
        delete target._assignedAt;
        rebuildCanvasDom();
        saveLocal();
        showToast("마지막 순번 부여 취소됨");
      };

      const clearAllSeqNumbers = () => {
        if (confirm("모든 노드의 순번(1, 2, 3 및 분기 번호)을 삭제하시겠습니까?")) {
          pushUndo();
          nodes.forEach((n) => {
            delete n.seq;
            delete n._assignedAt;
          });
          branchOriginNodeId = null;
          rebuildCanvasDom();
          saveLocal();
          showToast("모든 순번 삭제 완료");
        }
      };

      const autoConnectBySequence = () => {
        const seqNodes = nodes.filter((n) => n.seq);
        if (seqNodes.length < 2) {
          showToast("순번이 부여된 노드가 최소 2개 이상이어야 합니다");
          return;
        }

        pushUndo();
        edges = [];

        // 1. 메인 정수 시퀀스 노드 정렬 (1 -> 2 -> 3...)
        const mainNodes = seqNodes
          .filter((n) => !n.seq!.includes("-"))
          .sort((a, b) => parseInt(a.seq!, 10) - parseInt(b.seq!, 10));

        for (let i = 0; i < mainNodes.length - 1; i++) {
          const u = mainNodes[i];
          const v = mainNodes[i + 1];
          const ports = findOptimalPorts(u, v, nodes, edges);
          edges.push({
            id: "edge_" + nextEdgeId++,
            from: u.id,
            to: v.id,
            fromId: u.id,
            toId: v.id,
            fromPort: ports.from,
            toPort: ports.to,
            type: "ElbowArrowItem",
          });
        }

        // 2. 분기 노드 연결 (예: 3 -> 3-1 -> 3-2 -> 4)
        const branchGroups: Record<string, FlowNode[]> = {};
        seqNodes
          .filter((n) => n.seq!.includes("-"))
          .forEach((n) => {
            const parts = n.seq!.split("-");
            const base = parts[0];
            if (!branchGroups[base]) branchGroups[base] = [];
            branchGroups[base].push(n);
          });

        Object.keys(branchGroups).forEach((baseStr) => {
          const originNode = nodes.find((n) => n.seq === baseStr);
          const bList = branchGroups[baseStr];
          bList.sort((a, b) => {
            const subA = parseInt(a.seq!.split("-")[1], 10);
            const subB = parseInt(b.seq!.split("-")[1], 10);
            return subA - subB;
          });

          if (originNode && bList.length > 0) {
            // 기준 노드 -> 첫 번째 분기 노드 연결
            const ports0 = findOptimalPorts(originNode, bList[0], nodes, edges);
            edges.push({
              id: "edge_" + nextEdgeId++,
              from: originNode.id,
              to: bList[0].id,
              fromId: originNode.id,
              toId: bList[0].id,
              fromPort: ports0.from,
              toPort: ports0.to,
              type: "ElbowArrowItem",
            });

            // 분기 내부 체인 연결 (3-1 -> 3-2 ...)
            for (let j = 0; j < bList.length - 1; j++) {
              const u = bList[j];
              const v = bList[j + 1];
              const ports = findOptimalPorts(u, v, nodes, edges);
              edges.push({
                id: "edge_" + nextEdgeId++,
                from: u.id,
                to: v.id,
                fromId: u.id,
                toId: v.id,
                fromPort: ports.from,
                toPort: ports.to,
                type: "ElbowArrowItem",
              });
            }

            // 마지막 분기 노드 -> 다음 정수 번호 노드로 합류(Join)
            const nextBaseInt = parseInt(baseStr, 10) + 1;
            const joinNode = nodes.find((n) => n.seq === String(nextBaseInt));
            if (joinNode) {
              const lastBranch = bList[bList.length - 1];
              const portsJ = findOptimalPorts(lastBranch, joinNode, nodes, edges);
              edges.push({
                id: "edge_" + nextEdgeId++,
                from: lastBranch.id,
                to: joinNode.id,
                fromId: lastBranch.id,
                toId: joinNode.id,
                fromPort: portsJ.from,
                toPort: portsJ.to,
                type: "ElbowArrowItem",
              });
            }
          }
        });

        renderEdges();
        saveLocal();
        showToast(`⚡ 순번 기준 연결선 자동 생성 완료 (${edges.length}개)`);
      };

      const renderNode = (node: FlowNode) => {
        const w = node.w || 75;
        const h = node.h || 32;

        const el = document.createElement("div");
        el.id = node.id;
        const isOrigin = isBranchMode && branchOriginNodeId === node.id;
        el.className = "node " + node.type + (isOrigin ? " branch-origin" : "");
        el.style.left = node.x + "px";
        el.style.top = node.y + "px";
        el.style.width = w + "px";
        el.style.height = h + "px";

        // SVG 모양
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "node-shape-svg");
        svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
        svg.innerHTML = getNodeShapeSvg(node.type, w, h);
        el.appendChild(svg);

        // 라벨
        const label = document.createElement("span");
        label.className = "node-label";
        label.innerText = node.text;
        el.appendChild(label);

        // 순번 뱃지
        if (node.seq) {
          const badge = document.createElement("span");
          badge.className = "node-seq-badge" + (node.seq.includes("-") ? " branch" : "");
          badge.innerText = node.seq;
          el.appendChild(badge);
        }

        // 포트 4개
        ["top", "bottom", "left", "right"].forEach((pos) => {
          const p = document.createElement("div");
          p.className = "port " + pos;
          el.appendChild(p);
        });

        // 터치 드래그 및 탭
        let startX = 0,
          startY = 0,
          initX = 0,
          initY = 0,
          isMoved = false;
        let dragStartState: string | null = null;

        el.addEventListener("touchstart", (e) => {
          const t = e.touches[0];
          startX = t.clientX;
          startY = t.clientY;
          initX = node.x;
          initY = node.y;
          isMoved = false;
          dragStartState = JSON.stringify({ nodes, edges });
          e.stopPropagation();
        });

        el.addEventListener("touchmove", (e) => {
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
            el.style.left = node.x + "px";
            el.style.top = node.y + "px";
          }
          e.preventDefault();
        });

        el.addEventListener("touchend", (e) => {
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
            renderEdges();
            saveLocal();
          }
        });

        el.addEventListener("click", (e) => {
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

        el.addEventListener("dblclick", () => {
          const newText = prompt("노드 텍스트 입력:", node.text);
          if (newText && newText.trim()) {
            pushUndo();
            node.text = newText.trim();
            rebuildCanvasDom();
            saveLocal();
          }
        });

        container.appendChild(el);
      };

      const rebuildCanvasDom = () => {
        const domNodes = container.querySelectorAll(".node");
        domNodes.forEach((n) => n.remove());
        nodes.forEach(renderNode);
        renderEdges();
      };

      const addNode = (type: string, text: string, x?: number, y?: number) => {
        pushUndo();
        const id = "node_" + nextId++;
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
        const node: FlowNode = { id, type, text, x: cx, y: cy, w, h };
        nodes.push(node);
        renderNode(node);
        renderEdges();
        saveLocal();
      };

      const autoAlignGrid = () => {
        if (!nodes || nodes.length === 0) return;
        pushUndo();

        const containerW = container.clientWidth || window.innerWidth;
        const nodeW = 75;
        const nodeH = 32;
        const gapX = 22;
        const gapY = 28;

        const hasSeq = nodes.some((n) => n.seq);
        const hasEdges = edges.length > 0;

        if (hasSeq) {
          // 순번 기반 계층 정렬
          const mainNodes = nodes
            .filter((n) => n.seq && !n.seq.includes("-"))
            .sort((a, b) => parseInt(a.seq!, 10) - parseInt(b.seq!, 10));

          let curY = 20;
          const centerX = Math.floor((containerW - nodeW) / 2);

          mainNodes.forEach((mn, idx) => {
            mn.x = centerX;
            mn.y = curY;

            // 해당 노드에 딸린 분기 노드들
            const branches = nodes
              .filter((n) => n.seq && n.seq.startsWith(mn.seq + "-"))
              .sort((a, b) => parseInt(a.seq!.split("-")[1], 10) - parseInt(b.seq!.split("-")[1], 10));

            if (branches.length > 0) {
              const bY = curY;
              branches.forEach((bn, bIdx) => {
                bn.x = centerX + (nodeW + gapX) * (bIdx + 1);
                bn.y = bY;
              });
            }

            curY += nodeH + gapY;
          });

          // 순번 없는 잉여 노드 하단 정렬
          const unassigned = nodes.filter((n) => !n.seq);
          unassigned.forEach((un, uIdx) => {
            un.x = 20 + (uIdx % 3) * (nodeW + gapX);
            un.y = curY + Math.floor(uIdx / 3) * (nodeH + gapY);
          });
        } else {
          // 단순 바둑판 격자 배치
          const cols = Math.max(2, Math.floor(containerW / (nodeW + gapX)));
          const startX = Math.max(16, Math.floor((containerW - cols * (nodeW + gapX) + gapX) / 2));
          const startY = 20;

          nodes.forEach((n, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            n.x = startX + col * (nodeW + gapX);
            n.y = startY + row * (nodeH + gapY);
          });
        }

        nodes.forEach(clampNode);
        renderEdges();
        saveLocal();
        showToast("⚡ 바둑판/순번 자동 정렬 완료");
      };

      const clearCanvas = () => {
        if (confirm("캔버스의 모든 노드와 연결선을 삭제하시겠습니까?")) {
          pushUndo();
          nodes = [];
          edges = [];
          selectedEdgeId = null;
          connectSourceId = null;
          branchOriginNodeId = null;
          rebuildCanvasDom();
          saveLocal();
          showToast("캔버스 초기화 완료");
        }
      };

      const saveLocal = () => {
        try {
          localStorage.setItem("ms_mobile_nodes", JSON.stringify(nodes));
          localStorage.setItem("ms_mobile_edges", JSON.stringify(edges));
        } catch (e) {}
      };

      const loadLocal = () => {
        try {
          const savedNodes = localStorage.getItem("ms_mobile_nodes");
          const savedEdges = localStorage.getItem("ms_mobile_edges");
          if (savedNodes) {
            nodes = JSON.parse(savedNodes);
            nodes.forEach(renderNode);
            clampAllNodesToBounds();
            if (savedEdges) {
              edges = JSON.parse(savedEdges);
            }
            renderEdges();
          } else {
            addNode("terminal", "시작");
            addNode("process", "작업 진행");
            addNode("decision", "정상 확인?");
            addNode("terminal", "완료");
            autoAlignGrid();
            undoStack = [];
          }
        } catch (e) {}
        updateUndoBtn();
      };

      // 3. 사진 압축 & 모달 제어
      const resizeAndCompressImage = (
        file: File,
        maxDimension: number,
        quality: number,
        callback: (b64: string, w: number, h: number) => void
      ) => {
        const reader = new FileReader();
        reader.onload = function (e: any) {
          const img = new Image();
          img.onload = function () {
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
            const cvs = document.createElement("canvas");
            cvs.width = w;
            cvs.height = h;
            const ctx = cvs.getContext("2d");
            if (ctx) {
              ctx.fillStyle = "#FFFFFF";
              ctx.fillRect(0, 0, w, h);
              ctx.drawImage(img, 0, 0, w, h);
              const compressedB64 = cvs.toDataURL("image/jpeg", quality);
              callback(compressedB64, w, h);
            }
          };
          img.onerror = function () {
            callback(e.target.result, 0, 0);
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      };

      let currentPhotoMode: "ai" | "photo" = "ai";

      const openPhotoChoiceModal = (mode: "ai" | "photo") => {
        currentPhotoMode = mode || "ai";
        const modal = document.getElementById("photo-choice-modal");
        const titleEl = document.getElementById("photo-modal-title");
        const descEl = document.getElementById("photo-modal-desc");
        if (currentPhotoMode === "ai") {
          if (titleEl) titleEl.innerText = "🪄 손그림 ➔ AI 변환";
          if (descEl) descEl.innerText = "손그림을 새로 촬영하거나 저장된 갤러리 사진을 선택하세요";
        } else {
          if (titleEl) titleEl.innerText = "📷 손그림 사진 전송";
          if (descEl) descEl.innerText = "사진을 새로 촬영하거나 저장된 갤러리 사진을 선택하세요";
        }
        if (modal) modal.style.display = "flex";
      };

      const closePhotoChoiceModal = () => {
        const modal = document.getElementById("photo-choice-modal");
        if (modal) modal.style.display = "none";
      };

      const triggerPhotoChoice = (source: "camera" | "gallery") => {
        closePhotoChoiceModal();
        if (currentPhotoMode === "ai") {
          if (source === "camera") {
            const inp = document.getElementById("photo-ai-input") as HTMLInputElement;
            if (inp) {
              inp.value = "";
              inp.click();
            }
          } else {
            const inp = document.getElementById("photo-ai-gallery-input") as HTMLInputElement;
            if (inp) {
              inp.value = "";
              inp.click();
            }
          }
        } else {
          if (source === "camera") {
            const inp = document.getElementById("photo-input") as HTMLInputElement;
            if (inp) {
              inp.value = "";
              inp.click();
            }
          } else {
            const inp = document.getElementById("photo-gallery-input") as HTMLInputElement;
            if (inp) {
              inp.value = "";
              inp.click();
            }
          }
        }
      };

      // 4. 전송 및 카운트다운 타이머
      const updatePinTimerDisplay = () => {
        const m = Math.floor(pinCountdownSeconds / 60);
        const s = pinCountdownSeconds % 60;
        const mm = String(m).padStart(2, "0");
        const ss = String(s).padStart(2, "0");
        const timerEl = document.getElementById("modal-timer-badge");
        if (timerEl) {
          timerEl.innerText = `⏳ 남은 유효시간 ${mm}:${ss}`;
          timerEl.style.color = "#F59E0B";
        }
      };

      const startPinCountdown = () => {
        if (pinCountdownTimer) clearInterval(pinCountdownTimer);
        pinCountdownSeconds = 300;
        updatePinTimerDisplay();
        pinCountdownTimer = setInterval(() => {
          pinCountdownSeconds--;
          if (pinCountdownSeconds <= 0) {
            clearInterval(pinCountdownTimer);
            pinCountdownTimer = null;
            const timerEl = document.getElementById("modal-timer-badge");
            if (timerEl) {
              timerEl.innerText = "⚠️ 유효시간(5분) 만료됨";
              timerEl.style.color = "#EF4444";
            }
            const badge = document.getElementById("client-pin-badge");
            if (badge) {
              badge.innerText = "PIN: 만료됨 (다시 전송)";
              badge.style.background = "#475569";
              badge.style.borderColor = "#64748B";
            }
          } else {
            updatePinTimerDisplay();
          }
        }, 1000);
      };

      const onTransmissionCompleted = (typeStr: string, detailStr: string, txPin: string) => {
        const pin = txPin || currentTxPin || issueFreshTxPin();
        showToast("✅ 전송 완료: " + typeStr + " (PIN: " + pin + ")");
        startPinCountdown();
        const modal = document.getElementById("session-closed-modal");
        if (modal) {
          const detailEl = document.getElementById("modal-detail-text");
          if (detailEl) detailEl.innerText = typeStr + " (" + detailStr + ")";
          const pinEl = document.getElementById("modal-pin-number");
          if (pinEl) pinEl.innerText = pin;
          modal.style.display = "flex";
        }
      };

      const copyClientPin = () => {
        if (!currentTxPin) {
          showToast("우측 상단 [💻 PC 전송]을 누르면 PIN이 발행됩니다.");
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(currentTxPin);
        }
        showToast("전송 PIN 복사됨: " + currentTxPin + " (PC에서 입력)");
      };

      const closePinModal = () => {
        const modal = document.getElementById("session-closed-modal");
        if (modal) modal.style.display = "none";
      };

      // 5. PC 전송 메인 로직
      const sendToPc = async () => {
        if (nodes.length === 0) {
          alert("전송할 플로우차트 노드가 없습니다.");
          return;
        }

        const nodeItems = nodes.map((n) => ({
          type: "FlowchartNodeItem",
          text: n.text,
          x: n.x,
          y: n.y,
          w: n.w || 75,
          h: n.h || 32,
          shape_type: n.type,
          style: {
            bg_color:
              n.type === "terminal"
                ? "#ECFDF5"
                : n.type === "decision"
                ? "#FFFBEB"
                : n.type === "database"
                ? "#FAF5FF"
                : n.type === "document" || n.type === "multidocument"
                ? "#EEF2FF"
                : n.type === "io"
                ? "#F0FDF4"
                : "#EFF6FF",
            border_color:
              n.type === "terminal"
                ? "#059669"
                : n.type === "decision"
                ? "#D97706"
                : n.type === "database"
                ? "#7C3AED"
                : n.type === "document" || n.type === "multidocument"
                ? "#4F46E5"
                : n.type === "io"
                ? "#16A34A"
                : "#2563EB",
            border_width: 1.5,
            text_color: "#1E293B",
            font_size: 7,
            font_bold: true,
          },
        }));

        const arrowItems = edges
          .map((e) => {
            const fId = e.fromId || e.from;
            const tId = e.toId || e.to;
            const fn = nodes.find((n) => n.id === fId);
            const tn = nodes.find((n) => n.id === tId);
            if (!fn || !tn) return null;
            const fPort = e.fromPort ? e.fromPort.toLowerCase() : null;
            const tPort = e.toPort ? e.toPort.toLowerCase() : null;
            const ports =
              fPort && tPort ? { from: fPort, to: tPort } : findOptimalPorts(fn, tn, nodes, edges);
            const p1 = getPortCoords(fn, ports.from);
            const p2 = getPortCoords(tn, ports.to);
            return {
              type: "ElbowArrowItem",
              start_pos: [p1.x, p1.y],
              end_pos: [p2.x, p2.y],
              route_mode: ports.from === "bottom" || ports.from === "top" ? "HV" : "VH",
              label: e.label || "",
              style: {
                color: "#2563EB",
                width: 3,
                head_size: 12,
              },
            };
          })
          .filter(Boolean);

        const txPin = issueFreshTxPin();
        const payload = {
          pin: txPin,
          client_pin: txPin,
          type: "flowchart",
          direction: currentDirection,
          data: {
            nodes: nodes.map((n) => ({
              id: n.id,
              text: n.text,
              shape: n.type,
              x: n.x,
              y: n.y,
              w: n.w || 75,
              h: n.h || 32,
            })),
            edges: edges.map((e) => ({
              id: e.id,
              from: e.fromId || e.from,
              to: e.toId || e.to,
              fromId: e.fromId || e.from,
              toId: e.toId || e.to,
              fromPort: (e.fromPort || "").toLowerCase(),
              toPort: (e.toPort || "").toLowerCase(),
              label: e.label || "",
            })),
            items: [...nodeItems, ...arrowItems],
          },
        };

        // 1. 클라우드 릴레이 서버에 5분 TTL 저장 (/api/sketch/save)
        try {
          await fetch("/api/sketch/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin: txPin, ttl_sec: 300, payload }),
          });
        } catch (e) {
          console.warn("Cloud save failed:", e);
        }

        // 2. 만약 로컬 Wi-Fi 프록시 환경이면 로컬 P2P /api/upload 및 /api/save_by_pin 동시 호출
        fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => {});

        onTransmissionCompleted("플로우차트", "노드 " + nodeItems.length + "개, 연결선 " + arrowItems.length + "개", txPin);
      };

      const handlePhotoUpload = (input: HTMLInputElement) => {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        closePhotoChoiceModal();
        showToast("손그림 사진 최적화 중...");

        resizeAndCompressImage(file, 1280, 0.8, async (base64Data, w, h) => {
          const txPin = issueFreshTxPin();
          const payload = {
            pin: txPin,
            client_pin: txPin,
            type: "image",
            title: "모바일 손그림 사진 (" + new Date().toLocaleTimeString() + ")",
            image_base64: base64Data,
            width: w,
            height: h,
          };

          try {
            await fetch("/api/sketch/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pin: txPin, ttl_sec: 300, payload }),
            });
          } catch (e) {}

          fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).catch(() => {});

          onTransmissionCompleted("손그림 사진", "사진 전송 완료", txPin);
        });
        input.value = "";
      };

      const handlePhotoAiUpload = (input: HTMLInputElement) => {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        closePhotoChoiceModal();
        showToast("🪄 사진 최적화 압축 및 전송 중...");

        resizeAndCompressImage(file, 1280, 0.8, async (base64Data, w, h) => {
          const txPin = issueFreshTxPin();
          const payload = {
            pin: txPin,
            client_pin: txPin,
            type: "sketch_to_mermaid",
            title: "손그림 플로우차트 AI 변환 (" + new Date().toLocaleTimeString() + ")",
            image_base64: base64Data,
            width: w,
            height: h,
          };

          try {
            await fetch("/api/sketch/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pin: txPin, ttl_sec: 300, payload }),
            });
          } catch (e) {}

          fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).catch(() => {});

          onTransmissionCompleted("손그림 AI 변환", "AI Mermaid 자동 변환 완료", txPin);
        });
        input.value = "";
      };

      // 6. 이벤트 리스너 바인딩
      document.getElementById("btn-undo")?.addEventListener("click", undo);
      document.getElementById("btn-align-grid")?.addEventListener("click", autoAlignGrid);
      document.getElementById("btn-photo-ai")?.addEventListener("click", () => openPhotoChoiceModal("ai"));
      document.getElementById("btn-send-pc")?.addEventListener("click", sendToPc);
      document.getElementById("btn-seq-mode")?.addEventListener("click", toggleSeqMode);
      document.getElementById("btn-branch-mode")?.addEventListener("click", toggleBranchMode);
      document.getElementById("btn-undo-seq")?.addEventListener("click", undoLastSeq);
      document.getElementById("btn-clear-seq")?.addEventListener("click", clearAllSeqNumbers);
      document.getElementById("btn-auto-connect")?.addEventListener("click", autoConnectBySequence);
      document.getElementById("btn-del-edge")?.addEventListener("click", handleDeleteEdgeClick);
      document.getElementById("btn-clear-canvas")?.addEventListener("click", clearCanvas);
      document.getElementById("client-pin-badge")?.addEventListener("click", copyClientPin);
      document.getElementById("btn-modal-copy-pin")?.addEventListener("click", copyClientPin);
      document.getElementById("btn-modal-close")?.addEventListener("click", closePinModal);

      // 도형 팔레트 버튼
      document.querySelectorAll("[data-shape]").forEach((btn) => {
        btn.addEventListener("click", (e: any) => {
          const shape = e.currentTarget.getAttribute("data-shape");
          const label = e.currentTarget.getAttribute("data-label");
          addNode(shape, label);
        });
      });

      // 사진 모달 제어
      document.getElementById("btn-sheet-camera")?.addEventListener("click", () => triggerPhotoChoice("camera"));
      document.getElementById("btn-sheet-gallery")?.addEventListener("click", () => triggerPhotoChoice("gallery"));
      document.getElementById("btn-sheet-cancel")?.addEventListener("click", closePhotoChoiceModal);
      document.getElementById("photo-choice-modal")?.addEventListener("click", (e: any) => {
        if (e.target && e.target.id === "photo-choice-modal") closePhotoChoiceModal();
      });

      // 파일 인풋 이벤트
      document.getElementById("photo-input")?.addEventListener("change", (e: any) => handlePhotoUpload(e.target));
      document.getElementById("photo-gallery-input")?.addEventListener("change", (e: any) => handlePhotoUpload(e.target));
      document.getElementById("photo-ai-input")?.addEventListener("change", (e: any) => handlePhotoAiUpload(e.target));
      document.getElementById("photo-ai-gallery-input")?.addEventListener("change", (e: any) => handlePhotoAiUpload(e.target));

      // 리사이즈 & 초기 로드
      window.addEventListener("resize", clampAllNodesToBounds);
      window.addEventListener("orientationchange", () => setTimeout(clampAllNodesToBounds, 200));

      loadLocal();
    };

    initApp();
  }, []);

  return (
    <div
      ref={containerRef}
      className="sketch-root"
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0F172A",
        color: "#F8FAFC",
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <style jsx global>{`
        * {
          box-sizing: border-box;
          user-select: none;
          -webkit-user-select: none;
        }
        .sketch-root {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
        header {
          background: #1e293b;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #334155;
          flex-shrink: 0;
        }
        header h1 {
          font-size: 13px;
          font-weight: 700;
          color: #38bdf8;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        header .actions {
          display: flex;
          gap: 4px;
        }
        .btn {
          border: none;
          border-radius: 5px;
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .btn-primary {
          background: #2563eb;
          color: #ffffff;
        }
        .btn-primary:active {
          background: #1d4ed8;
        }
        .btn-secondary {
          background: #334155;
          color: #e2e8f0;
        }
        .btn-danger {
          background: #dc2626;
          color: #ffffff;
        }
        .btn-danger:active {
          background: #b91c1c;
        }
        .btn-ai {
          background: #7c3aed;
          color: #ffffff;
          font-weight: bold;
        }
        .btn-ai:active {
          background: #6d28d9;
        }
        .pin-badge {
          background: #334155;
          color: #e0f2fe;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          border: 1px solid #64748b;
          letter-spacing: 0.5px;
          cursor: pointer;
          white-space: nowrap;
        }
        .btn-sm {
          padding: 2px 6px;
          font-size: 10px;
          border-radius: 4px;
        }
        .btn-disabled {
          opacity: 0.35 !important;
          pointer-events: none !important;
        }
        #toolbar {
          background: #1e293b;
          padding: 5px 8px;
          display: flex;
          gap: 5px;
          align-items: center;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-bottom: 1px solid #334155;
          white-space: nowrap;
          flex-shrink: 0;
        }
        #toolbar::-webkit-scrollbar {
          height: 4px;
        }
        #toolbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 2px;
        }
        .tool-btn {
          background: #334155;
          color: #e2e8f0;
          border: 1px solid #475569;
          border-radius: 4px;
          padding: 5px 8px;
          font-size: 10.5px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          flex-shrink: 0;
        }
        .tool-btn:active {
          background: #475569;
        }
        .tool-btn.active {
          background: #2563eb;
          border-color: #60a5fa;
          color: #ffffff;
          font-weight: bold;
          box-shadow: 0 0 8px rgba(37, 99, 235, 0.6);
        }
        .tool-btn.btn-seq {
          background: #1e3a8a;
          border-color: #3b82f6;
          color: #dbeafe;
        }
        .tool-btn.btn-branch {
          background: #78350f;
          border-color: #d97706;
          color: #fef3c7;
        }
        .tool-btn.btn-danger-soft {
          background: #7f1d1d;
          border-color: #ef4444;
          color: #fee2e2;
        }
        .tool-btn.btn-primary-soft {
          background: #1d4ed8;
          border-color: #60a5fa;
          color: #ffffff;
          font-weight: bold;
        }
        .tool-sep {
          color: #475569;
          font-size: 11px;
          margin: 0 2px;
          user-select: none;
          flex-shrink: 0;
        }
        .node-seq-badge {
          position: absolute;
          top: -2px;
          left: -2px;
          background: #2563eb;
          color: #ffffff;
          font-size: 9px;
          font-weight: 800;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 1.5px solid #ffffff;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.45);
          z-index: 10;
          pointer-events: none;
          box-sizing: border-box;
        }
        .node-seq-badge.branch {
          background: #d97706;
          border-color: #fef3c7;
          color: #ffffff;
        }
        .node.decision .node-seq-badge {
          left: 8px;
          top: 0px;
        }
        .node.io .node-seq-badge {
          left: 11px;
          top: -2px;
        }
        .node.terminal .node-seq-badge {
          left: 4px;
          top: -1px;
        }
        .node.database .node-seq-badge {
          left: 2px;
          top: -1px;
        }
        .node.document .node-seq-badge {
          left: 2px;
          top: -2px;
        }
        .node.multidocument .node-seq-badge {
          left: 2px;
          top: 1px;
        }
        #mode-banner {
          background: #0f172a;
          padding: 4px 10px;
          font-size: 10px;
          color: #94a3b8;
          border-bottom: 1px solid #1e293b;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        #mode-banner.connect-active {
          background: #1e3a8a;
          color: #bfdbfe;
          font-weight: bold;
        }
        #mode-banner.seq-active {
          background: #065f46;
          color: #d1fae5;
          font-weight: bold;
        }
        #canvas-container {
          flex: 1;
          position: relative;
          background: #0b1120;
          overflow: hidden;
          touch-action: none;
        }
        #edges-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }
        .edge-element {
          pointer-events: stroke;
          cursor: pointer;
        }
        .edge-delete-badge {
          pointer-events: all;
          cursor: pointer;
        }
        .node {
          position: absolute;
          width: 75px;
          height: 32px;
          min-width: 75px;
          min-height: 32px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: move;
          z-index: 2;
          user-select: none;
          -webkit-user-select: none;
          background: transparent;
          border: none;
        }
        .node-shape-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: visible;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
        }
        .node-label {
          position: relative;
          z-index: 2;
          pointer-events: none;
          font-size: 8.5px;
          font-weight: bold;
          text-align: center;
          padding: 2px 6px;
          color: #1e293b;
          word-break: break-all;
          line-height: 1.2;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
        }
        .node.decision .node-label {
          color: #b45309;
          padding: 2px 14px;
        }
        .node.terminal .node-label {
          color: #047857;
        }
        .node.database .node-label {
          color: #6d28d9;
          padding-top: 5px;
        }
        .node.io .node-label {
          color: #15803d;
          padding: 2px 10px;
        }
        .node.document .node-label,
        .node.multidocument .node-label {
          color: #4338ca;
          padding-bottom: 5px;
        }
        .node.connect-source .node-shape-svg {
          filter: drop-shadow(0 0 5px #10b981) drop-shadow(0 0 8px rgba(16, 185, 129, 0.5));
        }
        .node.branch-origin .node-shape-svg {
          filter: drop-shadow(0 0 6px #f59e0b) drop-shadow(0 0 10px rgba(245, 158, 11, 0.6));
        }
        .node.branch-origin .node-seq-badge {
          background: #f59e0b !important;
          box-shadow: 0 0 8px #f59e0b !important;
          transform: scale(1.15);
        }
        .port {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3b82f6;
          border: 1px solid #ffffff;
          pointer-events: none;
          opacity: 0.6;
          z-index: 5;
        }
        .port.top {
          top: -3px;
          left: calc(50% - 3px);
        }
        .port.bottom {
          bottom: -3px;
          left: calc(50% - 3px);
        }
        .port.left {
          left: -3px;
          top: calc(50% - 3px);
        }
        .port.right {
          right: -3px;
          top: calc(50% - 3px);
        }
        .node.io .port.left {
          left: 3px;
          top: calc(50% - 3px);
        }
        .node.io .port.right {
          right: 3px;
          top: calc(50% - 3px);
        }
        .node.io .port.top {
          left: calc(50% + 3px);
        }
        .node.io .port.bottom {
          left: calc(50% - 9px);
        }
        #toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid #38bdf8;
          color: #ffffff;
          padding: 8px 16px;
          border-radius: 16px;
          font-size: 12px;
          z-index: 1000;
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }
        #photo-input,
        #photo-ai-input,
        #photo-gallery-input,
        #photo-ai-gallery-input {
          display: none;
        }
        #photo-choice-modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(15, 23, 42, 0.78);
          backdrop-filter: blur(4px);
          z-index: 99998;
          align-items: flex-end;
          justify-content: center;
        }
        .sheet-container {
          background: #1e293b;
          width: 100%;
          max-width: 480px;
          border-top-left-radius: 18px;
          border-top-right-radius: 18px;
          border-top: 2px solid #38bdf8;
          padding: 12px 16px calc(16px + env(safe-area-inset-bottom, 0px)) 16px;
          box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.6);
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
          color: #f8fafc;
          margin-bottom: 4px;
        }
        .sheet-header p {
          font-size: 11px;
          color: #94a3b8;
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
        }
        .sheet-btn-camera {
          background: #064e3b;
          border-color: #059669;
        }
        .sheet-btn-camera:active {
          background: #047857;
        }
        .sheet-btn-gallery {
          background: #1e3a8a;
          border-color: #2563eb;
        }
        .sheet-btn-gallery:active {
          background: #1d4ed8;
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
          color: #ffffff;
          margin-bottom: 2px;
        }
        .sheet-btn-sub {
          font-size: 10.5px;
          color: #cbd5e1;
        }
        .sheet-btn-cancel {
          width: 100%;
          background: #334155;
          color: #e2e8f0;
          font-size: 12px;
          font-weight: 600;
          padding: 11px;
          border-radius: 8px;
          border: 1px solid #475569;
          cursor: pointer;
          text-align: center;
        }
      `}</style>

      {/* 헤더 */}
      <header>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <h1>모바일 스케치</h1>
          <span
            className="pin-badge"
            id="client-pin-badge"
            title="PC 전송 시 일회성 PIN(5분 유효)이 발행됩니다"
          >
            PIN: 전송 시 발행
          </span>
        </div>
        <div className="actions">
          <button className="btn btn-secondary btn-disabled" id="btn-undo" title="실행 취소">
            ↩️ 취소
          </button>
          <button className="btn btn-secondary" id="btn-align-grid">
            ⚡ 바둑판
          </button>
          <button className="btn btn-ai" id="btn-photo-ai" title="손그림 촬영 또는 갤러리 사진 불러오기">
            🪄 AI 손그림
          </button>
          <button className="btn btn-primary" id="btn-send-pc">
            💻 PC 전송
          </button>
        </div>
      </header>

      {/* 툴바 */}
      <div id="toolbar">
        {/* 스마트 순번 도구 */}
        <button type="button" className="tool-btn btn-seq" id="btn-seq-mode">
          🔢 순번
        </button>
        <button type="button" className="tool-btn btn-branch" id="btn-branch-mode">
          🔀 분기(+N)
        </button>
        <button type="button" className="tool-btn" id="btn-undo-seq">
          ⌫ 번호취소
        </button>
        <button type="button" className="tool-btn btn-danger-soft" id="btn-clear-seq">
          🗑️ 번호삭제
        </button>
        <button type="button" className="tool-btn btn-primary-soft" id="btn-auto-connect">
          ⚡ 연결선 작성
        </button>
        <span className="tool-sep">|</span>

        {/* 도형 팔레트 */}
        <button type="button" className="tool-btn" data-shape="terminal" data-label="시작/종료">
          🟢 시작/종료
        </button>
        <button type="button" className="tool-btn" data-shape="process" data-label="일반작업">
          🟦 일반작업
        </button>
        <button type="button" className="tool-btn" data-shape="decision" data-label="조건분기">
          🔶 조건분기
        </button>
        <button type="button" className="tool-btn" data-shape="io" data-label="입출력">
          🟩 입출력
        </button>
        <button type="button" className="tool-btn" data-shape="database" data-label="DB">
          🟪 DB
        </button>
        <button type="button" className="tool-btn" data-shape="document" data-label="문서">
          📄 문서
        </button>
        <button type="button" className="tool-btn" data-shape="multidocument" data-label="다중문서">
          📚 다중문서
        </button>
        <span className="tool-sep">|</span>

        {/* 삭제 도구 */}
        <button type="button" className="tool-btn" id="btn-del-edge">
          ✂️ 연결선 삭제
        </button>
        <button type="button" className="tool-btn btn-danger-soft" id="btn-clear-canvas">
          🗑️ 전체 비우기
        </button>
      </div>

      {/* 상태 배너 */}
      <div id="mode-banner">
        <span id="mode-banner-text">이동 및 편집 모드 (노드 드래그 이동 / 더블탭 수정)</span>
      </div>

      {/* 캔버스 컨테이너 */}
      <div id="canvas-container">
        <svg id="edges-svg">
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3B82F6" />
            </marker>
            <marker
              id="arrow-red"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#EF4444" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* 숨겨진 파일 인풋 */}
      <input type="file" id="photo-input" accept="image/*" capture="environment" />
      <input type="file" id="photo-gallery-input" accept="image/*" />
      <input type="file" id="photo-ai-input" accept="image/*" capture="environment" />
      <input type="file" id="photo-ai-gallery-input" accept="image/*" />

      {/* 토스트 */}
      <div id="toast" />

      {/* 사진 선택 바텀 시트 모달 */}
      <div id="photo-choice-modal">
        <div className="sheet-container" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-handle" />
          <div className="sheet-header">
            <h3 id="photo-modal-title">🪄 손그림 ➔ AI 변환</h3>
            <p id="photo-modal-desc">손그림을 촬영하거나 기기에 저장된 사진을 선택하세요</p>
          </div>
          <div className="sheet-options">
            <button type="button" className="sheet-btn sheet-btn-camera" id="btn-sheet-camera">
              <span className="sheet-btn-icon">📷</span>
              <div className="sheet-btn-text">
                <div className="sheet-btn-title">카메라로 새로 촬영</div>
                <div className="sheet-btn-sub">카메라를 열어 손그림을 바로 촬영합니다</div>
              </div>
            </button>
            <button type="button" className="sheet-btn sheet-btn-gallery" id="btn-sheet-gallery">
              <span className="sheet-btn-icon">🖼️</span>
              <div className="sheet-btn-text">
                <div className="sheet-btn-title">저장된 사진 불러오기 (갤러리)</div>
                <div className="sheet-btn-sub">기기에 저장된 사진/스크린샷/문서를 선택합니다</div>
              </div>
            </button>
          </div>
          <button type="button" className="sheet-btn-cancel" id="btn-sheet-cancel">
            취소
          </button>
        </div>
      </div>

      {/* 전송 완료 모달 (PIN 발급) */}
      <div
        id="session-closed-modal"
        style={{
          display: "none",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(15,23,42,0.92)",
          zIndex: 99999,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          textAlign: "center",
          backdropFilter: "blur(6px)",
        }}
      >
        <div
          style={{
            background: "#1E293B",
            border: "2px solid #38BDF8",
            borderRadius: "16px",
            padding: "24px 20px",
            maxWidth: "340px",
            width: "100%",
            boxShadow: "0 16px 36px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>🚀</div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#F8FAFC", marginBottom: "4px" }}>
            전송 완료 (PIN 발급)
          </div>
          <div
            id="modal-detail-text"
            style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", marginBottom: "14px" }}
          />

          <div
            style={{
              background: "#0F172A",
              border: "1.5px dashed #38BDF8",
              borderRadius: "10px",
              padding: "12px 10px",
              marginBottom: "12px",
            }}
          >
            <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "4px" }}>
              PC 입력용 PIN 번호
            </div>
            <div
              id="modal-pin-number"
              style={{
                fontSize: "34px",
                fontWeight: 900,
                letterSpacing: "4px",
                color: "#38BDF8",
                fontFamily: "monospace",
                marginBottom: "8px",
              }}
            >
              --- ---
            </div>
            <div id="modal-timer-badge" style={{ fontSize: "12px", fontWeight: 700, color: "#F59E0B" }}>
              ⏳ 남은 유효시간 05:00
            </div>
          </div>

          <div
            style={{
              fontSize: "11.5px",
              color: "#CBD5E1",
              lineHeight: 1.55,
              marginBottom: "16px",
              textAlign: "left",
              background: "#0F172A",
              borderRadius: "8px",
              padding: "10px 12px",
              border: "1px solid #334155",
            }}
          >
            1. PC 매뉴얼스튜디오의 <b>[모바일 연동]</b> 창을 엽니다.
            <br />
            2. <b>[PIN으로 가져오기]</b> 입력창에 위 번호를 입력하고 <b>[가져오기]</b>를 누르세요.
            <br />
            <span style={{ color: "#94A3B8", fontSize: "10.5px" }}>
              💡 보안 및 자원 점유 방지를 위해 <b>5분 후 자동 만료</b>됩니다.
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              id="btn-modal-copy-pin"
              style={{
                flex: 1,
                height: "42px",
                background: "#0284C7",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              📋 PIN 복사
            </button>
            <button
              type="button"
              id="btn-modal-close"
              style={{
                flex: 1,
                height: "42px",
                background: "#2563EB",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              확인 (닫기)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
