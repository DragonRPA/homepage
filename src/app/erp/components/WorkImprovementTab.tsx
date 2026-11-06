"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Plus,
  Save,
  Send,
  Printer,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Camera,
  Paperclip,
  Search,
  RefreshCw,
  Sparkles,
  X,
  Eye,
  Check,
  RotateCcw,
} from "lucide-react";

export interface NumberedItemsMap {
  currentProcGroup: string[];
  issueGroup: string[];
  solutionGroup: string[];
  quantGroup: string[];
  qualGroup: string[];
  budgetGroup: string[];
}

export interface PhotoItem {
  dataUrl: string;
  caption: string;
}

export interface AttachedFileItem {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export interface WorkImprovementReport {
  id?: number;
  reportNo?: string;
  summaryTarget: string;
  summaryDate: string;
  department: string;
  improveTypes: string[];
  authorId: number | null;
  roleAuthor: string;
  nameAuthor: string;
  reviewerId: number | null;
  roleReviewer: string;
  nameReviewer: string;
  statusReviewer: "검토완료" | "보완요청" | "대기중";
  dateReviewer: string;
  commentReviewer: string;
  approverId: number | null;
  roleApprover: string;
  nameApprover: string;
  statusApprover: "최종승인" | "반려" | "대기중";
  dateApprover: string;
  commentApprover: string;
  numberedItems: NumberedItemsMap;
  photos: PhotoItem[];
  attachedFiles: AttachedFileItem[];
  overallStatus?: string;
  approvalRequestId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

interface EmployeeOption {
  id: number;
  employeeNo: string;
  name: string;
  department: string;
  position: string;
  duty?: string;
  tierLevel?: number;
}

const IMPROVE_TYPE_OPTIONS = [
  "업무 효율화 / 자동화",
  "오류 / 불량 개선",
  "비용 절감",
  "표준화 / 규격화",
  "기타",
];

function getTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function getTodayDot(): string {
  const d = new Date();
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatShortDate(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}`;
  }
  return isoDate;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function createBlankReport(currentUser: any, employees: EmployeeOption[]): WorkImprovementReport {
  // 대표이사를 제외한 부서장(팀장/부장/과장) 후보 우선 선정 (부서장 전결 원칙)
  const nonCeoEmployees = employees.filter(
    (e) => !e.duty?.includes("대표") && !e.position?.includes("대표")
  );
  const deptHeadCandidate =
    nonCeoEmployees.find(
      (e) =>
        e.department === currentUser?.department &&
        (e.duty?.includes("팀장") ||
          e.duty?.includes("부서장") ||
          e.position?.includes("부장") ||
          e.position?.includes("팀장"))
    ) ||
    nonCeoEmployees.find(
      (e) =>
        e.duty?.includes("팀장") ||
        e.duty?.includes("부서장") ||
        e.position?.includes("부장") ||
        e.position?.includes("팀장")
    ) ||
    nonCeoEmployees[0] ||
    employees[0];

  const reviewerCandidate =
    nonCeoEmployees.find(
      (e) =>
        e.department === currentUser?.department &&
        e.id !== deptHeadCandidate?.id &&
        (e.position?.includes("과장") || e.position?.includes("차장") || (e.tierLevel && e.tierLevel >= 1))
    ) || deptHeadCandidate;

  return {
    summaryTarget: "",
    summaryDate: getTodayIso(),
    department: currentUser?.department || "렌탈운영팀",
    improveTypes: ["업무 효율화 / 자동화"],
    authorId: currentUser?.id ? Number(currentUser.id) : null,
    roleAuthor: currentUser?.duty || currentUser?.position || "담당",
    nameAuthor: currentUser?.name || "",
    reviewerId: reviewerCandidate ? Number(reviewerCandidate.id) : null,
    roleReviewer: reviewerCandidate?.duty || reviewerCandidate?.position || "팀장",
    nameReviewer: reviewerCandidate?.name || "",
    statusReviewer: "대기중",
    dateReviewer: getTodayDot(),
    commentReviewer: "",
    approverId: deptHeadCandidate ? Number(deptHeadCandidate.id) : null,
    roleApprover: "부서장",
    nameApprover: deptHeadCandidate?.name || "",
    statusApprover: "대기중",
    dateApprover: getTodayDot(),
    commentApprover: "",
    numberedItems: {
      currentProcGroup: [""],
      issueGroup: [""],
      solutionGroup: [""],
      quantGroup: [""],
      qualGroup: [""],
      budgetGroup: [""],
    },
    photos: [],
    attachedFiles: [],
    overallStatus: "DRAFT",
  };
}

export const WorkImprovementTab: React.FC<{
  currentUser: any;
  initialReportId?: number | null;
}> = ({ currentUser, initialReportId }) => {
  const [reports, setReports] = useState<WorkImprovementReport[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(initialReportId || null);
  const [form, setForm] = useState<WorkImprovementReport>(() => createBlankReport(currentUser, []));
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchReports = async (keepSelectionId?: number | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/erp/work-improvements?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "보고서 목록 조회 실패");

      const list: WorkImprovementReport[] = data.reports || [];
      const empList: EmployeeOption[] = data.employees || [];
      setReports(list);
      setEmployees(empList);

      const targetId = keepSelectionId !== undefined ? keepSelectionId : selectedId;
      if (targetId) {
        const found = list.find((r) => r.id === targetId);
        if (found) {
          setSelectedId(found.id || null);
          setForm(found);
          return;
        }
      }

      if (list.length > 0 && selectedId === null && keepSelectionId === undefined) {
        setSelectedId(list[0].id || null);
        setForm(list[0]);
      } else if (list.length === 0 && !selectedId) {
        setForm(createBlankReport(currentUser, empList));
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(initialReportId || undefined);
  }, [statusFilter, initialReportId]);

  const handleNewReport = () => {
    setSelectedId(null);
    setForm(createBlankReport(currentUser, employees));
    showToast("신규 업무개선활동 보고서 양식이 준비되었습니다.");
  };

  const handleSelectReport = (r: WorkImprovementReport) => {
    setSelectedId(r.id || null);
    setForm({
      ...r,
      numberedItems: {
        currentProcGroup: r.numberedItems?.currentProcGroup?.length
          ? [...r.numberedItems.currentProcGroup]
          : [""],
        issueGroup: r.numberedItems?.issueGroup?.length ? [...r.numberedItems.issueGroup] : [""],
        solutionGroup: r.numberedItems?.solutionGroup?.length
          ? [...r.numberedItems.solutionGroup]
          : [""],
        quantGroup: r.numberedItems?.quantGroup?.length ? [...r.numberedItems.quantGroup] : [""],
        qualGroup: r.numberedItems?.qualGroup?.length ? [...r.numberedItems.qualGroup] : [""],
        budgetGroup: r.numberedItems?.budgetGroup?.length ? [...r.numberedItems.budgetGroup] : [""],
      },
      photos: Array.isArray(r.photos) ? [...r.photos] : [],
      attachedFiles: Array.isArray(r.attachedFiles) ? [...r.attachedFiles] : [],
    });
  };

  const handleLoadSample = () => {
    const sample: WorkImprovementReport = {
      ...form,
      summaryTarget: "품질관리팀 검사 성적서 전산 입력 및 부적합 통보 업무",
      summaryDate: getTodayIso(),
      improveTypes: ["업무 효율화 / 자동화", "오류 / 불량 개선", "표준화 / 규격화"],
      numberedItems: {
        currentProcGroup: [
          "완제품 검사 후 성적서 수기 날인 및 바인더 철 보관 (일평균 30건)",
          "부적합 발생 시 품질 담당자가 생산 라인에 전화 또는 직접 방문하여 구두 통보",
        ],
        issueGroup: [
          "성적서 분실 위험 및 과거 이력 추적 시 평균 20분 이상 탐색 시간 소요",
          "구두 통보에 따른 생산 라인과의 전달 미스 및 조치 지연 발생 (월 3건)",
          "고객사 성적서 제출 요청 시 매번 스캔 및 메일 발송하는 중복 작업 발생",
        ],
        solutionGroup: [
          "태블릿 기반 전산 검사 성적서 시스템 도입 및 클라우드 자동 저장",
          "부적합 판정 즉시 생산 라인 전광판 및 담당자 모바일 앱 알림 자동 전송 체계 구축",
        ],
        quantGroup: [
          "이력 조회 시간: 건당 20분 → 10초 이내 (검색 공수 98% 단축)",
          "부적합 조치 리드타임: 45분 → 5분 이내로 즉각 대응 체계 확립",
        ],
        qualGroup: [
          "페이퍼리스(Paperless) 업무 환경 구축으로 친환경 ESG 경영 실천",
          "고객사 웹 성적서 조회 제공으로 기업 신뢰도 및 대외 이미지 향상",
        ],
        budgetGroup: [
          "현장 입력용 태블릿 2대 구매비용 약 80만 원",
          "IT보안팀 현장 와이파이(Wi-Fi) 무선망 확장 및 단말 등록 협조",
        ],
      },
    };
    setForm(sample);
    showToast("샘플 데이터가 입력되었습니다.");
  };

  const toggleImproveType = (label: string) => {
    setForm((prev) => {
      const exists = prev.improveTypes.includes(label);
      return {
        ...prev,
        improveTypes: exists
          ? prev.improveTypes.filter((t) => t !== label)
          : [...prev.improveTypes, label],
      };
    });
  };

  const updateNumberedItem = (
    groupKey: keyof NumberedItemsMap,
    idx: number,
    value: string
  ) => {
    setForm((prev) => {
      const nextArr = [...(prev.numberedItems[groupKey] || [""])];
      nextArr[idx] = value;
      return {
        ...prev,
        numberedItems: {
          ...prev.numberedItems,
          [groupKey]: nextArr,
        },
      };
    });
  };

  const addNumberedItem = (groupKey: keyof NumberedItemsMap) => {
    setForm((prev) => ({
      ...prev,
      numberedItems: {
        ...prev.numberedItems,
        [groupKey]: [...(prev.numberedItems[groupKey] || []), ""],
      },
    }));
  };

  const removeNumberedItem = (groupKey: keyof NumberedItemsMap, idx: number) => {
    setForm((prev) => {
      const current = prev.numberedItems[groupKey] || [""];
      if (current.length <= 1) {
        return {
          ...prev,
          numberedItems: {
            ...prev.numberedItems,
            [groupKey]: [""],
          },
        };
      }
      const nextArr = current.filter((_, i) => i !== idx);
      return {
        ...prev,
        numberedItems: {
          ...prev.numberedItems,
          [groupKey]: nextArr,
        },
      };
    });
  };

  // 사진 압축 및 추가 (v3 HTML의 Canvas JPEG 압축 로직 그대로 수용)
  const compressImage = (
    file: File,
    maxWidth = 1000,
    quality = 0.78
  ): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", quality));
          } else {
            resolve(String(e.target?.result || ""));
          }
        };
        img.src = String(e.target?.result || "");
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const added: PhotoItem[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await compressImage(file);
      added.push({
        dataUrl,
        caption: file.name.replace(/\.[^/.]+$/, ""),
      });
    }
    setForm((prev) => ({
      ...prev,
      photos: [...prev.photos, ...added],
    }));
    e.target.value = "";
    showToast(`${added.length}장의 사진이 첨부되었습니다.`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const added: AttachedFileItem[] = [];
    for (const file of files) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(String(ev.target?.result || ""));
        reader.readAsDataURL(file);
      });
      added.push({
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        dataUrl,
      });
    }
    setForm((prev) => ({
      ...prev,
      attachedFiles: [...prev.attachedFiles, ...added],
    }));
    e.target.value = "";
    showToast(`${added.length}개의 첨부파일이 추가되었습니다.`);
  };

  // DB 저장 및 결재 상신
  const handleSaveToServer = async (submitApproval = true) => {
    if (!form.summaryTarget.trim()) {
      showToast("개선 대상 업무명(1-가. 대상)을 입력해주세요.", "error");
      return;
    }
    setSaving(true);
    try {
      const isEdit = Boolean(selectedId);
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        ...form,
        id: selectedId,
        submitApproval,
      };

      const res = await fetch("/api/erp/work-improvements", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "보고서 저장 실패");

      const saved: WorkImprovementReport = data.report;
      setSelectedId(saved.id || null);
      setForm(saved);
      await fetchReports(saved.id || null);

      showToast(
        submitApproval
          ? "업무개선활동 보고서가 저장 및 전자결재함에 연동되었습니다."
          : "업무개선활동 보고서가 임시저장되었습니다."
      );
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // 검토자 / 승인자 결재 상태 즉시 확정
  const handleQuickDecision = async (
    actionRole: "REVIEWER" | "APPROVER",
    statusValue: "검토완료" | "보완요청" | "대기중" | "최종승인" | "반려"
  ) => {
    const todayDot = getTodayDot();
    if (!selectedId) {
      // 아직 저장 전인 경우 폼 상태만 먼저 변경
      if (actionRole === "REVIEWER") {
        setForm((prev) => ({ ...prev, statusReviewer: statusValue as any, dateReviewer: todayDot }));
      } else {
        setForm((prev) => ({ ...prev, statusApprover: statusValue as any, dateApprover: todayDot }));
      }
      showToast(`결재 상태가 [${statusValue}](으)로 선택되었습니다. [보고서 저장/상신]을 눌러 확정하세요.`);
      return;
    }

    setSaving(true);
    try {
      const comment =
        actionRole === "REVIEWER" ? form.commentReviewer : form.commentApprover;
      const dateStr =
        actionRole === "REVIEWER" ? form.dateReviewer || todayDot : form.dateApprover || todayDot;
      const actorName =
        actionRole === "REVIEWER"
          ? form.nameReviewer || currentUser?.name
          : form.nameApprover || currentUser?.name;

      const res = await fetch("/api/erp/work-improvements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedId,
          actionRole,
          statusValue,
          comment,
          dateStr,
          actorName,
          actorId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "결재 반영 실패");

      setForm(data.report);
      await fetchReports(selectedId);
      showToast(data.message || `결재 상태가 [${statusValue}](으)로 확정되었습니다.`);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("선택한 업무개선활동 보고서를 삭제하시겠습니까?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/erp/work-improvements?id=${selectedId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "삭제 실패");

      showToast("보고서가 삭제되었습니다.");
      setSelectedId(null);
      await fetchReports(null);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // v3 HTML 양식과 동일한 단독 HTML 파일 내보내기
  const handleExportHtml = () => {
    const renderNumberedHtml = (items: string[]) =>
      (items && items.length ? items : [""])
        .map(
          (t, i) =>
            `<div style="display:flex;gap:8px;margin-bottom:4px;font-size:13.5px;line-height:1.5;"><span style="font-weight:700;color:#2c5282;min-width:22px;">${
              i + 1
            })</span><div style="flex:1;white-space:pre-wrap;">${(t || "-").replace(
              /</g,
              "&lt;"
            )}</div></div>`
        )
        .join("");

    const photosHtml =
      form.photos.length > 0
        ? `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:8px;">
            ${form.photos
              .map(
                (p) => `
              <div style="border:1px solid #cbd5e0;border-radius:6px;overflow:hidden;background:#fff;">
                <img src="${p.dataUrl}" style="width:100%;height:190px;object-fit:contain;background:#f7fafc;border-bottom:1px solid #e2e8f0;" />
                <div style="padding:6px 10px;font-size:12px;text-align:center;font-weight:600;color:#2d3748;">${
                  p.caption || ""
                }</div>
              </div>`
              )
              .join("")}
          </div>`
        : "";

    const htmlString = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>업무개선활동 보고서 - ${form.summaryTarget || "보고서"}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: 'Pretendard', 'Malgun Gothic', sans-serif; color: #1a202c; margin: 0; padding: 24px; background: #edf2f7; }
  .sheet { max-width: 210mm; margin: 0 auto; background: #fff; padding: 16mm; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  @media print { body { background: #fff; padding: 0; } .sheet { box-shadow: none; padding: 0; } }
  .doc-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px double #1a365d; padding-bottom: 14px; margin-bottom: 18px; }
  .doc-title { font-size: 26px; font-weight: 800; color: #1a365d; letter-spacing: 2px; }
  .approval-table { border-collapse: collapse; width: 255px; font-size: 12px; text-align: center; }
  .approval-table th, .approval-table td { border: 1px solid #cbd5e0; padding: 4px 6px; }
  .approval-table th { background: #edf2f7; font-weight: 700; width: 33.33%; }
  .sec-title { display: flex; align-items: center; background: #f8fafc; border-left: 5px solid #1a365d; border-bottom: 1px solid #cbd5e0; padding: 7px 12px; font-size: 14.5px; font-weight: 700; color: #1a365d; margin-top: 16px; margin-bottom: 8px; }
  .sub-box { border: 1px solid #cbd5e0; border-radius: 4px; padding: 10px 14px; margin-bottom: 8px; }
  .sub-title { font-size: 13.5px; font-weight: 700; color: #2d3748; margin-bottom: 6px; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="doc-header">
      <div>
        <div style="font-size:12px;font-weight:700;color:#2c5282;margin-bottom:4px;">CONTINUOUS IMPROVEMENT REPORT</div>
        <div class="doc-title">업무개선활동 보고서</div>
      </div>
      <table class="approval-table">
        <tr>
          <th>${form.roleAuthor || "담당"}</th>
          <th>${form.roleReviewer || "팀장"}</th>
          <th>${form.roleApprover || "부서장"}</th>
        </tr>
        <tr style="height:48px;">
          <td><strong>${form.nameAuthor || ""}</strong><br/><span style="font-size:11px;color:#718096;">${formatShortDate(
            form.summaryDate
          )}</span></td>
          <td><strong>${form.nameReviewer || ""}</strong><br/><span style="font-size:11px;font-weight:700;color:#2b6cb0;">${
            form.statusReviewer
          }</span></td>
          <td><strong>${form.nameApprover || ""}</strong><br/><span style="font-size:11px;font-weight:700;color:#2f855a;">${
            form.statusApprover
          }</span></td>
        </tr>
      </table>
    </div>

    <div class="sec-title">1. 개 요 (Summary)</div>
    <div class="sub-box">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13.5px;">
        <div><strong>가. 대 상 :</strong> ${form.summaryTarget}</div>
        <div><strong>나. 작성일 :</strong> ${form.summaryDate}</div>
      </div>
      <div style="font-size:13.5px;"><strong>다. 개선 유형 :</strong> ${form.improveTypes.join(
        ", "
      )}</div>
    </div>

    <div class="sec-title">2. 현황 및 문제점 (Current State & Issues)</div>
    <div class="sub-box">
      <div class="sub-title">가. 현재 프로세스</div>
      ${renderNumberedHtml(form.numberedItems.currentProcGroup)}
      <div class="sub-title" style="margin-top:10px;">나. 주요 문제점</div>
      ${renderNumberedHtml(form.numberedItems.issueGroup)}
    </div>

    <div class="sec-title">3. 개선 방안 (Proposed Solutions)</div>
    <div class="sub-box">
      <div class="sub-title">가. 개선 내용</div>
      ${renderNumberedHtml(form.numberedItems.solutionGroup)}
      ${photosHtml}
    </div>

    <div class="sec-title">4. 기대 효과 (Expected Effects)</div>
    <div class="sub-box">
      <div class="sub-title">가. 정량적 효과</div>
      ${renderNumberedHtml(form.numberedItems.quantGroup)}
      <div class="sub-title" style="margin-top:10px;">나. 정성적 효과</div>
      ${renderNumberedHtml(form.numberedItems.qualGroup)}
    </div>

    <div class="sec-title">5. 소요 예산 및 협조 사항 (Budget & Request)</div>
    <div class="sub-box">
      <div class="sub-title">가. 필요 예산 및 협조 사항</div>
      ${renderNumberedHtml(form.numberedItems.budgetGroup)}
    </div>

    ${
      form.statusReviewer === "보완요청" ||
      form.statusReviewer === "검토완료" ||
      form.statusApprover === "최종승인" ||
      form.statusApprover === "반려" ||
      Boolean(form.commentReviewer?.trim()) ||
      Boolean(form.commentApprover?.trim())
        ? `<div class="sec-title">7. 검토 및 승인 의견 (Review & Approval Feedback)</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="sub-box" style="background:#f8fafc;">
        <div class="sub-title">검토자 의견 (${form.dateReviewer || "-"}) - [${
            form.statusReviewer
          }]</div>
        <div style="font-size:13px;white-space:pre-wrap;">${form.commentReviewer || "-"}</div>
      </div>
      <div class="sub-box" style="background:#f8fafc;">
        <div class="sub-title">승인자 의견 (${form.dateApprover || "-"}) - [${
            form.statusApprover
          }]</div>
        <div style="font-size:13px;white-space:pre-wrap;">${form.commentApprover || "-"}</div>
      </div>
    </div>`
        : ""
    }

    <div style="margin-top:16px;padding-top:8px;border-top:1px solid #cbd5e0;display:flex;justify-content:space-between;font-size:11px;color:#718096;">
      <span>문서양식: WIR-2026-REV3 (${form.reportNo || "신규"})</span>
      <span>작성부서: ${form.department || "현장개선팀"}</span>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlString], { type: "text/html;charset=utf-8;" });
    const targetName = (form.summaryTarget || "업무개선활동보고서").replace(
      /[\\/:*?"<>|]/g,
      "_"
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `[업무개선활동보고서]_${targetName}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("독립 HTML 파일이 다운로드되었습니다.");
  };

