"use client";

import React from "react";
import dynamic from "next/dynamic";
import { AlertCircle, Check } from "lucide-react";
import { TaxKpiAndFilterBar } from "./tax-invoice/TaxKpiAndFilterBar";
import { TaxLedgerSubTab } from "./tax-invoice/TaxLedgerSubTab";
import { useTaxInvoiceController } from "./tax-invoice/useTaxInvoiceController";

const TaxUnissuedSubTab = dynamic(
  () => import("./tax-invoice/TaxUnissuedAndSyncSubTabs").then((m) => m.TaxUnissuedSubTab),
  { ssr: false }
);
const TaxHometaxSyncSubTab = dynamic(
  () => import("./tax-invoice/TaxUnissuedAndSyncSubTabs").then((m) => m.TaxHometaxSyncSubTab),
  { ssr: false }
);
const ReconcileModal = dynamic(
  () => import("./tax-invoice/TaxInvoiceReconcileModal").then((m) => m.ReconcileModal),
  { ssr: false }
);
const IssueModal = dynamic(
  () => import("./tax-invoice/TaxInvoiceIssueAndDetailModals").then((m) => m.IssueModal),
  { ssr: false }
);
const DetailModal = dynamic(
  () => import("./tax-invoice/TaxInvoiceIssueAndDetailModals").then((m) => m.DetailModal),
  { ssr: false }
);

interface TaxInvoiceTabProps {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onSelectEntity?: (entity: "ALL" | "CORP" | "INDIVIDUAL") => void;
}

