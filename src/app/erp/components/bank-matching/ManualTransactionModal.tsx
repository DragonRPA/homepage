"use client";

import React from "react";
import { Building2 } from "lucide-react";
import { formatErpInputNumber, formatErpSignedInputNumber } from "@/lib/erpFormat";
import { NewTransactionState } from "./bankMatchingTypes";

export interface ManualTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newTrans: NewTransactionState;
  setNewTrans: React.Dispatch<React.SetStateAction<NewTransactionState>>;
}

export const ManualTransactionModal: React.FC<ManualTransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  newTrans,
  setNewTrans,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-md shadow-2xl text-[#0f172a] dark:bg-slate-900 dark:border-slate-800 dark:text-white"
      >
        <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 mb-4 pb-2 border-b border-[#b5a894] dark:border-slate-800 flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
          <span>은행 거래내역 등록</span>
        </h2>

        <div className="space-y-3">
          <div className="flex flex-col gap-1.5 p-2.5 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-950 dark:border-slate-800">
            <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
              입출금 계좌 선택
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() =>
                  setNewTrans((prev) => ({
                    ...prev,
                    entityType: "CORP",
                    accountNo: "478-081383-04-018",
                  }))
                }
                className={`p-2 rounded border text-left transition ${
                  newTrans.accountNo === "478-081383-04-018"
                    ? "border-[#1d4ed8] bg-[#dbeafe] text-[#1e40af] font-bold shadow-xs"
                    : "border-[#b5a894] bg-[#ebe5d8] text-[#334155]"
                }`}
              >
                <div>(주)드래곤알피에이 [법인]</div>
                <div className="font-mono text-[10px] opacity-75">478-081383-04-018</div>
              </button>
              <button
                type="button"
                onClick={() =>
                  setNewTrans((prev) => ({
                    ...prev,
                    entityType: "INDIVIDUAL",
                    accountNo: "140-129404-04-018",
                  }))
                }
                className={`p-2 rounded border text-left transition ${
                  newTrans.accountNo === "140-129404-04-018"
                    ? "border-[#b45309] bg-[#fef3c7] text-[#92400e] font-bold shadow-xs"
                    : "border-[#b5a894] bg-[#ebe5d8] text-[#334155]"
                }`}
              >
                <div>드래곤알피에이 [개인]</div>
                <div className="font-mono text-[10px] opacity-75">140-129404-04-018</div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                거래일자
              </label>
              <input
                type="date"
                value={newTrans.transDate}
                onChange={(e) => setNewTrans((prev) => ({ ...prev, transDate: e.target.value }))}
                className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                거래시간
              </label>
              <input
                type="text"
                value={newTrans.transTime}
                onChange={(e) => setNewTrans((prev) => ({ ...prev, transTime: e.target.value }))}
                placeholder="12:00:00"
                className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded font-mono focus:outline-none focus:border-[#1d4ed8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                입출금 구분
              </label>
              <select
                value={newTrans.transType}
                onChange={(e) =>
                  setNewTrans((prev) => ({ ...prev, transType: e.target.value as any }))
                }
                className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
              >
                <option value="DEPOSIT">입금</option>
                <option value="WITHDRAWAL">출금</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                거래구분
              </label>
              <input
                type="text"
                value={newTrans.txChannel}
                onChange={(e) => setNewTrans((prev) => ({ ...prev, txChannel: e.target.value }))}
                placeholder="타행이체, 체크, 인터넷"
                className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                거래금액(원)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={newTrans.amount}
                onChange={(e) =>
                  setNewTrans((prev) => ({ ...prev, amount: formatErpInputNumber(e.target.value) }))
                }
                placeholder="0"
                className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded font-mono text-right focus:outline-none focus:border-[#1d4ed8]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                거래후 잔액(원)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={newTrans.balanceAfter}
                onChange={(e) =>
                  setNewTrans((prev) => ({
                    ...prev,
                    balanceAfter: formatErpSignedInputNumber(e.target.value),
                  }))
                }
                placeholder="0"
                className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded font-mono text-right focus:outline-none focus:border-[#1d4ed8]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
              거래내용
            </label>
            <input
              type="text"
              value={newTrans.senderReceiver}
              onChange={(e) =>
                setNewTrans((prev) => ({ ...prev, senderReceiver: e.target.value }))
              }
              placeholder="(주)현대렌탈서비스"
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                상대은행
              </label>
              <input
                type="text"
                value={newTrans.counterpartyBank}
                onChange={(e) =>
                  setNewTrans((prev) => ({ ...prev, counterpartyBank: e.target.value }))
                }
                placeholder="국민은행, 우리은행"
                className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                상대계좌예금주명
              </label>
              <input
                type="text"
                value={newTrans.counterpartyHolder}
                onChange={(e) =>
                  setNewTrans((prev) => ({ ...prev, counterpartyHolder: e.target.value }))
                }
                placeholder="예금주명"
                className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
              메모
            </label>
            <input
              type="text"
              value={newTrans.memo}
              onChange={(e) => setNewTrans((prev) => ({ ...prev, memo: e.target.value }))}
              placeholder="메모"
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
            />
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#0f172a] bg-[#dcd4c4] hover:bg-[#d0c6b4] rounded border border-[#b5a894] font-bold transition"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] rounded shadow-xs transition"
          >
            등록
          </button>
        </div>
      </form>
    </div>
  );
};
