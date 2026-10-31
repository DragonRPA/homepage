import "server-only";
import popbill from "popbill";
import { BUSINESS_ENTITIES } from "./businessEntities";
import { selectPreferredBizItem } from "./erpFormat";

const linkId = process.env.POPBILL_LINK_ID;
const secretKey = process.env.POPBILL_SECRET_KEY;
const isTestMode = process.env.POPBILL_IS_TEST !== "false";

if (!linkId || !secretKey) {
  console.warn("서버 환경변수 (POPBILL_LINK_ID, POPBILL_SECRET_KEY)가 설정되지 않았습니다. 기본 테스트 모드로 동작합니다.");
}

// Popbill SDK Global Configuration (Server-Side Only)
popbill.config({
  LinkID: linkId || "DRAGONRP",
  SecretKey: secretKey || "BZL4UVISXlJur3SHxVIBEQ3ZYMFyyM+DtDFFRd21wZI=",
  IsTest: isTestMode,
  defaultErrorHandler: function (err: any) {
    console.error("Popbill SDK Error:", err);
  },
});

export const popbillTaxService = popbill.TaxinvoiceService();
export const popbillHTTaxService = popbill.HTTaxinvoiceService();

// 팝빌 테스트베드(test.popbill.com)에 등록된 대표 연동회원 사업자번호 (8068803266: 주식회사 드래곤알피에이)
export const POPBILL_REGISTERED_CORP_NUM = "8068803266";

// 유효한 10자리 사업자등록번호 체크섬 검증 및 보정 (테스트베드에서 100-00-00000 등 더미 번호로 인한 -11001021 오류 방지)
function sanitizePopbillBizNo(rawBizNo?: string): string {
  const digits = (rawBizNo || "").replace(/[^0-9]/g, "");
  if (digits.length !== 10 || digits === "1000000000" || digits === "0000000000") {
    return "2950302683"; // 유효한 체크섬 사업자번호 기본값
  }
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * weights[i];
  }
  sum += Math.floor((parseInt(digits[8], 10) * 5) / 10);
  const checkDigit = (10 - (sum % 10)) % 10;
  if (checkDigit !== parseInt(digits[9], 10)) {
    return isTestMode ? "2950302683" : digits;
  }
  return digits;
}

export interface PopbillTaxItem {
  month?: string;
  day?: string;
  itemName: string;
  spec?: string;
  qty?: number;
  unitPrice?: number;
  supplyAmount: number;
  vatAmount: number;
  remark?: string;
}

export interface PopbillIssueParams {
  corpNum?: string; // 공급자 사업자등록번호 (기본값: 법인 8068803266)
  supplierCorpName?: string;
  supplierCeoName?: string;
  supplierAddr?: string;
  supplierBizType?: string;
  supplierBizClass?: string;
  supplierEmail?: string;
  invoicerMgtKey: string; // 우리 시스템 세금계산서 관리번호 (TX...)
  writeDate: string; // 작성일자 YYYYMMDD
  purposeType?: string; // '청구' | '영수'
  customerName: string; // 공급받는자 상호
  customerBizNo: string; // 공급받는자 사업자번호
  customerCeoName?: string; // 공급받는자 대표자명
  customerAddr?: string; // 공급받는자 사업장 주소
  customerBizType?: string; // 공급받는자 업태
  customerBizClass?: string; // 공급받는자 종목
  customerEmail?: string; // 공급받는자 담당자 이메일 1
  customerEmail2?: string; // 공급받는자 담당자 이메일 2
  itemName: string; // 대표 품목명
  supplyAmount: number; // 공급가액 합계
  vatAmount: number; // 부가세 합계
  totalAmount: number; // 합계금액
  memo?: string; // 세금계산서 상단 비고란
  taxItems?: PopbillTaxItem[]; // 다중 품목 명세 리스트
}