  const renderOverallBadge = (r: WorkImprovementReport) => {
    if (r.statusApprover === "최종승인" || r.overallStatus === "APPROVED") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] whitespace-nowrap">
          최종승인
        </span>
      );
    }
    if (r.statusApprover === "반려" || r.overallStatus === "REJECTED") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] whitespace-nowrap">
          반려
        </span>
      );
    }
    if (r.statusReviewer === "보완요청" || r.overallStatus === "SUPPLEMENT") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fffbeb] text-[#b45309] border border-[#fde68a] whitespace-nowrap">
          보완요청
        </span>
      );
    }
    if (r.statusReviewer === "검토완료" || r.overallStatus === "REVIEWED") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] whitespace-nowrap">
          검토완료
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1] whitespace-nowrap">
        결재대기
      </span>
    );
  };

  const renderNumberedSection = (
    groupKey: keyof NumberedItemsMap,
    placeholderText: string
  ) => {
    const items = form.numberedItems[groupKey] || [""];
    return (
      <div className="space-y-1.5">
        {items.map((text, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="font-bold text-xs text-[#1e3a8a] dark:text-blue-400 min-w-[22px] pt-1.5 select-none">
              {idx + 1})
            </span>
            <textarea
              value={text}
              onChange={(e) => updateNumberedItem(groupKey, idx, e.target.value)}
              rows={Math.max(1, Math.ceil((text?.length || 1) / 52))}
              placeholder={placeholderText}
              className="flex-1 text-xs leading-relaxed px-2.5 py-1.5 rounded border border-transparent hover:border-[#cbd5e1] focus:border-[#2563eb] bg-transparent focus:bg-white dark:focus:bg-slate-900 text-[#0f172a] dark:text-slate-100 focus:outline-none resize-y"
            />
            <button
              type="button"
              onClick={() => removeNumberedItem(groupKey, idx)}
              className="print:hidden px-1.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition shrink-0"
              title="항목 삭제"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-full md:h-full bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 md:overflow-hidden font-sans">
      {/* Toast 알림 */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded shadow-lg text-xs font-bold border ${
            toast.type === "success"
              ? "bg-[#ecfdf5] border-[#047857] text-[#065f46]"
              : "bg-[#fef2f2] border-[#dc2626] text-[#b91c1c]"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* 상단 제어 바 (인쇄 시 숨김) */}
      <div className="print:hidden p-2.5 md:p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* 좌측: 상태 필터 & 검색 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[#dcd4c4] p-1 rounded border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 overflow-x-auto">
            {[
              { key: "ALL", label: "전체" },
              { key: "PENDING", label: "검토대기" },
              { key: "SUPPLEMENT", label: "보완요청" },
              { key: "REVIEWED", label: "검토완료" },
              { key: "APPROVED", label: "최종승인" },
              { key: "REJECTED", label: "반려" },
            ].map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setStatusFilter(st.key)}
                className={`px-2.5 py-1 text-xs font-bold rounded transition whitespace-nowrap ${
                  statusFilter === st.key
                    ? "bg-[#1e3a8a] text-white shadow-xs"
                    : "text-[#334155] hover:text-[#0f172a] dark:text-slate-300"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-[#f4efe4] dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1">
            <Search className="w-3.5 h-3.5 text-[#475569]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchReports()}
              placeholder="대상업무, 작성자, 부서 검색"
              className="bg-transparent text-xs focus:outline-none w-40 md:w-48"
            />
          </div>

          <button
            type="button"
            onClick={() => fetchReports()}
            className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] rounded border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* 우측: 주요 기능 액션 버튼군 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleNewReport}
            className="px-2.5 py-1.5 rounded bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold flex items-center gap-1 shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>신규 작성</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSample}
            className="px-2.5 py-1.5 rounded bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>샘플 채우기</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveToServer(false)}
            className="px-2.5 py-1.5 rounded bg-[#f4efe4] hover:bg-[#e5dec9] text-[#0f172a] border border-[#b5a894] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            <span>임시저장</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveToServer(true)}
            className="px-3 py-1.5 rounded bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold flex items-center gap-1 shadow-xs whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{selectedId ? "저장 및 결재반영" : "결재 상신 / 저장"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportHtml}
            className="px-2.5 py-1.5 rounded bg-[#2b6cb0] hover:bg-[#2c5282] text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>HTML 저장</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-2.5 py-1.5 rounded bg-[#334155] hover:bg-[#1e293b] text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>인쇄 / PDF</span>
          </button>

          {selectedId && (
            <button
              type="button"
              disabled={saving}
              onClick={handleDelete}
              className="px-2.5 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>삭제</span>
            </button>
          )}
        </div>
      </div>

      {/* 본문 2단 레이아웃: 좌측 보고서 목록 (3 cols) + 우측 A4 보고서 & 결재 스튜디오 (9 cols) */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-2.5 md:p-4 md:overflow-hidden">
        {/* 좌측: 업무개선활동 보고서 목록 */}
        <div className="print:hidden col-span-12 lg:col-span-3 bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col max-h-[260px] lg:max-h-none overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <div className="p-2.5 bg-[#e2dbcd] border-b border-[#b5a894] text-xs font-bold flex items-center justify-between dark:bg-slate-800 dark:border-slate-700">
            <span>보고서 목록 ({reports.length}건)</span>
            <span className="text-[11px] text-[#475569] dark:text-slate-400">
              {selectedId ? `#${selectedId} 편집중` : "신규 작성중"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#c4b6a0] dark:divide-slate-800">
            {reports.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#475569] dark:text-slate-500">
                등록된 업무개선활동 보고서가 없습니다.
                <br />
                우측 양식에서 작성 후 [결재 상신 / 저장]을 눌러주세요.
              </div>
            ) : (
              reports.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectReport(r)}
                  className={`w-full p-3 text-left transition flex flex-col gap-1.5 ${
                    selectedId === r.id
                      ? "bg-[#dbeafe] border-l-4 border-[#1d4ed8] dark:bg-blue-950/50"
                      : "hover:bg-[#e5dec9] dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[10px] font-bold text-[#1e3a8a] dark:text-blue-400">
                      {r.reportNo}
                    </span>
                    {renderOverallBadge(r)}
                  </div>

                  <div className="font-bold text-xs text-[#0f172a] dark:text-slate-100 line-clamp-1">
                    {r.summaryTarget}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#475569] dark:text-slate-400">
                    <span>
                      {r.department} · <strong className="text-[#0f172a] dark:text-slate-200">{r.nameAuthor || "-"}</strong>
                    </span>
                    <span className="font-mono text-[10px]">{r.summaryDate}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-[#475569] dark:text-slate-400 pt-0.5">
                    <span>검토: {r.nameReviewer || "-"}({r.statusReviewer})</span>
                    <span>·</span>
                    <span>승인: {r.nameApprover || "-"}({r.statusApprover})</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 우측: 업무개선활동보고서 v3 원본 스타일 양식 및 결재 스튜디오 */}
        <div className="col-span-12 lg:col-span-9 overflow-y-auto pr-0.5">
          <div
            ref={printAreaRef}
            className="max-w-[920px] mx-auto bg-white dark:bg-slate-900 text-[#1a202c] dark:text-slate-100 border border-[#cbd5e0] dark:border-slate-700 rounded shadow-md p-5 md:p-8 print:shadow-none print:border-0 print:p-0"
          >
            {/* 문서 헤더 & 우상단 3단 결재란 */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-double border-[#1a365d] dark:border-blue-400 pb-4 mb-5 gap-4">
              <div>
                <div className="text-[11px] font-bold text-[#2c5282] dark:text-blue-400 tracking-wider mb-1">
                  CONTINUOUS IMPROVEMENT REPORT
                </div>
                <h1 className="text-2xl md:text-[26px] font-extrabold text-[#1a365d] dark:text-slate-100 tracking-widest">
                  업무개선활동 보고서
                </h1>
              </div>

              {/* 결재란 테이블 (작성 / 검토 / 승인) */}
              <table className="border-collapse border border-[#cbd5e0] dark:border-slate-700 text-center text-xs w-full md:w-[300px] shrink-0">
                <thead>
                  <tr className="bg-[#edf2f7] dark:bg-slate-800">
                    <th className="border border-[#cbd5e0] dark:border-slate-700 p-1 w-1/3">
                      <input
                        type="text"
                        value={form.roleAuthor}
                        onChange={(e) => setForm({ ...form, roleAuthor: e.target.value })}
                        className="w-full text-center font-bold bg-transparent focus:outline-none"
                        title="작성자 직책"
                      />
                    </th>
                    <th className="border border-[#cbd5e0] dark:border-slate-700 p-1 w-1/3">
                      <input
                        type="text"
                        value={form.roleReviewer}
                        onChange={(e) => setForm({ ...form, roleReviewer: e.target.value })}
                        className="w-full text-center font-bold bg-transparent focus:outline-none"
                        title="검토자 직책"
                      />
                    </th>
                    <th className="border border-[#cbd5e0] dark:border-slate-700 p-1 w-1/3">
                      <input
                        type="text"
                        value={form.roleApprover}
                        onChange={(e) => setForm({ ...form, roleApprover: e.target.value })}
                        className="w-full text-center font-bold bg-transparent focus:outline-none"
                        title="승인자 직책"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="h-[62px]">
                    {/* 작성자 */}
                    <td className="border border-[#cbd5e0] dark:border-slate-700 p-1.5 align-middle">
                      <input
                        type="text"
                        value={form.nameAuthor}
                        onChange={(e) => setForm({ ...form, nameAuthor: e.target.value })}
                        placeholder="작성자 성명"
                        className="w-full text-center font-bold text-xs bg-transparent focus:outline-none"
                      />
                      <div className="text-[11px] text-[#718096] mt-1 font-mono">
                        {formatShortDate(form.summaryDate)}
                      </div>
                    </td>

                    {/* 검토자 */}
                    <td className="border border-[#cbd5e0] dark:border-slate-700 p-1.5 align-middle">
                      <input
                        type="text"
                        list="erp-emp-list"
                        value={form.nameReviewer}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matched = employees.find((emp) => emp.name === val);
                          setForm({
                            ...form,
                            nameReviewer: val,
                            reviewerId: matched ? matched.id : form.reviewerId,
                            roleReviewer:
                              matched?.duty || matched?.position || form.roleReviewer,
                          });
                        }}
                        placeholder="검토자 성명"
                        className="w-full text-center font-bold text-xs bg-transparent focus:outline-none"
                      />
                      {Boolean(selectedId) &&
                      (Number(currentUser?.id) === Number(form.reviewerId) ||
                        String(currentUser?.role || "").toUpperCase() === "MANAGER" ||
                        String(currentUser?.roleCode || "").toUpperCase() === "MANAGER" ||
                        String(currentUser?.role || "").toUpperCase() === "ADMIN") &&
                      Number(currentUser?.id) !== Number(form.authorId) ? (
                        <select
                          value={form.statusReviewer}
                          onChange={(e) =>
                            handleQuickDecision("REVIEWER", e.target.value as any)
                          }
                          className={`mt-1 text-[11px] font-bold rounded px-1.5 py-0.5 border cursor-pointer focus:outline-none ${
                            form.statusReviewer === "검토완료"
                              ? "bg-[#ebf8ff] text-[#2b6cb0] border-[#90cdf4]"
                              : form.statusReviewer === "보완요청"
                              ? "bg-[#fffaf0] text-[#dd6b20] border-[#fbd38d]"
                              : "bg-[#f7fafc] text-[#718096] border-[#cbd5e0]"
                          }`}
                        >
                          <option value="검토완료">검토완료</option>
                          <option value="보완요청">보완요청</option>
                          <option value="대기중">대기중</option>
                        </select>
                      ) : (
                        <div
                          className={`mt-1 inline-block text-[11px] font-bold rounded px-2 py-0.5 border ${
                            form.statusReviewer === "검토완료"
                              ? "bg-[#ebf8ff] text-[#2b6cb0] border-[#90cdf4]"
                              : form.statusReviewer === "보완요청"
                              ? "bg-[#fffaf0] text-[#dd6b20] border-[#fbd38d]"
                              : "bg-[#f7fafc] text-[#718096] border-[#cbd5e0]"
                          }`}
                        >
                          {form.statusReviewer}
                        </div>
                      )}
                    </td>

                    {/* 승인자 (부서장 전결) */}
                    <td className="border border-[#cbd5e0] dark:border-slate-700 p-1.5 align-middle">
                      <input
                        type="text"
                        list="erp-emp-list"
                        value={form.nameApprover}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matched = employees.find((emp) => emp.name === val);
                          setForm({
                            ...form,
                            nameApprover: val,
                            approverId: matched ? matched.id : form.approverId,
                            roleApprover: "부서장",
                          });
                        }}
                        placeholder="부서장 성명"
                        className="w-full text-center font-bold text-xs bg-transparent focus:outline-none"
                      />
                      {Boolean(selectedId) &&
                      (Number(currentUser?.id) === Number(form.approverId) ||
                        String(currentUser?.role || "").toUpperCase() === "MANAGER" ||
                        String(currentUser?.roleCode || "").toUpperCase() === "MANAGER" ||
                        String(currentUser?.role || "").toUpperCase() === "ADMIN") &&
                      Number(currentUser?.id) !== Number(form.authorId) ? (
                        <select
                          value={form.statusApprover}
                          onChange={(e) =>
                            handleQuickDecision("APPROVER", e.target.value as any)
                          }
                          className={`mt-1 text-[11px] font-bold rounded px-1.5 py-0.5 border cursor-pointer focus:outline-none ${
                            form.statusApprover === "최종승인"
                              ? "bg-[#f0fff4] text-[#2f855a] border-[#9ae6b4]"
                              : form.statusApprover === "반려"
                              ? "bg-[#fff5f5] text-[#e53e3e] border-[#feb2b2]"
                              : "bg-[#f7fafc] text-[#718096] border-[#cbd5e0]"
                          }`}
                        >
                          <option value="최종승인">최종승인</option>
                          <option value="반려">반려</option>
                          <option value="대기중">대기중</option>
                        </select>
                      ) : (
                        <div
                          className={`mt-1 inline-block text-[11px] font-bold rounded px-2 py-0.5 border ${
                            form.statusApprover === "최종승인"
                              ? "bg-[#f0fff4] text-[#2f855a] border-[#9ae6b4]"
                              : form.statusApprover === "반려"
                              ? "bg-[#fff5f5] text-[#e53e3e] border-[#feb2b2]"
                              : "bg-[#f7fafc] text-[#718096] border-[#cbd5e0]"
                          }`}
                        >
                          {form.statusApprover}
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
              <datalist id="erp-emp-list">
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.department} {emp.position}
                  </option>
                ))}
              </datalist>
            </header>

            {/* 1. 개 요 (Summary) */}
            <section className="mb-4">
              <div className="flex items-center bg-[#f8fafc] dark:bg-slate-800 border-l-4 border-[#1a365d] dark:border-blue-400 border-b border-[#cbd5e0] dark:border-slate-700 px-3 py-1.5 mb-2">
                <span className="font-bold text-sm text-[#1a365d] dark:text-blue-300 mr-1.5">
                  1.
                </span>
                <span className="font-bold text-sm text-[#1a365d] dark:text-slate-100">
                  개 요 (Summary)
                </span>
              </div>

              <div className="border border-[#cbd5e0] dark:border-slate-700 rounded p-3 space-y-2.5">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-bold text-xs text-[#2d3748] dark:text-slate-200 whitespace-nowrap">
                      가. 대 상 :
                    </span>
                    <input
                      type="text"
                      value={form.summaryTarget}
                      onChange={(e) => setForm({ ...form, summaryTarget: e.target.value })}
                      placeholder="개선 대상 업무명 또는 공정명을 입력하세요"
                      className="flex-1 text-xs font-semibold px-2.5 py-1.5 rounded border border-[#cbd5e0] dark:border-slate-700 bg-transparent focus:border-[#2c5282] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-xs text-[#2d3748] dark:text-slate-200 whitespace-nowrap">
                      나. 작성일 :
                    </span>
                    <input
                      type="date"
                      value={form.summaryDate}
                      onChange={(e) => setForm({ ...form, summaryDate: e.target.value })}
                      className="text-xs font-mono px-2.5 py-1.5 rounded border border-[#cbd5e0] dark:border-slate-700 bg-transparent focus:border-[#2c5282] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="border-t border-dashed border-[#cbd5e0] dark:border-slate-700 pt-2.5 flex flex-wrap items-center gap-3">
                  <span className="font-bold text-xs text-[#2d3748] dark:text-slate-200 whitespace-nowrap">
                    다. 개선 유형 :
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    {IMPROVE_TYPE_OPTIONS.map((typeLabel) => {
                      const checked = form.improveTypes.includes(typeLabel);
                      return (
                        <label
                          key={typeLabel}
                          className="flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleImproveType(typeLabel)}
                            className="w-3.5 h-3.5 accent-[#1a365d]"
                          />
                          <span>{typeLabel}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* 2. 현황 및 문제점 (Current State & Issues) */}
            <section className="mb-4">
              <div className="flex items-center bg-[#f8fafc] dark:bg-slate-800 border-l-4 border-[#1a365d] dark:border-blue-400 border-b border-[#cbd5e0] dark:border-slate-700 px-3 py-1.5 mb-2">
                <span className="font-bold text-sm text-[#1a365d] dark:text-blue-300 mr-1.5">
                  2.
                </span>
                <span className="font-bold text-sm text-[#1a365d] dark:text-slate-100">
                  현황 및 문제점 (Current State &amp; Issues)
                </span>
              </div>

              <div className="border border-[#cbd5e0] dark:border-slate-700 rounded p-3 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#2d3748] dark:text-slate-200">
                      <span className="text-[#2c5282] dark:text-blue-400">가.</span>
                      <span>현재 프로세스</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => addNumberedItem("currentProcGroup")}
                      className="print:hidden px-2 py-0.5 rounded bg-[#edf2f7] hover:bg-[#e2e8f0] dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-[#cbd5e0] dark:border-slate-700 text-[11px] font-bold"
                    >
                      + 항목 추가
                    </button>
                  </div>
                  <div className="pl-2">
                    {renderNumberedSection(
                      "currentProcGroup",
                      "현재 업무 진행 방식 및 현황을 입력하세요."
                    )}
                  </div>
                </div>

                <div className="border-t border-dashed border-[#cbd5e0] dark:border-slate-700 pt-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#2d3748] dark:text-slate-200">
                      <span className="text-[#2c5282] dark:text-blue-400">나.</span>
                      <span>주요 문제점</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => addNumberedItem("issueGroup")}
                      className="print:hidden px-2 py-0.5 rounded bg-[#edf2f7] hover:bg-[#e2e8f0] dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-[#cbd5e0] dark:border-slate-700 text-[11px] font-bold"
                    >
                      + 항목 추가
                    </button>
                  </div>
                  <div className="pl-2">
                    {renderNumberedSection(
                      "issueGroup",
                      "발생하고 있는 문제점 및 비효율 요인을 입력하세요."
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* 3. 개선 방안 (Proposed Solutions) */}
            <section className="mb-4">
              <div className="flex items-center bg-[#f8fafc] dark:bg-slate-800 border-l-4 border-[#1a365d] dark:border-blue-400 border-b border-[#cbd5e0] dark:border-slate-700 px-3 py-1.5 mb-2">
                <span className="font-bold text-sm text-[#1a365d] dark:text-blue-300 mr-1.5">
                  3.
                </span>
                <span className="font-bold text-sm text-[#1a365d] dark:text-slate-100">
                  개선 방안 (Proposed Solutions)
                </span>
              </div>

              <div className="border border-[#cbd5e0] dark:border-slate-700 rounded p-3 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#2d3748] dark:text-slate-200">
                      <span className="text-[#2c5282] dark:text-blue-400">가.</span>
                      <span>개선 내용</span>
                    </div>
                    <div className="print:hidden flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => addNumberedItem("solutionGroup")}
                        className="px-2 py-0.5 rounded bg-[#edf2f7] hover:bg-[#e2e8f0] dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-[#cbd5e0] dark:border-slate-700 text-[11px] font-bold"
                      >
                        + 항목 추가
                      </button>
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="px-2 py-0.5 rounded bg-[#ebf8ff] hover:bg-[#bee3f8] text-[#2b6cb0] border border-[#90cdf4] text-[11px] font-bold flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3" />
                        <span>사진 첨부</span>
                      </button>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </div>
                  </div>

                  <div className="pl-2">
                    {renderNumberedSection(
                      "solutionGroup",
                      "구체적인 실행 방안 및 개선 조치를 입력하세요."
                    )}
                  </div>

                  {/* 사진 첨부 그리드 */}
                  {form.photos.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pl-2">
                      {form.photos.map((photo, pIdx) => (
                        <div
                          key={pIdx}
                          className="border border-[#cbd5e0] dark:border-slate-700 rounded overflow-hidden bg-white dark:bg-slate-950 relative group"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                photos: prev.photos.filter((_, i) => i !== pIdx),
                              }))
                            }
                            className="print:hidden absolute top-2 right-2 w-6 h-6 rounded-full bg-black/65 hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center z-10"
                            title="사진 삭제"
                          >
                            ×
                          </button>
                          <img
                            src={photo.dataUrl}
                            alt={photo.caption || `첨부사진 ${pIdx + 1}`}
                            onClick={() => setZoomPhotoUrl(photo.dataUrl)}
                            className="w-full h-[185px] object-contain bg-[#f7fafc] dark:bg-slate-900 border-b border-[#e2e8f0] dark:border-slate-800 cursor-zoom-in"
                          />
                          <input
                            type="text"
                            value={photo.caption}
                            onChange={(e) => {
                              const nextPhotos = [...form.photos];
                              nextPhotos[pIdx] = {
                                ...nextPhotos[pIdx],
                                caption: e.target.value,
                              };
                              setForm({ ...form, photos: nextPhotos });
                            }}
                            placeholder="사진 설명 입력 (예: 개선 전 / 개선 후 비교)"
                            className="w-full px-2.5 py-1.5 text-xs font-semibold text-center bg-transparent focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 4. 기대 효과 (Expected Effects) */}
            <section className="mb-4">
              <div className="flex items-center bg-[#f8fafc] dark:bg-slate-800 border-l-4 border-[#1a365d] dark:border-blue-400 border-b border-[#cbd5e0] dark:border-slate-700 px-3 py-1.5 mb-2">
                <span className="font-bold text-sm text-[#1a365d] dark:text-blue-300 mr-1.5">
                  4.
                </span>
                <span className="font-bold text-sm text-[#1a365d] dark:text-slate-100">
                  기대 효과 (Expected Effects)
                </span>
              </div>

              <div className="border border-[#cbd5e0] dark:border-slate-700 rounded p-3 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#2d3748] dark:text-slate-200">
                      <span className="text-[#2c5282] dark:text-blue-400">가.</span>
                      <span>정량적 효과</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => addNumberedItem("quantGroup")}
                      className="print:hidden px-2 py-0.5 rounded bg-[#edf2f7] hover:bg-[#e2e8f0] dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-[#cbd5e0] dark:border-slate-700 text-[11px] font-bold"
                    >
                      + 항목 추가
                    </button>
                  </div>
                  <div className="pl-2">
                    {renderNumberedSection(
                      "quantGroup",
                      "시간 단축, 비용 절감 등 수치화된 기대 효과를 입력하세요."
                    )}
                  </div>
                </div>

                <div className="border-t border-dashed border-[#cbd5e0] dark:border-slate-700 pt-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#2d3748] dark:text-slate-200">
                      <span className="text-[#2c5282] dark:text-blue-400">나.</span>
                      <span>정성적 효과</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => addNumberedItem("qualGroup")}
                      className="print:hidden px-2 py-0.5 rounded bg-[#edf2f7] hover:bg-[#e2e8f0] dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-[#cbd5e0] dark:border-slate-700 text-[11px] font-bold"
                    >
                      + 항목 추가
                    </button>
                  </div>
                  <div className="pl-2">
                    {renderNumberedSection(
                      "qualGroup",
                      "업무 편의성, 품질 향상, 고객 만족도 등 정성적 효과를 입력하세요."
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* 5. 소요 예산 및 협조 사항 (Budget & Request) */}
            <section className="mb-4">
              <div className="flex items-center bg-[#f8fafc] dark:bg-slate-800 border-l-4 border-[#1a365d] dark:border-blue-400 border-b border-[#cbd5e0] dark:border-slate-700 px-3 py-1.5 mb-2">
                <span className="font-bold text-sm text-[#1a365d] dark:text-blue-300 mr-1.5">
                  5.
                </span>
                <span className="font-bold text-sm text-[#1a365d] dark:text-slate-100">
                  소요 예산 및 협조 사항 (Budget &amp; Request)
                </span>
              </div>

              <div className="border border-[#cbd5e0] dark:border-slate-700 rounded p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#2d3748] dark:text-slate-200">
                    <span className="text-[#2c5282] dark:text-blue-400">가.</span>
                    <span>필요 예산 및 협조 사항</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addNumberedItem("budgetGroup")}
                    className="print:hidden px-2 py-0.5 rounded bg-[#edf2f7] hover:bg-[#e2e8f0] dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-[#cbd5e0] dark:border-slate-700 text-[11px] font-bold"
                  >
                    + 항목 추가
                  </button>
                </div>
                <div className="pl-2">
                  {renderNumberedSection(
                    "budgetGroup",
                    "소요 예산 내역 및 타 부서 협조 요청 사항을 입력하세요."
                  )}
                </div>
              </div>
            </section>

            {/* 6. 파일첨부 */}
            <section className="mb-4">
              <div className="flex items-center bg-[#f8fafc] dark:bg-slate-800 border-l-4 border-[#1a365d] dark:border-blue-400 border-b border-[#cbd5e0] dark:border-slate-700 px-3 py-1.5 mb-2">
                <span className="font-bold text-sm text-[#1a365d] dark:text-blue-300 mr-1.5">
                  6.
                </span>
                <span className="font-bold text-sm text-[#1a365d] dark:text-slate-100">
                  파일첨부
                </span>
              </div>

              <div className="border border-[#cbd5e0] dark:border-slate-700 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#2d3748] dark:text-slate-200">
                    <span className="text-[#2c5282] dark:text-blue-400">가.</span>
                    <span>관련 참고 자료 및 증빙 문서</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="print:hidden px-2.5 py-1 rounded bg-[#edf2f7] hover:bg-[#e2e8f0] dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-[#cbd5e0] dark:border-slate-700 text-[11px] font-bold flex items-center gap-1"
                  >
                    <Paperclip className="w-3 h-3" />
                    <span>파일 추가</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {form.attachedFiles.length === 0 ? (
                  <div className="text-xs text-[#a0aec0] pl-2 py-1">
                    첨부된 파일이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-1.5 pl-2">
                    {form.attachedFiles.map((f, fIdx) => (
                      <div
                        key={fIdx}
                        className="flex items-center justify-between px-3 py-1.5 rounded bg-[#f8fafc] dark:bg-slate-800 border border-[#cbd5e0] dark:border-slate-700 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-3.5 h-3.5 text-[#2c5282] shrink-0" />
                          <a
                            href={f.dataUrl}
                            download={f.name}
                            className="font-semibold text-[#1a202c] dark:text-slate-100 hover:text-[#2b6cb0] hover:underline truncate"
                          >
                            {f.name}
                          </a>
                          <span className="text-[11px] text-[#718096] shrink-0">
                            ({formatFileSize(f.size)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              attachedFiles: prev.attachedFiles.filter(
                                (_, i) => i !== fIdx
                              ),
                            }))
                          }
                          className="print:hidden text-rose-600 hover:bg-rose-50 px-1.5 py-0.5 rounded font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* 7. 검토 및 승인 의견 (작성자의 작성/대기 시점에는 숨기고, 결재권자이거나 보완요청·검토완료·반려·최종승인 확정 시에만 표시) */}
            {(() => {
              const hasDecisionFeedback =
                form.statusReviewer === "보완요청" ||
                form.statusReviewer === "검토완료" ||
                form.statusApprover === "최종승인" ||
                form.statusApprover === "반려" ||
                Boolean(form.commentReviewer?.trim()) ||
                Boolean(form.commentApprover?.trim());

              const isDecisionMaker =
                Boolean(selectedId) &&
                (Number(currentUser?.id) === Number(form.reviewerId) ||
                  Number(currentUser?.id) === Number(form.approverId) ||
                  String(currentUser?.role || "").toUpperCase() === "MANAGER" ||
                  String(currentUser?.roleCode || "").toUpperCase() === "MANAGER" ||
                  String(currentUser?.role || "").toUpperCase() === "ADMIN") &&
                Number(currentUser?.id) !== Number(form.authorId);

              const showFeedbackSection = Boolean(selectedId) && (hasDecisionFeedback || isDecisionMaker);

              if (!showFeedbackSection) return null;

              return (
                <section className="mb-3">
                  <div className="flex items-center bg-[#f8fafc] dark:bg-slate-800 border-l-4 border-[#1a365d] dark:border-blue-400 border-b border-[#cbd5e0] dark:border-slate-700 px-3 py-1.5 mb-2">
                    <span className="font-bold text-sm text-[#1a365d] dark:text-blue-300 mr-1.5">
                      7.
                    </span>
                    <span className="font-bold text-sm text-[#1a365d] dark:text-slate-100">
                      검토 및 승인 의견 (Review &amp; Approval Feedback)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 검토자 의견 카드 */}
                    <div className="border border-[#cbd5e0] dark:border-slate-700 rounded bg-[#f8fafc] dark:bg-slate-800/60 p-3 flex flex-col">
                      <div className="flex items-center justify-between border-b border-dashed border-[#cbd5e0] dark:border-slate-700 pb-1.5 mb-2">
                        <span className="font-bold text-xs text-[#2c5282] dark:text-blue-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#2b6cb0]" />
                          <span>검토자 의견 ({form.nameReviewer || "검토자"})</span>
                        </span>
                        <input
                          type="text"
                          value={form.dateReviewer}
                          readOnly={!isDecisionMaker}
                          onChange={(e) =>
                            setForm({ ...form, dateReviewer: e.target.value })
                          }
                          placeholder="일자"
                          className="text-[11px] text-[#718096] text-right w-24 bg-transparent focus:outline-none"
                        />
                      </div>
                      <textarea
                        value={form.commentReviewer}
                        readOnly={!isDecisionMaker}
                        onChange={(e) =>
                          setForm({ ...form, commentReviewer: e.target.value })
                        }
                        rows={3}
                        placeholder={
                          isDecisionMaker
                            ? "검토 의견 또는 보완 요청 사항을 기재하세요."
                            : "등록된 검토 의견이 없습니다."
                        }
                        className="w-full text-xs leading-relaxed p-2 rounded border border-transparent focus:border-[#2c5282] bg-white/70 dark:bg-slate-900 focus:outline-none resize-y"
                      />
                      {/* 검토자 원클릭 결재 버튼 (결재권자에게만 노출) */}
                      {isDecisionMaker && (
                        <div className="print:hidden flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-[#e2e8f0] dark:border-slate-700">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleQuickDecision("REVIEWER", "보완요청")}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                              form.statusReviewer === "보완요청"
                                ? "bg-[#dd6b20] text-white border-[#c05621]"
                                : "bg-white dark:bg-slate-900 text-[#dd6b20] border-[#fbd38d] hover:bg-[#fffaf0]"
                            }`}
                          >
                            보완요청 확정
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleQuickDecision("REVIEWER", "검토완료")}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                              form.statusReviewer === "검토완료"
                                ? "bg-[#2b6cb0] text-white border-[#2c5282]"
                                : "bg-white dark:bg-slate-900 text-[#2b6cb0] border-[#90cdf4] hover:bg-[#ebf8ff]"
                            }`}
                          >
                            검토완료 확정
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 승인자 의견 카드 */}
                    <div className="border border-[#cbd5e0] dark:border-slate-700 rounded bg-[#f8fafc] dark:bg-slate-800/60 p-3 flex flex-col">
                      <div className="flex items-center justify-between border-b border-dashed border-[#cbd5e0] dark:border-slate-700 pb-1.5 mb-2">
                        <span className="font-bold text-xs text-[#1a365d] dark:text-emerald-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#2f855a]" />
                          <span>승인자 의견 ({form.nameApprover || "승인자"})</span>
                        </span>
                        <input
                          type="text"
                          value={form.dateApprover}
                          readOnly={!isDecisionMaker}
                          onChange={(e) =>
                            setForm({ ...form, dateApprover: e.target.value })
                          }
                          placeholder="일자"
                          className="text-[11px] text-[#718096] text-right w-24 bg-transparent focus:outline-none"
                        />
                      </div>
                      <textarea
                        value={form.commentApprover}
                        readOnly={!isDecisionMaker}
                        onChange={(e) =>
                          setForm({ ...form, commentApprover: e.target.value })
                        }
                        rows={3}
                        placeholder={
                          isDecisionMaker
                            ? "최종 승인 의견 또는 반려 사유를 기재하세요."
                            : "등록된 승인 의견이 없습니다."
                        }
                        className="w-full text-xs leading-relaxed p-2 rounded border border-transparent focus:border-[#2c5282] bg-white/70 dark:bg-slate-900 focus:outline-none resize-y"
                      />
                      {/* 승인자 원클릭 결재 버튼 (결재권자에게만 노출) */}
                      {isDecisionMaker && (
                        <div className="print:hidden flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-[#e2e8f0] dark:border-slate-700">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleQuickDecision("APPROVER", "반려")}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                              form.statusApprover === "반려"
                                ? "bg-[#e53e3e] text-white border-[#c53030]"
                                : "bg-white dark:bg-slate-900 text-[#e53e3e] border-[#feb2b2] hover:bg-[#fff5f5]"
                            }`}
                          >
                            반려 확정
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleQuickDecision("APPROVER", "최종승인")}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                              form.statusApprover === "최종승인"
                                ? "bg-[#2f855a] text-white border-[#276749]"
                                : "bg-white dark:bg-slate-900 text-[#2f855a] border-[#9ae6b4] hover:bg-[#f0fff4]"
                            }`}
                          >
                            최종승인 확정
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* 푸터 */}
            <footer className="mt-4 pt-2.5 border-t border-[#cbd5e0] dark:border-slate-700 flex items-center justify-between text-[11px] text-[#718096]">
              <span>문서양식: WIR-2026-REV3 ({form.reportNo || "신규 작성"})</span>
              <span className="flex items-center gap-1">
                <span>작성부서:</span>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-28 border-b border-transparent hover:border-[#cbd5e0] focus:border-[#2c5282] bg-transparent text-[#4a5568] dark:text-slate-300 text-[11px] focus:outline-none"
                />
              </span>
            </footer>
          </div>
        </div>
      </div>

      {/* 사진 클릭 확대 모달 */}
      {zoomPhotoUrl && (
        <div
          onClick={() => setZoomPhotoUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={zoomPhotoUrl}
            alt="확대 이미지"
            className="max-w-[92vw] max-h-[90vh] rounded shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
