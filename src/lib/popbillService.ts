import "server-only";
import popbill from "popbill";
import { BUSINESS_ENTITIES, getEntityByBizNum } from "./businessEntities";
import { selectPreferredBizItem } from "./erpFormat";

const linkId = process.env.POPBILL_LINK_ID;
const secretKey = process.env.POPBILL_SECRET_KEY;
// 실서비스(운영 환경) 기본값 적용 (POPBILL_IS_TEST="true"일 때만 테스트베드 동작)
const isTestMode = process.env.POPBILL_IS_TEST === "true";

if (!linkId || !secretKey) {
  console.warn("서버 환경변수 (POPBILL_LINK_ID, POPBILL_SECRET_KEY)가 설정되지 않았습니다.");
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

// 팝빌에 등록된 연동회원 사업자번호 (법인 8068803266 / 개인 2950302683)
export const POPBILL_REGISTERED_CORP_NUM = BUSINESS_ENTITIES.CORP.bizNumRaw;
export const POPBILL_INDIVIDUAL_CORP_NUM = BUSINESS_ENTITIES.INDIVIDUAL.bizNumRaw;

export function resolvePopbillCorpNum(corpNum?: string | null, entityType?: string | null): string {
  const clean = (corpNum || "").replace(/[^0-9]/g, "");
  if (clean === POPBILL_INDIVIDUAL_CORP_NUM || entityType === "INDIVIDUAL") {
    return POPBILL_INDIVIDUAL_CORP_NUM;
  }
  if (clean === POPBILL_REGISTERED_CORP_NUM || entityType === "CORP") {
    return POPBILL_REGISTERED_CORP_NUM;
  }
  return clean.length === 10 ? clean : POPBILL_REGISTERED_CORP_NUM;
}

// 유효한 10자리 사업자등록번호 검증 및 정규화 (실제 서비스에서는 임의 사업자번호 치환 금지)
function sanitizePopbillBizNo(rawBizNo?: string): string {
  const digits = (rawBizNo || "").replace(/[^0-9]/g, "");
  if (digits.length !== 10 || digits === "1000000000" || digits === "0000000000") {
    throw new Error(`유효하지 않은 거래처 사업자등록번호(${rawBizNo || "미입력"})입니다. 10자리 사업자등록번호를 확인해 주세요.`);
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
  const defaultEntity = getEntityByBizNum(activeCorpNum);
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
    invoiceeEmail1: cutStr(params.customerEmail || "", 100),
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
 * 팝빌 전자세금계산서 정식 발행 (운영 환경)
 * 1) registIssue(즉시발행) 시도 -> 공동인증서가 등록되어 있으면 즉시 국세청 정식 발행 완료 및 실제 승인번호 반환
 * 2) 공동인증서 미등록(-10002009) 시:
 *    팝빌 임시문서함에 `register`(임시문서 등록) API를 호출하여 실제 저장하고,
 *    가짜 승인번호를 생성하지 않으며 상태를 TEMP_SAVED(임시저장)로 반환합니다.
 */
export async function registIssuePopbill(params: PopbillIssueParams): Promise<any> {
  const activeCorpNum = resolvePopbillCorpNum(params.corpNum);
  const taxinvoiceObj = buildPopbillTaxinvoiceObj(params, activeCorpNum);

  return new Promise((resolve, reject) => {
    popbillTaxService.registIssue(
      activeCorpNum,
      taxinvoiceObj,
      (res: any) => {
        const realConfirmNo = res?.ntsConfirmNum || res?.ntsconfirmNum || null;
        // 연동회원 설정이 '익일전송(false)'으로 되어 있더라도 발행 직후 sendToNTS를 자동 호출하여 항상 국세청 '즉시전송' 보장
        popbillTaxService.sendToNTS(
          activeCorpNum,
          popbill.MgtKeyType.SELL,
          params.invoicerMgtKey,
          () => {
            resolve({
              success: true,
              isLivePopbill: true,
              mode: "ISSUED",
              corpNumUsed: activeCorpNum,
              res,
              ntsConfirmNo: realConfirmNo,
              message: `[팝빌 정식 발행 및 국세청 즉시전송 완료] 국세청 승인번호: ${realConfirmNo || "발급 완료"}`,
            });
          },
          () => {
            // 이미 즉시전송 옵션이 켜져 있어 자동 전송 중이거나 완료된 경우 정상 처리
            resolve({
              success: true,
              isLivePopbill: true,
              mode: "ISSUED",
              corpNumUsed: activeCorpNum,
              res,
              ntsConfirmNo: realConfirmNo,
              message: `[팝빌 정식 발행 완료] 국세청 승인번호: ${realConfirmNo || "발급 완료"}`,
            });
          }
        );
      },
      (err: any) => {
        // 공동인증서 미등록(-10002009)인 경우 팝빌 임시문서함에 실제 등록(register) 수행
        const errCode = Number(err?.code);
        const errMsg = String(err?.message || "");
        if (errCode === -10002009 || errMsg.includes("인증서")) {
          popbillTaxService.register(
            activeCorpNum,
            taxinvoiceObj,
            (regRes: any) => {
              resolve({
                success: true,
                isLivePopbill: true,
                mode: "REGISTERED_IN_POPBILL",
                corpNumUsed: activeCorpNum,
                res: regRes,
                ntsConfirmNo: null,
                message: `[팝빌 임시문서함 등록 완료] 공동인증서가 등록되지 않아 팝빌 임시문서함에 저장되었습니다. 팝빌에 공동인증서를 등록한 후 발행해 주세요.`,
              });
            },
            (regErr: any) => {
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
                    const realConfirmNo = issueRes?.ntsConfirmNum || issueRes?.ntsconfirmNum || null;
                    resolve({
                      success: true,
                      isLivePopbill: true,
                      mode: "ISSUED_FROM_TEMP",
                      corpNumUsed: activeCorpNum,
                      res: issueRes,
                      ntsConfirmNo: realConfirmNo,
                      message: `[팝빌 전자서명 발행 완료] 국세청 승인번호: ${realConfirmNo || "-"}`,
                    });
                  },
                  (_issueErr: any) => {
                    popbillTaxService.getInfo(
                      activeCorpNum,
                      popbill.MgtKeyType.SELL,
                      params.invoicerMgtKey,
                      (infoRes: any) => {
                        const realNtsNo = infoRes?.ntsconfirmNum || infoRes?.ntsConfirmNum || null;
                        resolve({
                          success: true,
                          isLivePopbill: true,
                          mode: realNtsNo ? "ALREADY_IN_POPBILL" : "REGISTERED_IN_POPBILL",
                          corpNumUsed: activeCorpNum,
                          ntsConfirmNo: realNtsNo,
                          message: realNtsNo
                            ? `[팝빌 발행 확인 완료] 국세청 승인번호: ${realNtsNo}`
                            : `[팝빌 임시문서함 보관중] 공동인증서 서명 대기 상태입니다.`,
                        });
                      },
                      (infoErr: any) => {
                        reject(new Error(`[팝빌 오류 ${infoErr?.code || err.code}] ${infoErr?.message || err.message}`));
                      }
                    );
                  }
                );
                return;
              }
              reject(new Error(`[팝빌 등록 오류 ${regErr.code}] ${regErr.message}`));
            }
          );
          return;
        }

        // 이미 동일 관리번호로 등록된 경우(-11000003) -> 전자서명 발행(issue) 또는 상태 조회(getInfo)
        if (errCode === -11000003 || errMsg.includes("이미")) {
          popbillTaxService.getInfo(
            activeCorpNum,
            popbill.MgtKeyType.SELL,
            params.invoicerMgtKey,
            (infoRes: any) => {
              const realNtsNo = infoRes?.ntsconfirmNum || infoRes?.ntsConfirmNum || null;
              if (realNtsNo) {
                resolve({
                  success: true,
                  isLivePopbill: true,
                  mode: "ALREADY_IN_POPBILL",
                  corpNumUsed: activeCorpNum,
                  ntsConfirmNo: realNtsNo,
                  message: `[팝빌 발행 확인 완료] 국세청 승인번호: ${realNtsNo}`,
                });
              } else {
                popbillTaxService.issue(
                  activeCorpNum,
                  popbill.MgtKeyType.SELL,
                  params.invoicerMgtKey,
                  params.memo || "전자서명 발행",
                  "",
                  true,
                  "",
                  (issueRes: any) => {
                    const issuedNo = issueRes?.ntsConfirmNum || issueRes?.ntsconfirmNum || null;
                    resolve({
                      success: true,
                      isLivePopbill: true,
                      mode: "ISSUED_FROM_TEMP",
                      corpNumUsed: activeCorpNum,
                      res: issueRes,
                      ntsConfirmNo: issuedNo,
                      message: `[팝빌 전자서명 발행 완료] 국세청 승인번호: ${issuedNo || "-"}`,
                    });
                  },
                  (issueErr: any) => {
                    reject(new Error(`[팝빌 발행 오류 ${issueErr.code}] ${issueErr.message}`));
                  }
                );
              }
            },
            (infoErr: any) => {
              reject(new Error(`[팝빌 오류 ${infoErr.code}] ${infoErr.message}`));
            }
          );
          return;
        }

        reject(new Error(`[팝빌 발행 오류 ${err.code}] ${err.message}`));
      }
    );
  });
}