export const TaxInvoiceTab: React.FC<TaxInvoiceTabProps> = ({
  currentUser: _currentUser,
  selectedEntity = "ALL",
  onSelectEntity,
}) => {
  const {
    toast,
    showToast,
    activeSubTab,
    setActiveSubTab,
    unissuedBillings,
    saleInvoices,
    purchaseInvoices,
    arStats,
    apStats,
    activeStats,
    isPurchaseTab,
    autoMatching,
    handleAutoMatch,
    openIssueModal,
    handleOpenPopbillPortal,
    popbillLive,
    settlementFilter,
    setSettlementFilter,
    unpaidByPartner,
    searchTerm,
    setSearchTerm,
    entityFilter,
    handleChangeEntityFilter,
    domainFilter,
    setDomainFilter,
    isRefreshing,
    handleRefresh,
    selectedSummary,
    batchIssuing,
    handleBatchIssue,
    pendingNtsCount,
    sendingNts,
    handleBatchSendToNTS,
    sortedInvoices,
    sortedUnissued,
    filteredUnissuedCount,
    selectedBillingIds,
    getBillingUid,
    toggleSelectAll,
    toggleSelectBilling,
    unissuedSortKey,
    unissuedSortDir,
    handleUnissuedSort,
    handleSingleIssueFromBilling,
    sortKey,
    sortDir,
    handleSort,
    openReconcileModal,
    handleQuickFullSettle,
    detailInvoice,
    setDetailInvoice,
    handleSendToNTS,
    rpaDeptUserId,
    setRpaDeptUserId,
    rpaDeptUserPw,
    setRpaDeptUserPw,
    rpaSaving,
    handleSaveRpaSettings,
    htSyncTarget,
    setHtSyncTarget,
    htStartDate,
    setHtStartDate,
    htEndDate,
    setHtEndDate,
    htSyncing,
    handleHometaxSync,
    excelUploadIoType,
    setExcelUploadIoType,
    excelUploading,
    excelInputRef,
    handleHometaxExcelUpload,
    htSyncLogs,
    reconcileInvoice,
    setReconcileInvoice,
    reconcileLoading,
    reconcileUnpaidBalance,
    bankSearchTerm,
    setBankSearchTerm,
    batchSubject,
    setBatchSubject,
    candBankSort,
    filteredCandidateTxs,
    linkedBankSort,
    linkedBankTxs,
    sortedLinkedBankTxs,
    manualSettleInput,
    setManualSettleInput,
    modalAccountSubjects,
    rowSubjectMap,
    setRowSubjectMap,
    selectedBankTxIds,
    setSelectedBankTxIds,
    selectedBankTxSum,
    settleReasonInput,
    setSettleReasonInput,
    handleClassifyBankTxInModal,
    handleConfirmBankMatch,
    handleManualSettleSave,
    handleUnmatchBankTx,
    showIssueModal,
    setShowIssueModal,
    custName,
    setCustName,
    domainType,
    setDomainType,
    handleManualIssue,
    issueDate,
    setIssueDate,
    manualNtsConfirmNo,
    setManualNtsConfirmNo,
    manualPartnerOptions,
    manualPartners,
    manualTaxSpec,
    setManualTaxSpec,
    modalIoType,
    setModalIoType,
    modalSupplierEntity,
    setModalSupplierEntity,
    selectedManualPartnerId,
    handleDeleteInvoice,
    handleOpenPopbillPrint,
    handleOpenPopbillView,
  } = useTaxInvoiceController({ selectedEntity, onSelectEntity });

  return (
    <div className="flex flex-col min-h-full md:h-full md:overflow-hidden select-none bg-[#f4efe4] text-[#1c1917]">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-16 right-4 md:right-6 z-50 px-4 py-2.5 rounded shadow text-xs font-bold flex items-center gap-2 border ${
            toast.type === "error"
              ? "bg-rose-950 border-rose-800 text-rose-200"
              : "bg-emerald-950 border-emerald-800 text-emerald-200"
          }`}
        >
          {toast.type === "error" ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 1~3. Top Sub-Tabs, Action Buttons, KPI Cards & Filter/Pipeline Toolbar */}
      <TaxKpiAndFilterBar
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        unissuedCount={unissuedBillings.length}
        saleCount={saleInvoices.length}
        purchaseCount={purchaseInvoices.length}
        arStats={arStats}
        apStats={apStats}
        activeStats={activeStats}
        isPurchaseTab={isPurchaseTab}
        autoMatching={autoMatching}
        handleAutoMatch={handleAutoMatch}
        onOpenIssueModal={openIssueModal}
        handleOpenPopbillPortal={handleOpenPopbillPortal}
        popbillLive={popbillLive}
        settlementFilter={settlementFilter}
        setSettlementFilter={setSettlementFilter}
        unpaidByPartner={unpaidByPartner}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        entityFilter={entityFilter}
        onChangeEntityFilter={handleChangeEntityFilter}
        domainFilter={domainFilter}
        setDomainFilter={setDomainFilter}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        selectedSummary={selectedSummary}
        batchIssuing={batchIssuing}
        handleBatchIssue={handleBatchIssue}
        pendingNtsCount={pendingNtsCount}
        sendingNts={sendingNts}
        handleBatchSendToNTS={handleBatchSendToNTS}
        sortedInvoices={sortedInvoices}
        showToast={showToast}
      />

      {/* 4. Body Content Area */}
      <div className="flex-1 md:overflow-auto p-2.5 md:p-3">
        {/* SUB-TAB 1: UNISSUED BILLINGS */}
        {activeSubTab === "UNISSUED" && (
          <TaxUnissuedSubTab
            sortedUnissued={sortedUnissued}
            filteredUnissuedCount={filteredUnissuedCount}
            selectedBillingIds={selectedBillingIds}
            getBillingUid={getBillingUid}
            toggleSelectAll={toggleSelectAll}
            toggleSelectBilling={toggleSelectBilling}
            unissuedSortKey={unissuedSortKey}
            unissuedSortDir={unissuedSortDir}
            handleUnissuedSort={handleUnissuedSort}
            handleSingleIssueFromBilling={handleSingleIssueFromBilling}
          />
        )}

        {/* SUB-TAB 2 & 3: SALE_LEDGER & PURCHASE_LEDGER */}
        {(activeSubTab === "SALE_LEDGER" || activeSubTab === "PURCHASE_LEDGER") && (
          <TaxLedgerSubTab
            isPurchaseTab={isPurchaseTab}
            sortedInvoices={sortedInvoices}
            activeStats={activeStats}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            openReconcileModal={openReconcileModal}
            handleQuickFullSettle={handleQuickFullSettle}
            onOpenDetail={(inv) => setDetailInvoice(inv)}
            handleSendToNTS={handleSendToNTS}
            sendingNts={sendingNts}
            handleAutoMatch={handleAutoMatch}
            autoMatching={autoMatching}
          />
        )}

        {/* SUB-TAB 4: HOMETAX_SYNC */}
        {activeSubTab === "HOMETAX_SYNC" && (
          <TaxHometaxSyncSubTab
            rpaDeptUserId={rpaDeptUserId}
            setRpaDeptUserId={setRpaDeptUserId}
            rpaDeptUserPw={rpaDeptUserPw}
            setRpaDeptUserPw={setRpaDeptUserPw}
            rpaSaving={rpaSaving}
            handleSaveRpaSettings={handleSaveRpaSettings}
            htSyncTarget={htSyncTarget}
            setHtSyncTarget={setHtSyncTarget}
            htStartDate={htStartDate}
            setHtStartDate={setHtStartDate}
            htEndDate={htEndDate}
            setHtEndDate={setHtEndDate}
            htSyncing={htSyncing}
            handleHometaxSync={handleHometaxSync}
            excelUploadIoType={excelUploadIoType}
            setExcelUploadIoType={setExcelUploadIoType}
            excelUploading={excelUploading}
            excelInputRef={excelInputRef}
            handleHometaxExcelUpload={handleHometaxExcelUpload}
            saleCount={saleInvoices.length}
            purchaseCount={purchaseInvoices.length}
            arUnpaidCount={arStats.unpaidCount}
            arUnpaidAmount={arStats.unpaid}
            apUnpaidCount={apStats.unpaidCount}
            apUnpaidAmount={apStats.unpaid}
            htSyncLogs={htSyncLogs}
          />
        )}
      </div>

      {/* MODAL 1: 세금계산서 ↔ 통장 입출금 1:1 / 1:N 비교 대사 모달 */}
      {reconcileInvoice && (
        <ReconcileModal
          bankSearchTerm={bankSearchTerm}
          batchSubject={batchSubject}
          candBankSort={candBankSort}
          filteredCandidateTxs={filteredCandidateTxs}
          handleClassifyBankTxInModal={handleClassifyBankTxInModal}
          handleConfirmBankMatch={handleConfirmBankMatch}
          handleManualSettleSave={handleManualSettleSave}
          handleUnmatchBankTx={handleUnmatchBankTx}
          linkedBankSort={linkedBankSort}
          linkedBankTxs={linkedBankTxs}
          manualSettleInput={manualSettleInput}
          modalAccountSubjects={modalAccountSubjects}
          reconcileInvoice={reconcileInvoice}
          reconcileLoading={reconcileLoading}
          reconcileUnpaidBalance={reconcileUnpaidBalance}
          rowSubjectMap={rowSubjectMap}
          selectedBankTxIds={selectedBankTxIds}
          selectedBankTxSum={selectedBankTxSum}
          setBankSearchTerm={setBankSearchTerm}
          setBatchSubject={setBatchSubject}
          setManualSettleInput={setManualSettleInput}
          setReconcileInvoice={setReconcileInvoice}
          setRowSubjectMap={setRowSubjectMap}
          setSelectedBankTxIds={setSelectedBankTxIds}
          setSettleReasonInput={setSettleReasonInput}
          settleReasonInput={settleReasonInput}
          sortedLinkedBankTxs={sortedLinkedBankTxs}
        />
      )}

      {/* MODAL 2: 매출 세금계산서 수동 발행 / 매입 세금계산서 수동 등록 모달 */}
      {showIssueModal && (
        <IssueModal
          custName={custName}
          domainType={domainType}
          handleManualIssue={handleManualIssue}
          issueDate={issueDate}
          manualNtsConfirmNo={manualNtsConfirmNo}
          manualPartnerOptions={manualPartnerOptions}
          manualPartners={manualPartners}
          manualTaxSpec={manualTaxSpec}
          modalIoType={modalIoType}
          modalSupplierEntity={modalSupplierEntity}
          selectedManualPartnerId={selectedManualPartnerId}
          setCustName={setCustName}
          setDomainType={setDomainType}
          setIssueDate={setIssueDate}
          setManualNtsConfirmNo={setManualNtsConfirmNo}
          setManualTaxSpec={setManualTaxSpec}
          setModalIoType={setModalIoType}
          setModalSupplierEntity={setModalSupplierEntity}
          setShowIssueModal={setShowIssueModal}
          showIssueModal={showIssueModal}
        />
      )}

      {/* MODAL 3: 전자세금계산서 상세조회 Modal (Hometax / Popbill Style) */}
      {detailInvoice && (
        <DetailModal
          detailInvoice={detailInvoice}
          handleDeleteInvoice={handleDeleteInvoice}
          handleOpenPopbillPrint={handleOpenPopbillPrint}
          handleOpenPopbillView={handleOpenPopbillView}
          openReconcileModal={openReconcileModal}
          setDetailInvoice={setDetailInvoice}
        />
      )}
    </div>
  );
};