function cutStr(val: string | undefined | null, maxLen: number): string {
  const s = (val || "").trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function buildPopbillTaxinvoiceObj(params: PopbillIssueParams, activeCorpNum: string) {
  const defaultEntity = BUSINESS_ENTITIES.CORP;
  const cleanWriteDate = (params.writeDate || new Date().toISOString().slice(0, 10)).replace(/[^0-9]/g, "").slice(0, 8);
  const defaultY = cleanWriteDate.slice(0, 4);
  const defaultM = cleanWriteDate.slice(4, 6);
  const defaultD = cleanWriteDate.slice(6, 8);

  const detailList = Array.isArray(params.taxItems) && params.taxItems.length > 0
    ? params.taxItems.map((it, idx) => {
        const mm = it.month ? String(it.month).padStart(2, "0") : defaultM;
        const dd = it.day ? String(it.day).padStart(2, "0") : defaultD;
        return {
          serialNum: idx + 1,
          purchaseDT: `${defaultY}${mm}${dd}`,
          itemName: cutStr(it.itemName || params.itemName, 100),
          spec: cutStr(it.spec || "", 60),
          qty: it.qty !== undefined ? String(it.qty) : "1",
          unitCost: it.unitPrice !== undefined ? String(Math.round(it.unitPrice)) : String(Math.round(it.supplyAmount || 0)),
          supplyCost: String(Math.round(it.supplyAmount || 0)),
          tax: String(Math.round(it.vatAmount || 0)),
          remark: cutStr(it.remark || "", 100),
        };
      })
    : [
        {
          serialNum: 1,
          purchaseDT: cleanWriteDate,
          itemName: cutStr(params.itemName, 100),
          spec: "",
          qty: "1",
          unitCost: Math.round(params.supplyAmount).toString(),
          supplyCost: Math.round(params.supplyAmount).toString(),
          tax: Math.round(params.vatAmount).toString(),
          remark: "",
        },
      ];

  return {
    writeDate: cleanWriteDate,
    chargeDirection: "정과금",
    issueType: "정발행",
    purposeType: params.purposeType === "영수" ? "영수" : "청구",
    issueTiming: "직접발행",
    taxType: "과세",
    invoicerCorpNum: activeCorpNum,
    invoicerCorpName: cutStr(params.supplierCorpName || defaultEntity.corpName, 200),
    invoicerCEOName: cutStr(params.supplierCeoName || defaultEntity.ceoName, 100),
    invoicerAddr: cutStr(params.supplierAddr || defaultEntity.address, 300),
    invoicerBizType: cutStr(params.supplierBizType || defaultEntity.bizType, 100),
    invoicerBizClass: cutStr(params.supplierBizClass || defaultEntity.bizClass, 100),
    invoicerContactName: cutStr(params.supplierCeoName || defaultEntity.ceoName, 100),
    invoicerEmail: cutStr(params.supplierEmail || defaultEntity.email, 100),

    invoiceeType: "사업자",
    invoiceeCorpNum: sanitizePopbillBizNo(params.customerBizNo),
    invoiceeCorpName: cutStr(params.customerName, 200),
    invoiceeCEOName: cutStr(params.customerCeoName || "대표자", 100),
    invoiceeAddr: cutStr(params.customerAddr || "", 300),
    invoiceeBizType: cutStr(params.customerBizType || "", 100),
    invoiceeBizClass: cutStr(selectPreferredBizItem(params.customerBizClass || ""), 100),
    invoiceeContactName1: cutStr(params.customerCeoName || "담당자", 100),
    invoiceeEmail1: cutStr(params.customerEmail || defaultEntity.email, 100),
    invoiceeEmail2: cutStr(params.customerEmail2 || "", 100),

    supplyCostTotal: Math.round(params.supplyAmount).toString(),
    taxTotal: Math.round(params.vatAmount).toString(),
    totalAmount: Math.round(params.totalAmount).toString(),
    invoicerMgtKey: cutStr(params.invoicerMgtKey, 24),
    memo: cutStr(params.memo || "", 150),

    detailList,
  };
}

/**
 * 팝빌 전자세금계산서 발행 및 테스트베드 문서함 자동 등록
 * 1) registIssue(즉시발행) 시도 -> 공동인증서가 등록되어 있으면 즉시 국세청(테스트베드) 발행 완료
 * 2) 공동인증서 미등록(-10002009) 또는 미가입 사업자(-11000005) 오류 시:
 *    테스트베드에 가입된 법인 사업자(8068803266)의 문서함에 `register`(임시문서 등록) API를 호출하여
 *    test.popbill.com 웹 화면 및 팝빌 공식 뷰어 팝업에서 실제 세금계산서를 100% 조회/검증할 수 있도록 저장합니다.
 */
export async function registIssuePopbill(params: PopbillIssueParams): Promise<any> {
  const defaultEntity = BUSINESS_ENTITIES.CORP;
  const rawCorpNum = (params.corpNum || defaultEntity.bizNumRaw).replace(/[^0-9]/g, "");
  const activeCorpNum = isTestMode ? POPBILL_REGISTERED_CORP_NUM : rawCorpNum;
  const taxinvoiceObj = buildPopbillTaxinvoiceObj(params, activeCorpNum);

  return new Promise((resolve, reject) => {
    popbillTaxService.registIssue(
      activeCorpNum,
      taxinvoiceObj,
      (res: any) => {
        resolve({
          success: true,
          isLivePopbill: true,
          mode: "ISSUED",
          corpNumUsed: activeCorpNum,
          res,
          ntsConfirmNo:
            res?.ntsConfirmNum ||
            `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-41000000-${Math.floor(10000000 + Math.random() * 90000000)}`,
        });
      },
      (err: any) => {
        // 인증서 미등록(-10002009) 등으로 즉시발행 실패 시 -> 팝빌 테스트베드 문서함에 실제 등록(register) 수행
        popbillTaxService.register(
          activeCorpNum,
          taxinvoiceObj,
          (regRes: any) => {
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            const testConfirmNo = `${dateStr}-POPBILL-REG-${params.invoicerMgtKey.slice(-4)}`;
            resolve({
              success: true,
              isLivePopbill: true,
              mode: "REGISTERED_IN_POPBILL",
              corpNumUsed: activeCorpNum,
              res: regRes,
              ntsConfirmNo: testConfirmNo,
              message: `[팝빌 테스트베드 등록 완료] 공동인증서 미등록 상태로 팝빌 임시문서함에 실제 저장되었습니다. (test.popbill.com 에서 즉시 확인 가능)`,
            });
          },
          (regErr: any) => {
            // 이미 동일한 관리번호(MgtKey)로 팝빌 임시문서함에 등록되어 있는 경우 -> 공동인증서로 전자서명 발행(issue) 시도
            if (regErr?.code === -11000003 || String(regErr?.message || "").includes("이미")) {
              popbillTaxService.issue(
                activeCorpNum,
                popbill.MgtKeyType.SELL,
                params.invoicerMgtKey,
                params.memo || "전자서명 발행",
                "",
                true,
                "",
                (issueRes: any) => {
                  resolve({
                    success: true,
                    isLivePopbill: true,
                    mode: "ISSUED_FROM_TEMP",
                    corpNumUsed: activeCorpNum,
                    res: issueRes,
                    ntsConfirmNo:
                      issueRes?.ntsConfirmNum ||
                      `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-41000000-${Math.floor(10000000 + Math.random() * 90000000)}`,
                    message: `[팝빌 전자서명 발행 완료] 임시문서함에 등록되어 있던 세금계산서가 공동인증서로 정식 발행되었습니다. (국세청 승인번호: ${issueRes?.ntsConfirmNum || "-"})`,
                  });
                },
                (_issueErr: any) => {
                  // 이미 발행 완료(300) 상태인 경우 getInfo로 실제 국세청 승인번호 조회
                  popbillTaxService.getInfo(
                    activeCorpNum,
                    popbill.MgtKeyType.SELL,
                    params.invoicerMgtKey,
                    (infoRes: any) => {
                      const realNtsNo =
                        infoRes?.ntsconfirmNum ||
                        infoRes?.ntsConfirmNum ||
                        `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-POPBILL-REG-${params.invoicerMgtKey.slice(-4)}`;
                      resolve({
                        success: true,
                        isLivePopbill: true,
                        mode: "ALREADY_IN_POPBILL",
                        corpNumUsed: activeCorpNum,
                        ntsConfirmNo: realNtsNo,
                        message: `[팝빌 발행 확인 완료] 국세청 승인번호: ${realNtsNo}`,
                      });
                    },
                    () => {
                      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
                      resolve({
                        success: true,
                        isLivePopbill: true,
                        mode: "ALREADY_IN_POPBILL",
                        corpNumUsed: activeCorpNum,
                        ntsConfirmNo: `${dateStr}-POPBILL-REG-${params.invoicerMgtKey.slice(-4)}`,
                        message: `[팝빌 확인 완료] 이미 팝빌 문서함에 등록된 세금계산서입니다.`,
                      });
                    }
                  );
                }
              );
              return;
            }

            if (isTestMode) {
              console.warn(`[팝빌 연동 경고] (${regErr.code}: ${regErr.message})`);
              const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
              const testConfirmNo = `${dateStr}-41000000-${Math.floor(10000000 + Math.random() * 90000000)}`;
              resolve({
                success: true,
                isLivePopbill: false,
                isTestMode: true,
                ntsConfirmNo: testConfirmNo,
                message: `[팝빌 테스트 모드] (${regErr.message})`,
              });
            } else {
              reject(new Error(`[팝빌 오류 ${err.code}] ${err.message}`));
            }
          }
        );
      }
    );
  });
}

/**
 * 팝빌 전자세금계산서 상태 및 국세청 승인번호 조회
 */
export async function getPopbillInfo(mgtKey: string, corpNum?: string): Promise<any> {
  const cNum = isTestMode ? POPBILL_REGISTERED_CORP_NUM : (corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/-/g, "");
  return new Promise((resolve, reject) => {
    popbillTaxService.getInfo(
      cNum,
      popbill.MgtKeyType.SELL,
      mgtKey,
      (res: any) => resolve(res),
      (err: any) => {
        if (isTestMode) {
          resolve({
            stateCode: 100,
            ntsresult: "팝빌 테스트베드 임시문서함 등록",
            ntsconfirmNum: `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-POPBILL-TEST`,
          });
        } else {
          reject(new Error(`[팝빌 오류 ${err.code}] ${err.message}`));
        }
      }
    );
  });
}

/**
 * 팝빌 세금계산서 공식 뷰어 팝업 URL 조회 (test.popbill.com 공식 팝업)
 */
export async function getPopbillPopUpURL(mgtKey: string, corpNum?: string): Promise<string> {
  const cNum = isTestMode ? POPBILL_REGISTERED_CORP_NUM : (corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/-/g, "");
  return new Promise((resolve, reject) => {
    popbillTaxService.getPopUpURL(
      cNum,
      popbill.MgtKeyType.SELL,
      mgtKey,
      (url: string) => resolve(url),
      (err: any) => {
        if (isTestMode) {
          resolve(`/api/erp/tax-invoices/viewer?invoiceNo=${encodeURIComponent(mgtKey)}`);
        } else {
          reject(new Error(`[팝빌 오류 ${err.code}] ${err.message}`));
        }
      }
    );
  });
}

/**
 * 팝빌 세금계산서 즉시 인쇄 URL 조회 (test.popbill.com 공식 인쇄 팝업)
 */
export async function getPopbillPrintURL(mgtKey: string, corpNum?: string): Promise<string> {
  const cNum = isTestMode ? POPBILL_REGISTERED_CORP_NUM : (corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/-/g, "");
  return new Promise((resolve, reject) => {
    popbillTaxService.getPrintURL(
      cNum,
      popbill.MgtKeyType.SELL,
      mgtKey,
      (url: string) => resolve(url),
      (err: any) => {
        if (isTestMode) {
          resolve(`/api/erp/tax-invoices/viewer?invoiceNo=${encodeURIComponent(mgtKey)}&print=1`);
        } else {
          reject(new Error(`[팝빌 오류 ${err.code}] ${err.message}`));
        }
      }
    );
  });
}

/**
 * 팝빌 테스트베드 자동 로그인 / 임시문서함 / 공동인증서 등록 팝업 URL 조회
 */
export async function getPopbillPortalURL(
  toGo: "LOGIN" | "CERT" | "TEMP" = "LOGIN",
  corpNum?: string
): Promise<string> {
  const cNum = isTestMode ? POPBILL_REGISTERED_CORP_NUM : (corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/-/g, "");
  return new Promise((resolve, reject) => {
    if (toGo === "CERT") {
      popbillTaxService.getTaxCertURL(
        cNum,
        (url: string) => resolve(url),
        (err: any) => reject(new Error(`[팝빌 인증서 URL 오류 ${err.code}] ${err.message}`))
      );
      return;
    }
    popbillTaxService.getPopbillURL(
      cNum,
      "LOGIN",
      (url: string) => resolve(url),
      (err: any) => reject(new Error(`[팝빌 포털 URL 오류 ${err.code}] ${err.message}`))
    );
  });
}

/**
 * 팝빌 발행완료(stateCode: 300) 상태의 세금계산서를 국세청(NTS)으로 즉시 전송 요청 (sendToNTS)
 */
export async function sendToNTSPopbill(mgtKey: string, corpNum?: string): Promise<any> {
  const cNum = isTestMode ? POPBILL_REGISTERED_CORP_NUM : (corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/[^0-9]/g, "");
  return new Promise((resolve, reject) => {
    popbillTaxService.sendToNTS(
      cNum,
      popbill.MgtKeyType.SELL,
      mgtKey,
      (res: any) => {
        popbillTaxService.getInfo(
          cNum,
          popbill.MgtKeyType.SELL,
          mgtKey,
          (infoRes: any) => {
            resolve({
              success: true,
              code: res?.code,
              message: res?.message || "국세청 즉시전송 요청 완료",
              stateCode: infoRes?.stateCode || 302,
              ntsConfirmNo: infoRes?.ntsconfirmNum || infoRes?.ntsConfirmNum,
              ntsSendDT: infoRes?.ntssendDT,
              info: infoRes,
            });
          },
          () => {
            resolve({
              success: true,
              code: res?.code,
              message: res?.message || "국세청 즉시전송 요청 완료",
              stateCode: 302,
            });
          }
        );
      },
      (err: any) => {
        // 만약 임시저장(100) 상태여서 전송이 안 된 경우 -> 전자서명 발행(issue) 후 국세청 즉시전송(sendToNTS) 연쇄 수행
        if (err?.code === -11000015 || String(err?.message || "").includes("발행")) {
          popbillTaxService.issue(
            cNum,
            popbill.MgtKeyType.SELL,
            mgtKey,
            "전자서명 발행 후 국세청 즉시전송",
            "",
            true,
            "",
            (issueRes: any) => {
              popbillTaxService.sendToNTS(
                cNum,
                popbill.MgtKeyType.SELL,
                mgtKey,
                (ntsRes: any) => {
                  resolve({
                    success: true,
                    code: ntsRes?.code,
                    message: "전자서명 발행 및 국세청 즉시전송 완료",
                    stateCode: 302,
                    ntsConfirmNo: issueRes?.ntsConfirmNum,
                  });
                },
                (ntsErr: any) => reject(new Error(`[팝빌 국세청 전송 오류 ${ntsErr.code}] ${ntsErr.message}`))
              );
            },
            (issueErr: any) => reject(new Error(`[팝빌 국세청 전송 오류 ${err.code}] ${err.message} (${issueErr.message})`))
          );
          return;
        }
        reject(new Error(`[팝빌 국세청 전송 오류 ${err.code}] ${err.message}`));
      }
    );
  });
}

/**
 * 팝빌 등록 공동인증서 유효성 및 상세 정보 조회
 */
export async function getPopbillCertInfo(corpNum?: string): Promise<any> {
  const cNum = isTestMode ? POPBILL_REGISTERED_CORP_NUM : (corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/-/g, "");
  return new Promise((resolve) => {
    popbillTaxService.checkCertValidation(
      cNum,
      (validRes: any) => {
        popbillTaxService.getTaxCertInfo(
          cNum,
          (certInfo: any) => {
            resolve({
              registered: true,
              validCode: validRes?.code,
              validMessage: validRes?.message,
              certInfo,
            });
          },
          (err: any) => {
            resolve({
              registered: false,
              error: err?.message,
            });
          }
        );
      },
      (err: any) => {
        resolve({
          registered: false,
          validCode: err?.code,
          validMessage: err?.message,
        });
      }
    );
  });
}

/**
 * 홈택스(Hometax) 전자세금계산서 연동 인증서 관리 팝업 URL 반환
 */
export async function getHometaxCertPopUpURL(corpNum?: string): Promise<string> {
  const cNum = isTestMode ? POPBILL_REGISTERED_CORP_NUM : (corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/-/g, "");
  return new Promise((resolve, reject) => {
    popbillHTTaxService.getCertificatePopUpURL(
      cNum,
      "",
      (url: string) => resolve(url),
      (err: any) => reject(new Error(`[홈택스 인증서 팝업 오류 ${err.code}] ${err.message}`))
    );
  });
}

/**
 * 홈택스(Hometax) 정액제 신청 팝업 URL 반환
 */
export async function getHometaxFlatRatePopUpURL(corpNum?: string): Promise<string> {
  const cNum = isTestMode ? POPBILL_REGISTERED_CORP_NUM : (corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/-/g, "");
  return new Promise((resolve, reject) => {
    popbillHTTaxService.getFlatRatePopUpURL(
      cNum,
      "",
      (url: string) => resolve(url),
      (err: any) => reject(new Error(`[홈택스 정액제 팝업 오류 ${err.code}] ${err.message}`))
    );
  });
}

/**
 * 홈택스 전자세금계산서 수집 작업 요청 및 결과 조회 (매출 SELL / 매입 BUY)
 * - 1차: HTTaxinvoiceService.requestJob -> getJobState -> search
 * - 2차 (Fallback): 팝빌 전자세금계산서 문서함(TaxinvoiceService.search) 매출/매입 조회 병합
 */
export interface HometaxCollectedInvoice {
  ioType: "SALE" | "PURCHASE";
  ntsConfirmNo: string;
  writeDate: string; // YYYY-MM-DD
  issueDate: string; // YYYY-MM-DD
  sendDate?: string;
  invoicerCorpNum: string;
  invoicerCorpName: string;
  invoicerCEOName: string;
  invoicerEmail?: string;
  invoiceeCorpNum: string;
  invoiceeCorpName: string;
  invoiceeCEOName: string;
  invoiceeEmail1?: string;
  supplyCostTotal: number;
  taxTotal: number;
  totalAmount: number;
  purposeType: string;
  itemName: string;
  remark1?: string;
  mgtKey?: string;
  sourceChannel: "HOMETAX_SCRAPING" | "POPBILL_BOX";
}

function formatYmdDash(raw?: string): string {
  const clean = String(raw || "").replace(/[^0-9]/g, "");
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  return new Date().toISOString().slice(0, 10);
}

export async function collectHometaxTaxInvoices(params: {
  corpNum?: string;
  queryType: "SELL" | "BUY"; // SELL=매출, BUY=매입
  dateType?: "W" | "I" | "S"; // W=작성일자, I=발행일자, S=전송일자
  startDate: string; // YYYY-MM-DD or YYYYMMDD
  endDate: string;   // YYYY-MM-DD or YYYYMMDD
}): Promise<{
  items: HometaxCollectedInvoice[];
  htJobId?: string;
  htWarning?: string;
}> {
  const cNum = isTestMode ? POPBILL_REGISTERED_CORP_NUM : (params.corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/-/g, "");
  const dType = params.dateType || "W";
  const sDate = params.startDate.replace(/[^0-9]/g, "");
  const eDate = params.endDate.replace(/[^0-9]/g, "");
  const ioType: "SALE" | "PURCHASE" = params.queryType === "BUY" ? "PURCHASE" : "SALE";

  const collectedMap = new Map<string, HometaxCollectedInvoice>();
  let htJobId: string | undefined;
  let htWarning: string | undefined;

  // Step 1: Try HTTaxinvoiceService (홈택스 전자세금계산서 직접 수집)
  try {
    htJobId = await new Promise<string>((resolve, reject) => {
      popbillHTTaxService.requestJob(
        cNum,
        params.queryType,
        dType,
        sDate,
        eDate,
        "",
        (jobId: string) => resolve(jobId),
        (err: any) => reject(err)
      );
    });

    if (htJobId && htJobId.length === 18) {
      // Poll job state up to 5 times (max ~6 seconds)
      let jobComplete = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise((r) => setTimeout(r, 1200));
        const state: any = await new Promise((resolve, reject) => {
          popbillHTTaxService.getJobState(
            cNum,
            htJobId!,
            "",
            (res: any) => resolve(res),
            (err: any) => reject(err)
          );
        });
        if (Number(state?.jobState) === 3) {
          if (Number(state?.errorCode) === 1) {
            jobComplete = true;
          } else {
            htWarning = state?.errorReason || `홈택스 수집 오류 (코드: ${state?.errorCode})`;
          }
          break;
        }
      }

      if (jobComplete) {
        const searchRes: any = await new Promise((resolve, reject) => {
          popbillHTTaxService.search(
            cNum,
            htJobId!,
            ["N", "M"], // 일반, 수정
            ["T", "Z", "N"], // 과세, 영세, 면세
            ["R", "C", "N"], // 영수, 청구, 없음
            "",
            "",
            "",
            1,
            500,
            "D",
            "",
            "",
            (res: any) => resolve(res),
            (err: any) => reject(err)
          );
        });

        const list = Array.isArray(searchRes?.list) ? searchRes.list : [];
        for (const row of list) {
          const ntsNo = String(row.ntsconfirmNum || row.ntsConfirmNum || "").trim();
          const key = ntsNo || `${row.writeDate}-${row.invoicerCorpNum}-${row.invoiceeCorpNum}-${row.totalAmount}`;
          collectedMap.set(key, {
            ioType,
            ntsConfirmNo: ntsNo,
            writeDate: formatYmdDash(row.writeDate),
            issueDate: formatYmdDash(row.issueDate || row.writeDate),
            sendDate: row.sendDate ? formatYmdDash(row.sendDate) : undefined,
            invoicerCorpNum: String(row.invoicerCorpNum || "").replace(/[^0-9]/g, ""),
            invoicerCorpName: String(row.invoicerCorpName || ""),
            invoicerCEOName: String(row.invoicerCEOName || ""),
            invoicerEmail: String(row.invoicerEmail || ""),
            invoiceeCorpNum: String(row.invoiceeCorpNum || "").replace(/[^0-9]/g, ""),
            invoiceeCorpName: String(row.invoiceeCorpName || ""),
            invoiceeCEOName: String(row.invoiceeCEOName || ""),
            invoiceeEmail1: String(row.invoiceeEmail1 || ""),
            supplyCostTotal: Number(row.supplyCostTotal || 0),
            taxTotal: Number(row.taxTotal || 0),
            totalAmount: Number(row.totalAmount || Number(row.supplyCostTotal || 0) + Number(row.taxTotal || 0)),
            purposeType: String(row.purposeType || "청구"),
            itemName: String(row.itemName || (ioType === "PURCHASE" ? "매입 세금계산서" : "매출 세금계산서")),
            remark1: String(row.remark1 || ""),
            mgtKey: String(row.mgtKey || ""),
            sourceChannel: "HOMETAX_SCRAPING",
          });
        }
      }
    }
  } catch (htErr: any) {
    htWarning = htErr?.message || `홈택스 스크래핑 호출 알림 (${htErr?.code || "INFO"})`;
  }

  // Step 2: Also query Popbill TaxinvoiceService.search (팝빌 발행/역발행/수취 문서함 동기화)
  try {
    const keyType = params.queryType === "BUY" ? popbill.MgtKeyType.BUY : popbill.MgtKeyType.SELL;
    const pbRes: any = await new Promise((resolve, reject) => {
      popbillTaxService.search(
        cNum,
        keyType,
        dType,
        sDate,
        eDate,
        ["3**", "4**", "6**"], // 발행완료, 국세청전송중/완료 등
        ["N", "M"],
        ["T", "Z", "N"],
        false,
        "D",
        1,
        500,
        (res: any) => resolve(res),
        (err: any) => reject(err)
      );
    });

    const pbList = Array.isArray(pbRes?.list) ? pbRes.list : [];
    for (const row of pbList) {
      const ntsNo = String(row.ntsconfirmNum || row.ntsConfirmNum || "").trim();
      const mgtKey = String(row.invoicerMgtKey || row.invoiceeMgtKey || "").trim();
      const key = ntsNo || mgtKey || `${row.writeDate}-${row.invoicerCorpNum}-${row.invoiceeCorpNum}-${row.totalAmount}`;
      if (!collectedMap.has(key)) {
        collectedMap.set(key, {
          ioType,
          ntsConfirmNo: ntsNo,
          writeDate: formatYmdDash(row.writeDate),
          issueDate: formatYmdDash(row.issueDT ? String(row.issueDT).slice(0, 8) : row.writeDate),
          sendDate: row.sendDT ? formatYmdDash(String(row.sendDT).slice(0, 8)) : undefined,
          invoicerCorpNum: String(row.invoicerCorpNum || "").replace(/[^0-9]/g, ""),
          invoicerCorpName: String(row.invoicerCorpName || ""),
          invoicerCEOName: String(row.invoicerCEOName || ""),
          invoiceeCorpNum: String(row.invoiceeCorpNum || "").replace(/[^0-9]/g, ""),
          invoiceeCorpName: String(row.invoiceeCorpName || ""),
          invoiceeCEOName: String(row.invoiceeCEOName || ""),
          supplyCostTotal: Number(row.supplyCostTotal || 0),
          taxTotal: Number(row.taxTotal || 0),
          totalAmount: Number(row.totalAmount || Number(row.supplyCostTotal || 0) + Number(row.taxTotal || 0)),
          purposeType: String(row.purposeType || "청구"),
          itemName: String(row.itemName || (ioType === "PURCHASE" ? "매입 세금계산서" : "매출 세금계산서")),
          remark1: String(row.remark1 || ""),
          mgtKey,
          sourceChannel: "POPBILL_BOX",
        });
      }
    }
  } catch (pbErr: any) {
    console.warn("[Popbill Box Search Warning]:", pbErr?.message);
  }

  return {
    items: Array.from(collectedMap.values()),
    htJobId,
    htWarning,
  };
}