/**
 * 팝빌 전자세금계산서 상태 및 국세청 승인번호 조회
 */
export async function getPopbillInfo(mgtKey: string, corpNum?: string): Promise<any> {
  const cNum = (corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/[^0-9]/g, "");
  return new Promise((resolve, reject) => {
    popbillTaxService.getInfo(
      cNum,
      popbill.MgtKeyType.SELL,
      mgtKey,
      (res: any) => resolve(res),
      (err: any) => {
        reject(new Error(`[팝빌 오류 ${err.code}] ${err.message}`));
      }
    );
  });
}

/**
 * 팝빌 세금계산서 공식 뷰어 팝업 URL 조회
 */
export async function getPopbillPopUpURL(mgtKey: string, corpNum?: string): Promise<string> {
  const cNum = (corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/[^0-9]/g, "");
  return new Promise((resolve, reject) => {
    popbillTaxService.getPopUpURL(
      cNum,
      popbill.MgtKeyType.SELL,
      mgtKey,
      (url: string) => resolve(url),
      (err: any) => {
        reject(new Error(`[팝빌 오류 ${err.code}] ${err.message}`));
      }
    );
  });
}

/**
 * 팝빌 세금계산서 즉시 인쇄 URL 조회
 */
export async function getPopbillPrintURL(mgtKey: string, corpNum?: string): Promise<string> {
  const cNum = (corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/[^0-9]/g, "");
  return new Promise((resolve, reject) => {
    popbillTaxService.getPrintURL(
      cNum,
      popbill.MgtKeyType.SELL,
      mgtKey,
      (url: string) => resolve(url),
      (err: any) => {
        reject(new Error(`[팝빌 오류 ${err.code}] ${err.message}`));
      }
    );
  });
}

