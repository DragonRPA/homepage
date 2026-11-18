"use client";

import React from "react";
import { AlertCircle, Cloud, Copy, Monitor, Smartphone, X } from "lucide-react";

export interface R2SyncConfig {
  hasCredentials: boolean;
  endpointMasked: string;
  region: string;
  bucket: string;
  vaultPrefix: string;
}

export interface ObsidianSyncAndErrorModalsProps {
  errorModalMsg: string | null;
  onCloseErrorModal: () => void;
  showSyncGuideModal: boolean;
  onCloseSyncGuideModal: () => void;
  r2Config: R2SyncConfig | null;
  onCopyText: (label: string, val: string) => void;
}

export const ObsidianSyncAndErrorModals: React.FC<ObsidianSyncAndErrorModalsProps> = ({
  errorModalMsg,
  onCloseErrorModal,
  showSyncGuideModal,
  onCloseSyncGuideModal,
  r2Config,
  onCopyText,
}) => {
  return (
    <>
      {/* 에러 모달 */}
      {errorModalMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#f4efe4] border border-red-400 rounded w-full max-w-md p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#c5bba8] pb-2 mb-3">
              <div className="flex items-center gap-1.5 text-red-700 font-bold text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>오류 안내</span>
              </div>
              <button onClick={onCloseErrorModal} className="text-[#64748b] hover:text-[#0f172a]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#1e293b] whitespace-pre-wrap mb-4">{errorModalMsg}</p>
            <div className="flex justify-end">
              <button
                onClick={onCloseErrorModal}
                className="px-3 py-1.5 bg-[#0f172a] text-white rounded text-xs font-bold"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PC·핸드폰 옵시디언 앱 직결 동기화 설정 모달 */}
      {showSyncGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6">
          <div className="bg-[#f4efe4] border border-[#b8ae99] rounded w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-4 py-3 bg-[#e2dbcd] border-b border-[#c5bba8] flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold text-sm text-[#0f172a]">
                <Cloud className="w-4 h-4 text-violet-700" />
                <span>PC 옵시디언 ↔ 핸드폰 옵시디언 ↔ 드래곤ERP 통합 동기화 설정</span>
              </div>
              <button onClick={onCloseSyncGuideModal} className="text-[#475569] hover:text-[#0f172a]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs text-[#1e293b]">
              {/* 방법 1: 가장 쉽고 빠른 ERP + PC 로컬 폴더 동기화 */}
              <div className="p-3 rounded border border-violet-300 bg-violet-50/70 space-y-1.5">
                <div className="font-extrabold text-violet-950 text-sm flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-violet-700" />
                  <span>방법 1 (가장 간편): PC에서는 옵시디언 폴더 연동 + 핸드폰에서는 ERP 웹 접속</span>
                </div>
                <p className="text-[#334155] leading-relaxed">
                  1. PC에서 상단의 <strong>[PC 옵시디언 폴더 연동/동기화]</strong> 버튼을 클릭하고, 현재 PC에서 사용 중인 옵시디언 Vault 폴더를 선택합니다.
                  <br />
                  2. 선택 즉시 내 PC 옵시디언의 모든 <code>.md</code> 노트가 ERP로 올라오고, 반대로 핸드폰(ERP 모바일)에서 작성한 노트가 내 PC 옵시디언 폴더에 실제 <code>.md</code> 파일로 자동 생성됩니다.
                </p>
              </div>

              {/* 방법 2: PC 옵시디언 앱과 핸드폰 옵시디언 네이티브 앱을 직접 동기화 (Remotely Save + Cloudflare R2) */}
              <div className="p-3 rounded border border-[#c5bba8] bg-[#ebe5d8] space-y-2.5">
                <div className="font-extrabold text-[#0f172a] text-sm flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-blue-700" />
                  <span>
                    방법 2 (PC 앱 ↔ 폰 앱 직결): 옵시디언 무료 플러그인 「Remotely Save」 + 당사 Cloudflare R2 연동
                  </span>
                </div>
                <p className="text-[#334155] leading-relaxed">
                  유료 Obsidian Sync(월 $5)를 결제할 필요 없이, 드래곤알피에이 전용 <strong>Cloudflare R2(S3 호환 스토리지)</strong>를 통해 PC용 옵시디언 앱과 스마트폰(안드로이드/아이폰) 옵시디언 앱을 100% 무료로 실시간 동기화할 수 있습니다.
                </p>

                <ol className="list-decimal list-inside space-y-1 text-[#1e293b] font-semibold bg-[#f4efe4] p-2.5 rounded border border-[#c5bba8]">
                  <li>
                    PC 옵시디언과 핸드폰 옵시디언 앱에서 <strong>[설정 ➔ 커뮤니티 플러그인 ➔ 탐색]</strong>으로 이동하여 <strong><code>Remotely Save</code></strong>를 검색 후 설치·활성화합니다.
                  </li>
                  <li>
                    <code>Remotely Save</code> 설정에서 <strong>Choose Service</strong>를 <strong><code>S3 or S3-Compatible</code></strong>로 선택합니다.
                  </li>
                  <li>
                    아래 당사 전용 R2 S3 접속 정보를 복사하여 PC와 핸드폰에 동일하게 붙여넣고 <strong>Check Connectivity</strong>를 누르면 설정이 끝납니다.
                  </li>
                </ol>

                {r2Config && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#0f172a]">
                        Cloudflare R2 서버 보안 볼트 연동 상태
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          r2Config.hasCredentials ? "bg-emerald-700 text-white" : "bg-rose-700 text-white"
                        }`}
                      >
                        {r2Config.hasCredentials ? "서버 키 연동됨" : "서버 키 미설정"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-[#f4efe4] border border-[#c5bba8]">
                        <div className="text-[10px] font-bold text-[#64748b]">Endpoint</div>
                        <div className="font-mono font-bold truncate">{r2Config.endpointMasked || "-"}</div>
                      </div>

                      <div className="p-2 rounded bg-[#f4efe4] border border-[#c5bba8] flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-[#64748b]">Region / Bucket</div>
                          <div className="font-mono font-bold truncate">
                            Region: <span className="text-violet-800">{r2Config.region}</span> | Bucket:{" "}
                            <span className="text-blue-800">{r2Config.bucket}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onCopyText("Bucket Name", r2Config.bucket)}
                          className="px-2 py-1 rounded bg-[#e2dbcd] hover:bg-[#d5ccb8] font-bold text-[11px] shrink-0 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> 복사
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-[#f4efe4] border border-[#c5bba8] text-[11px] text-[#334155]">
                      Access Key 및 Secret Key는 보안 정책에 따라 브라우저로 전송되지 않으며, 서버 환경에서만 처리됩니다.
                      모바일/PC 외부 앱 직결 키 발급은 시스템 관리자에게 문의하십시오.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-2.5 bg-[#e2dbcd] border-t border-[#c5bba8] flex justify-end">
              <button
                type="button"
                onClick={onCloseSyncGuideModal}
                className="px-4 py-1.5 rounded bg-[#0f172a] text-white text-xs font-bold"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
