import "server-only";
import popbill from "popbill";
import { BUSINESS_ENTITIES } from "./businessEntities";

const linkId = process.env.POPBILL_LINK_ID;
const secretKey = process.env.POPBILL_SECRET_KEY;

if (!linkId || !secretKey) {
  throw new Error("서버 환경변수 (POPBILL_LINK_ID, POPBILL_SECRET_KEY)가 설정되지 않았습니다.");
}

// Popbill SDK Global Configuration (Server-Side Only)
popbill.config({
  LinkID: linkId,
  SecretKey: secretKey,
  IsTest: process.env.POPBILL_IS_TEST !== "false",
  defaultErrorHandler: function (err: any) {
    console.error("Popbill SDK Error:", err);
  },
});

export const popbillTaxService = popbill.TaxinvoiceService();

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
  customerName: string; // 공급받는자 상호
  customerBizNo: string; // 공급받는자 사업자번호
  customerCeoName?: string; // 공급받는자 대표자명
  customerEmail?: string; // 공급받는자 담당자 이메일
  itemName: string; // 품목명
  supplyAmount: number; // 공급가액
  vatAmount: number; // 부가세
  totalAmount: number; // 합계금액
  memo?: string;
}

/**
 * 팝빌 전자세금계산서 즉시 발행 (registIssue)
 */
export async function registIssuePopbill(params: PopbillIssueParams): Promise<any> {
  const defaultEntity = BUSINESS_ENTITIES.CORP;
  const corpNum = (params.corpNum || defaultEntity.bizNumRaw).replace(/[^0-9]/g, "");

  const taxinvoiceObj = {
    writeDate: params.writeDate.replace(/-/g, ""),
    chargeDirection: "정과금",
    issueType: "정발행",
    issueTiming: "직접발행",
    taxType: "과세",
    invoicerCorpNum: corpNum,
    invoicerCorpName: params.supplierCorpName || defaultEntity.corpName,
    invoicerCEOName: params.supplierCeoName || defaultEntity.ceoName,
    invoicerAddr: params.supplierAddr || defaultEntity.address,
    invoicerBizType: params.supplierBizType || defaultEntity.bizType,
    invoicerBizClass: params.supplierBizClass || defaultEntity.bizClass,
    invoicerContactName: params.supplierCeoName || defaultEntity.ceoName,
    invoicerEmail: params.supplierEmail || defaultEntity.email,

    invoiceeType: "사업자",
    invoiceeCorpNum: params.customerBizNo.replace(/[^0-9]/g, "") || "1000000000",
    invoiceeCorpName: params.customerName,
    invoiceeCEOName: params.customerCeoName || "대표자",
    invoiceeContactName1: params.customerCeoName || "담당자",
    invoiceeEmail1: params.customerEmail || defaultEntity.email,

    supplyCostTotal: params.supplyAmount.toString(),
    taxTotal: params.vatAmount.toString(),
    totalAmount: params.totalAmount.toString(),
    invoicerMgtKey: params.invoicerMgtKey,
    memo: params.memo || "",

    detailList: [
      {
        serialNum: 1,
        purchaseDT: params.writeDate.replace(/-/g, ""),
        itemName: params.itemName,
        supplyCost: params.supplyAmount.toString(),
        tax: params.vatAmount.toString(),
      },
    ],
  };

  return new Promise((resolve, reject) => {
    popbillTaxService.registIssue(
      corpNum,
      taxinvoiceObj,
      (res: any) => {
        resolve({ success: true, res });
      },
      (err: any) => {
        reject(new Error(`[팝빌 오류 ${err.code}] ${err.message}`));
      }
    );
  });
}

/**
 * 팝빌 전자세금계산서 상태 및 국세청 승인번호 조회
 */
export async function getPopbillInfo(mgtKey: string, corpNum?: string): Promise<any> {
  const cNum = (corpNum || process.env.POPBILL_CORP_NUM || "3128703310").replace(/-/g, "");
  return new Promise((resolve, reject) => {
    popbillTaxService.getInfo(
      cNum,
      popbill.MgtKeyType.SELL,
      mgtKey,
      (res: any) => resolve(res),
      (err: any) => reject(new Error(`[팝빌 오류 ${err.code}] ${err.message}`))
    );
  });
}

/**
 * 팝빌 세금계산서 뷰어 팝업 URL 조회
 */
export async function getPopbillPopUpURL(mgtKey: string, corpNum?: string): Promise<string> {
  const cNum = (corpNum || process.env.POPBILL_CORP_NUM || "3128703310").replace(/-/g, "");
  return new Promise((resolve, reject) => {
    popbillTaxService.getPopUpURL(
      cNum,
      popbill.MgtKeyType.SELL,
      mgtKey,
      (url: string) => resolve(url),
      (err: any) => reject(new Error(`[팝빌 오류 ${err.code}] ${err.message}`))
    );
  });
}

/**
 * 팝빌 세금계산서 즉시 인쇄 URL 조회
 */
export async function getPopbillPrintURL(mgtKey: string, corpNum?: string): Promise<string> {
  const cNum = (corpNum || process.env.POPBILL_CORP_NUM || "3128703310").replace(/-/g, "");
  return new Promise((resolve, reject) => {
    popbillTaxService.getPrintURL(
      cNum,
      popbill.MgtKeyType.SELL,
      mgtKey,
      (url: string) => resolve(url),
      (err: any) => reject(new Error(`[팝빌 오류 ${err.code}] ${err.message}`))
    );
  });
}