/**
 * 팝빌 자동 로그인 / 임시문서함 / 공동인증서 등록 / 파트너 포인트 충전 팝업 URL 조회
 */
export async function getPopbillPortalURL(
  toGo: "LOGIN" | "CERT" | "TEMP" | "CHRG" = "LOGIN",
  corpNum?: string
): Promise<string> {
  const cNum = (corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/[^0-9]/g, "");
  return new Promise((resolve, reject) => {
    if (toGo === "CERT") {
      popbillTaxService.getTaxCertURL(
        cNum,
        (url: string) => resolve(url),
        (err: any) => reject(new Error(`[팝빌 인증서 URL 오류 ${err.code}] ${err.message}`))
      );
      return;
    }
    if (toGo === "CHRG") {
      popbillTaxService.getPartnerURL(
        cNum,
        "CHRG",
        (url: string) => resolve(url),
        (err: any) => reject(new Error(`[팝빌 포인트 충전 URL 오류 ${err.code}] ${err.message}`))
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
 * 팝빌 운영 환경 연동 상태 (법인 + 개인 회원 가입여부, 파트너 잔여 포인트, 공동인증서 등록 및 만료일) 통합 조회
 */
export async function getPopbillLiveStatus(corpNum?: string): Promise<any> {
  const cNum = resolvePopbillCorpNum(corpNum);
  const partnerBalance = await new Promise<number>((resolve) => {
    popbillTaxService.getPartnerBalance(
      cNum,
      (bal: any) => resolve(Number(bal || 0)),
      () => resolve(0)
    );
  });
  const memberBalance = await new Promise<number>((resolve) => {
    popbillTaxService.getBalance(
      cNum,
      (bal: any) => resolve(Number(bal || 0)),
      () => resolve(0)
    );
  });
  const [corpCert, individualCert] = await Promise.all([
    getPopbillCertInfo(POPBILL_REGISTERED_CORP_NUM),
    getPopbillCertInfo(POPBILL_INDIVIDUAL_CORP_NUM),
  ]);
  const activeCert = cNum === POPBILL_INDIVIDUAL_CORP_NUM ? individualCert : corpCert;
  return {
    isLiveProduction: !isTestMode,
    serviceId: isTestMode ? "POPBILL_TEST" : "POPBILL",
    baseUrl: isTestMode ? "https://popbill-test.linkhub.co.kr" : "https://popbill.linkhub.co.kr",
    corpNum: cNum,
    partnerBalance,
    memberBalance,
    certRegistered: Boolean(activeCert.registered),
    certInfo: activeCert.certInfo || null,
    certMessage: activeCert.validMessage || activeCert.error || "",
    corpCertRegistered: Boolean(corpCert.registered),
    corpCertInfo: corpCert.certInfo || null,
    individualCertRegistered: Boolean(individualCert.registered),
    individualCertInfo: individualCert.certInfo || null,
  };
}

/**
 * 팝빌 발행완료(stateCode: 300) 상태의 세금계산서를 국세청(NTS)으로 즉시 전송 요청 (sendToNTS)
 */
export async function sendToNTSPopbill(mgtKey: string, corpNum?: string): Promise<any> {
  const cNum = (corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/[^0-9]/g, "");
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
 * 팝빌 세금계산서 문서 삭제 (임시저장 또는 발행취소 상태 문서 삭제)
 */
export async function deletePopbillInvoice(mgtKey: string, corpNum?: string): Promise<any> {
  const cNum = (corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/[^0-9]/g, "");
  return new Promise((resolve) => {
    popbillTaxService.delete(
      cNum,
      popbill.MgtKeyType.SELL,
      mgtKey,
      (res: any) => resolve({ success: true, res }),
      (err: any) => resolve({ success: false, code: err?.code, message: err?.message })
    );
  });
}

/**
 * 팝빌 발행 세금계산서 안내 이메일 재전송 (sendEmail)
 */
export async function sendPopbillEmail(mgtKey: string, receiverEmail: string, corpNum?: string): Promise<any> {
  const cNum = (corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/[^0-9]/g, "");
  const cleanEmail = (receiverEmail || "").trim();
  if (!cleanEmail) {
    throw new Error("수신할 이메일 주소가 비어 있습니다.");
  }
  return new Promise((resolve, reject) => {
    popbillTaxService.sendEmail(
      cNum,
      popbill.MgtKeyType.SELL,
      mgtKey,
      cleanEmail,
      (res: any) => resolve({ success: true, code: res?.code, message: res?.message || `[${cleanEmail}]로 세금계산서 이메일 발송 완료` }),
      (err: any) => reject(new Error(`[팝빌 이메일 재전송 오류 ${err?.code}] ${err?.message}`))
    );
  });
}

/**
 * 팝빌 등록 공동인증서 유효성 및 상세 정보 조회
 */
export async function getPopbillCertInfo(corpNum?: string): Promise<any> {
  const cNum = (corpNum || POPBILL_REGISTERED_CORP_NUM).replace(/[^0-9]/g, "");
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
 * 홈택스(Hometax) 전자세금계산서 표준 수집 DTO (자체 RPA / 홈택스 엑셀 파서 전용)
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
  sourceChannel: "HOMETAX_RPA" | "EXCEL_UPLOAD";
}
