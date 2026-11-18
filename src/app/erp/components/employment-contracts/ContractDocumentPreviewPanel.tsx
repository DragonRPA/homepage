"use client";

import React from "react";
import {
  FileText,
  Printer,
  ShieldCheck,
  Eye,
  Upload,
} from "lucide-react";
import {
  EmploymentContractFormState,
  RightViewMode,
  formatKoreanDateParts,
} from "./employmentContractTypes";

export interface ContractDocumentPreviewPanelProps {
  form: EmploymentContractFormState;
  rightViewMode: RightViewMode;
  setRightViewMode: (mode: RightViewMode) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  pledgeFileInputRef: React.RefObject<HTMLInputElement | null>;
  handlePrintDocument: () => void;
}

export const ContractDocumentPreviewPanel: React.FC<
  ContractDocumentPreviewPanelProps
> = ({
  form,
  rightViewMode,
  setRightViewMode,
  fileInputRef,
  pledgeFileInputRef,
  handlePrintDocument,
}) => {
  const startParts = formatKoreanDateParts(form.startDate);
  const contractParts = formatKoreanDateParts(form.contractDate);
  const pledgeParts = formatKoreanDateParts(form.pledgeDate || form.contractDate);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#f4efe4] dark:bg-slate-900 overflow-hidden">
      {/* 탭 전환 바 */}
      <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setRightViewMode("DOCUMENT")}
            className={`px-2.5 py-1 rounded text-xs font-bold border whitespace-nowrap transition ${
              rightViewMode === "DOCUMENT"
                ? "bg-[#1d4ed8] text-white border-[#1e40af]"
                : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
            }`}
          >
            ① 근로계약서 양식
          </button>

          <button
            type="button"
            onClick={() => setRightViewMode("SCAN")}
            className={`px-2.5 py-1 rounded text-xs font-bold border whitespace-nowrap transition flex items-center gap-1 ${
              rightViewMode === "SCAN"
                ? "bg-[#1d4ed8] text-white border-[#1e40af]"
                : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>② 근로계약서 스캔본 {form.scanFileUrl ? "(보유)" : "(미첨부)"}</span>
          </button>

          <button
            type="button"
            onClick={() => setRightViewMode("PLEDGE_DOC")}
            className={`px-2.5 py-1 rounded text-xs font-bold border whitespace-nowrap transition flex items-center gap-1 ${
              rightViewMode === "PLEDGE_DOC"
                ? "bg-[#5b21b6] text-white border-[#4c1d95]"
                : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>③ 정보보호서약서 양식 (입사 1회)</span>
          </button>

          <button
            type="button"
            onClick={() => setRightViewMode("PLEDGE_SCAN")}
            className={`px-2.5 py-1 rounded text-xs font-bold border whitespace-nowrap transition flex items-center gap-1 ${
              rightViewMode === "PLEDGE_SCAN"
                ? "bg-[#5b21b6] text-white border-[#4c1d95]"
                : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>④ 보안서약서 스캔본 {form.pledgeScanUrl ? "(보유)" : "(미첨부)"}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {rightViewMode === "SCAN" && form.scanFileUrl && (
            <a
              href={
                form.scanFileUrl.startsWith("/api/erp/vault")
                  ? `${form.scanFileUrl}&download=1&filename=${encodeURIComponent(
                      form.scanFileName || `근로계약서_${form.employeeName}.pdf`
                    )}`
                  : form.scanFileUrl
              }
              download={form.scanFileName || `근로계약서_${form.employeeName}.pdf`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded whitespace-nowrap"
            >
              계약스캔 다운로드
            </a>
          )}
          {rightViewMode === "PLEDGE_SCAN" && form.pledgeScanUrl && (
            <a
              href={
                form.pledgeScanUrl.startsWith("/api/erp/vault")
                  ? `${form.pledgeScanUrl}&download=1&filename=${encodeURIComponent(
                      form.pledgeScanName || `보안서약서_${form.employeeName}.pdf`
                    )}`
                  : form.pledgeScanUrl
              }
              download={form.pledgeScanName || `보안서약서_${form.employeeName}.pdf`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 bg-[#5b21b6] hover:bg-[#4c1d95] text-white text-xs font-bold rounded whitespace-nowrap"
            >
              서약스캔 다운로드
            </a>
          )}
          <button
            type="button"
            onClick={handlePrintDocument}
            className="px-2.5 py-1 bg-[#334155] hover:bg-[#1e293b] text-white text-xs font-bold rounded flex items-center gap-1 whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>A4 출력</span>
          </button>
        </div>
      </div>

      {/* 우측 본문 영역 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-5 bg-[#dcd4c4] dark:bg-slate-950 flex justify-center items-start">
        {rightViewMode === "SCAN" ? (
          form.scanFileUrl ? (
            <div className="w-full h-full min-h-[650px] bg-white rounded border border-[#b5a894] overflow-hidden flex flex-col">
              {form.scanFileUrl.startsWith("data:image/") ||
              /\.(png|jpg|jpeg|webp)$/i.test(form.scanFileUrl) ? (
                <img
                  src={form.scanFileUrl}
                  alt="근로계약서 스캔본"
                  className="max-w-full h-auto mx-auto p-4"
                />
              ) : (
                <iframe
                  src={form.scanFileUrl}
                  title="근로계약서 스캔 PDF"
                  className="w-full flex-1 min-h-[680px]"
                />
              )}
            </div>
          ) : (
            <div className="w-full max-w-lg my-auto p-8 bg-[#f4efe4] dark:bg-slate-900 rounded border border-[#b5a894] dark:border-slate-800 text-center space-y-3">
              <FileText className="w-10 h-10 mx-auto text-[#64748b]" />
              <div className="text-sm font-bold">
                등록된 근로계약서 스캔본이 없습니다 ({form.employeeName} · {form.contractYear}년)
              </div>
              <p className="text-xs text-[#475569] dark:text-slate-400">
                서명 완료된 근로계약서 스캔본(PDF 또는 이미지)을 업로드하면 연도별로 영구 보관하고 언제든 조회할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded inline-flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>근로계약서 스캔본 파일 업로드</span>
              </button>
            </div>
          )
        ) : rightViewMode === "PLEDGE_SCAN" ? (
          form.pledgeScanUrl ? (
            <div className="w-full h-full min-h-[650px] bg-white rounded border border-[#b5a894] overflow-hidden flex flex-col">
              {form.pledgeScanUrl.startsWith("data:image/") ||
              /\.(png|jpg|jpeg|webp)$/i.test(form.pledgeScanUrl) ? (
                <img
                  src={form.pledgeScanUrl}
                  alt="보안서약서 스캔본"
                  className="max-w-full h-auto mx-auto p-4"
                />
              ) : (
                <iframe
                  src={form.pledgeScanUrl}
                  title="보안서약서 스캔 PDF"
                  className="w-full flex-1 min-h-[680px]"
                />
              )}
            </div>
          ) : (
            <div className="w-full max-w-lg my-auto p-8 bg-[#f4efe4] dark:bg-slate-900 rounded border border-[#b5a894] dark:border-slate-800 text-center space-y-3">
              <ShieldCheck className="w-10 h-10 mx-auto text-[#5b21b6]" />
              <div className="text-sm font-bold">
                등록된 보안서약서 스캔본이 없습니다 ({form.employeeName})
              </div>
              <p className="text-xs text-[#475569] dark:text-slate-400">
                입사 시 1회 작성한 정보보호(보안) 서약서 스캔본을 업로드하면 해당 사원의 인사/계약 기록에 영구 보관됩니다.
              </p>
              <button
                type="button"
                onClick={() => pledgeFileInputRef.current?.click()}
                className="px-4 py-2 bg-[#5b21b6] hover:bg-[#4c1d95] text-white text-xs font-bold rounded inline-flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>보안서약서 스캔본 업로드</span>
              </button>
            </div>
          )
        ) : rightViewMode === "PLEDGE_DOC" ? (
          /* ③ 정보보호 서약서 A4 표준 양식 */
          <div
            id="printable-active-document"
            className="w-full max-w-[760px] bg-white text-black p-8 md:p-12 rounded shadow-md border border-[#b5a894] font-serif leading-relaxed text-[14px]"
          >
            {/* 공식 발행 문서 상단 CI 헤더 */}
            <div className="flex items-center justify-between border-b border-neutral-300 pb-3 mb-6">
              <div className="flex items-center gap-2.5">
                <img
                  src="/ci-dragonrpa.png"
                  alt="주식회사 드래곤알피에이 CI"
                  className="w-11 h-11 object-contain"
                />
                <div className="font-sans leading-tight">
                  <div className="text-xs font-extrabold text-neutral-900">
                    {form.employerName}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">
                    DRAGON RPA CO., LTD. · 공식 인사/보안 서식
                  </div>
                </div>
              </div>
              <div className="text-right font-mono text-[10.5px] text-neutral-500">
                문서번호: {form.contractNo || "SP-OFFICIAL"}
              </div>
            </div>

            <div className="text-center mb-8 pt-2">
              <h1 className="text-2xl font-bold tracking-[0.25em] underline underline-offset-8">
                정보보호 서약서
              </h1>
            </div>

            <p className="mb-6 leading-7 text-[14.5px]">
              본인은 {form.employerName}(이하 &ldquo;회사&rdquo;)의 정보보호와 관련하여 다음의
              각 사항을 준수할 것을 서약합니다.
            </p>

            <div className="text-center font-bold my-6 tracking-widest">- 다 음 -</div>

            <div className="space-y-4 text-[14px] leading-7">
              <div className="flex gap-2">
                <span className="font-semibold shrink-0">1.</span>
                <span>
                  정보통신망 이용촉진 및 정보보호 등에 관한 법률에 따른 회사의 정보보호 지침을
                  준수하겠습니다.
                </span>
              </div>

              <div className="flex gap-2">
                <span className="font-semibold shrink-0">2.</span>
                <span>
                  업무를 수행함에 있어서 취득한 정보에 대한 모든 권리가 회사 소유임을
                  확약합니다.
                </span>
              </div>

              <div className="flex gap-2">
                <span className="font-semibold shrink-0">3.</span>
                <span>
                  업무 수행 중 알게 된 고객에 관한 일체의 정보 및 회사의 영업비밀(경영정보,
                  재무정보, 고객정보 등)을 회사 및 고객의 승인 없이 제 3자에게 판매, 대여, 유통
                  등을 하지 않겠습니다.
                </span>
              </div>

              <div className="flex gap-2">
                <span className="font-semibold shrink-0">4.</span>
                <span>
                  고객의 정보를 수집할 때에는 업무상 필요한 정보 이외의 것을 확인하지 않으며,
                  본인에게 접근이 허용되지 않은 정보에 대한 접근통제 규칙을 준수하겠습니다.
                </span>
              </div>

              <div className="flex gap-2">
                <span className="font-semibold shrink-0">5.</span>
                <span>
                  업무 프로그램, 전산기기, 시설물 등을 훼손하거나 외부로 유출되지 않도록 하고,
                  보안 구역에 대한 접근통제 규칙을 준수하겠습니다.
                </span>
              </div>

              <div className="flex gap-2">
                <span className="font-semibold shrink-0">6.</span>
                <span>
                  고객의 정보유출이나 정보보호 위반사례를 발견할 때에는 지체없이 회사에
                  보고하겠습니다.
                </span>
              </div>

              <div className="flex gap-2">
                <span className="font-semibold shrink-0">7.</span>
                <span>
                  만약 서약사항을 위반하여 회사의 업무에 손해를 끼친 경우 민형사상의 책임과
                  관계법령 및 회사의 규정에 의한 조치를 따르겠습니다.
                </span>
              </div>
            </div>

            {/* 서약일자 */}
            <div className="text-right font-bold text-[15px] my-12 pr-12 tracking-widest">
              {pledgeParts.y} 년 {pledgeParts.m} 월 {pledgeParts.d} 일
            </div>

            {/* 주민등록번호 / 성명 / 귀중 */}
            <div className="flex flex-col items-end space-y-4 text-[15px] pr-4">
              <div className="w-80 flex items-center justify-between">
                <span className="font-semibold">주민등록번호 :</span>
                <span className="font-mono font-bold tracking-wider">
                  {form.residentRegNo || "______ - _______"}
                </span>
              </div>

              <div className="w-80 flex items-center justify-between">
                <span className="font-semibold">
                  성 명 :{" "}
                  <span className="font-bold text-lg ml-2">
                    {form.employeeName || "          "}
                  </span>
                </span>
                <span className="text-neutral-700">(서명/날인)</span>
              </div>

              <div className="w-80 pt-4 flex items-center gap-2.5 text-left font-bold text-base tracking-wide">
                <img
                  src="/ci-dragonrpa.png"
                  alt="주식회사 드래곤알피에이 CI"
                  className="w-7 h-7 object-contain"
                />
                <span>{form.employerName} 귀중</span>
              </div>
            </div>
          </div>
        ) : (
          /* ① 표준 근로계약서 A4 문서 양식 */
          <div
            id="printable-active-document"
            className="w-full max-w-[760px] bg-white text-black p-6 md:px-9 md:py-7 rounded shadow-md border border-[#b5a894] font-serif leading-snug text-[13.5px]"
          >
            {/* 공식 발행 문서 상단 CI 헤더 */}
            <div className="flex items-center justify-between border-b border-neutral-300 pb-2 mb-3.5">
              <div className="flex items-center gap-2.5">
                <img
                  src="/ci-dragonrpa.png"
                  alt="주식회사 드래곤알피에이 CI"
                  className="w-9 h-9 object-contain"
                />
                <div className="font-sans leading-tight">
                  <div className="text-xs font-extrabold text-neutral-900">
                    {form.employerName}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">
                    DRAGON RPA CO., LTD. · 표준 근로계약서
                  </div>
                </div>
              </div>
              <div className="text-right font-mono text-[10.5px] text-neutral-500">
                계약번호: {form.contractNo || "신규발행"}
              </div>
            </div>

            {/* 타이틀 박스 */}
            <div className="border border-black py-2 px-8 mx-auto w-64 text-center mb-4">
              <h1 className="text-xl font-bold tracking-[0.25em]">근 로 계 약 서</h1>
            </div>

            {/* 전문 */}
            <p className="mb-3.5 leading-6 text-[13.5px]">
              <span className="inline-block border-b border-black px-2 font-bold">
                {form.employerName}
              </span>{" "}
              (이하 &ldquo;사업주&rdquo;라 함)과(와){" "}
              <span className="inline-block border-b border-black px-3 font-bold">
                {form.employeeName || "          "}
              </span>{" "}
              (이하 &ldquo;근로자&rdquo;라 함)은 다음과 같이 근로계약을 체결한다.
            </p>

            {/* 조항 1 ~ 9 */}
            <div className="space-y-2.5 text-[13.5px]">
              <div>
                <div className="font-semibold">
                  1. 근로계약기간 :{" "}
                  <span className="font-bold">
                    {startParts.y} 년 {startParts.m} 월 {startParts.d} 일부터
                  </span>
                  {form.endDate ? (
                    <span className="font-bold">
                      {" "}
                      ~ {formatKoreanDateParts(form.endDate).y} 년{" "}
                      {formatKoreanDateParts(form.endDate).m} 월{" "}
                      {formatKoreanDateParts(form.endDate).d} 일까지
                    </span>
                  ) : (
                    ""
                  )}
                </div>
                <div className="text-[11.5px] text-neutral-700 pl-4 mt-0.5">
                  ※ 근로계약기간을 정하지 않는 경우에는 &ldquo;근로개시일&rdquo;만 기재
                </div>
              </div>

              <div>
                <span className="font-semibold">2. 근 무 장 소 : </span>
                <span>{form.workplace}</span>
              </div>

              <div>
                <span className="font-semibold">3. 업무의 내용 : </span>
                <span>{form.jobDescription}</span>
              </div>

              <div>
                <span className="font-semibold">4. 소정근로시간 : </span>
                <span className="underline underline-offset-4">
                  {form.workStartTime.split(":")[0] || "09"} 시{" "}
                  {form.workStartTime.split(":")[1] || "00"} 분
                </span>
                부터{" "}
                <span className="underline underline-offset-4">
                  {form.workEndTime.split(":")[0] || "18"} 시{" "}
                  {form.workEndTime.split(":")[1] || "00"} 분
                </span>
                까지 (휴게시간 : 총 {form.breakMinutes}분)
              </div>

              <div>
                <span className="font-semibold">5. 근무일/휴일 : </span>
                <span>
                  {form.workDays}, {form.weeklyHoliday}
                </span>
              </div>

              <div>
                <div className="font-semibold mb-0.5">6. 임 금</div>
                <div className="pl-4 space-y-0.5">
                  <div>
                    - 월(일, 시간)급 :{" "}
                    <span className="font-bold underline underline-offset-4">
                      월 {Number(form.baseSalary || 0).toLocaleString()} 원
                    </span>{" "}
                    ({form.hourlyWageNote || "시급은 통상시급"})
                  </div>
                  <div>
                    - 기타급여(제수당 등) :{" "}
                    <span>
                      식대 월 {Number(form.mealAllowance || 0).toLocaleString()} 원
                      {Number(form.vehicleAllowance || 0) > 0
                        ? `, 차량보조금 월 ${Number(
                            form.vehicleAllowance
                          ).toLocaleString()} 원`
                        : ""}
                      {Number(form.otherAllowance || 0) > 0
                        ? `, ${form.otherAllowanceLabel || "기타수당"} 월 ${Number(
                            form.otherAllowance
                          ).toLocaleString()} 원`
                        : ""}
                    </span>
                  </div>
                  <div>
                    - 임금지급일 : 매월(매주 또는 매일){" "}
                    <span className="font-bold underline underline-offset-4">
                      {form.payDay} 일
                    </span>
                    (휴일의 경우는 전일 지급)
                  </div>
                  <div>- 지급방법 : {form.payMethod}</div>
                </div>
              </div>

              <div>
                <div className="font-semibold">7. 연차유급휴가</div>
                <div className="pl-4">
                  - 연차유급휴가는 근로기준법에서 정하는 바에 따라 부여함
                </div>
              </div>

              <div>
                <div className="font-semibold">8. 근로계약서 교부</div>
                <div className="pl-4">
                  - 사업주는 근로계약을 체결함과 동시에 본 계약서를 사본하여 근로자의
                  교부요구와 관계없이 근로자에게 교부함(근로기준법 제17조 이행)
                </div>
              </div>

              <div>
                <div className="font-semibold">9. 기 타</div>
                <div className="pl-4">
                  - 이 계약에 정함이 없는 사항은 근로기준법령에 의함
                </div>
              </div>
            </div>

            {/* 계약 체결일 */}
            <div className="text-center font-bold text-[14.5px] my-4 tracking-widest">
              {contractParts.y} 년 {contractParts.m} 월 {contractParts.d} 일
            </div>

            {/* 사업주 & 근로자 서명란 */}
            <div className="space-y-2.5 text-[13.5px] pt-2 pb-2 border-t border-neutral-300">
              <div className="grid grid-cols-12 gap-y-0.5">
                <div className="col-span-2 font-bold">(사업주)</div>
                <div className="col-span-10 space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <img
                        src="/ci-dragonrpa.png"
                        alt="CI"
                        className="w-5 h-5 object-contain inline-block"
                      />
                      <span>사업체명 : {form.employerName}</span>
                    </span>
                    <span>(전화 : {form.employerPhone})</span>
                  </div>
                  <div>주 소 : {form.employerAddress}</div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span>대 표 자 : {form.employerRep}</span>
                    <span className="pr-8 font-semibold">(서명)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-y-0.5 pt-1.5">
                <div className="col-span-2 font-bold">(근로자)</div>
                <div className="col-span-10 space-y-0.5">
                  <div>주 소 : {form.employeeAddress}</div>
                  <div>연 락 처 : {form.employeePhone}</div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="font-bold">성 명 : {form.employeeName}</span>
                    <span className="pr-8 font-semibold">(서명)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
