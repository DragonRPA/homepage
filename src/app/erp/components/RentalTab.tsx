"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Truck, Plus, RefreshCw, DollarSign, Layers, ShieldCheck } from "lucide-react";
import { RentalSubTabGrids, type RentalSubTabKey } from "./rental/RentalSubTabGrids";
import { useRentalTabController } from "./rental/useRentalTabController";

const AcquireAssetModal = dynamic(
  () => import("./rental/RentalAssetModelModals").then((m) => m.AcquireAssetModal),
  { ssr: false }
);
const AddModelModal = dynamic(
  () => import("./rental/RentalAssetModelModals").then((m) => m.AddModelModal),
  { ssr: false }
);
const AddBillingModal = dynamic(
  () => import("./rental/RentalAssetModelModals").then((m) => m.AddBillingModal),
  { ssr: false }
);
const AddContractModal = dynamic(
  () => import("./rental/RentalAddContractModal").then((m) => m.AddContractModal),
  { ssr: false }
);
const EditContractModal = dynamic(
  () => import("./rental/RentalEditContractModal").then((m) => m.EditContractModal),
  { ssr: false }
);
const RentalDeprecModal = dynamic(
  () => import("./rental/RentalSubTabGrids").then((m) => m.RentalDeprecModal),
  { ssr: false }
);
const RentalDocViewerModal = dynamic(
  () => import("./rental/RentalSubTabGrids").then((m) => m.RentalDocViewerModal),
  { ssr: false }
);

interface RentalTabProps {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onNavigateToTax?: () => void;
}

export const RentalTab: React.FC<RentalTabProps> = ({ currentUser, selectedEntity = "ALL", onNavigateToTax }) => {
  const {
    canBill, subTab, setSubTab, loading, toast,
    models, assets, contracts, billings, partners,
    selectedYm, setSelectedYm, rentalSearchQuery, setRentalSearchQuery,
    showAddModelModal, setShowAddModelModal, showAcquireAssetModal, setShowAcquireAssetModal,
    showDeprecModal, setShowDeprecModal, showAddContractModal, setShowAddContractModal,
    showEditContractModal, setShowEditContractModal, showAddBillingModal, setShowAddBillingModal,
    activeDocViewer, setActiveDocViewer,
    editCtContractNo, editCtEntityType, setEditCtEntityType, editCtPartnerId, setEditCtPartnerId,
    editCtCustomer, setEditCtCustomer, editCtStart, setEditCtStart, editCtEnd, setEditCtEnd,
    editCtMonthlyRate, setEditCtMonthlyRate, editCtDailyRate, setEditCtDailyRate,
    editCtRateBasis, setEditCtRateBasis, editCtDeposit, setEditCtDeposit,
    editCtVatAmount, setEditCtVatAmount, editCtBillingDay, setEditCtBillingDay,
    editCtStatus, setEditCtStatus, editCtMemo, setEditCtMemo, editCtTaxSpec, setEditCtTaxSpec,
    editCtAddItems, setEditCtAddItems, editCtAttachedOptions, setEditCtAttachedOptions,
    ctAttachedOptions, setCtAttachedOptions, optionCatalog,
    modelCode, setModelCode, modelName, setModelName, modelMonthlyRate, setModelMonthlyRate,
    modelDailyRate, setModelDailyRate, modelDailyManual, setModelDailyManual, modelSpec, setModelSpec,
    assetNo, setAssetNo, assetQty, setAssetQty, assetModelId, setAssetModelId,
    serialNo, setSerialNo, acqDate, setAcqDate, acqCost, setAcqCost,
    salvageValue, setSalvageValue, usefulLife, setUsefulLife,
    ctEntityType, setCtEntityType, ctBaseContractId, setCtBaseContractId,
    ctPartnerId, setCtPartnerId, ctCustomer, setCtCustomer, ctRentalItems, setCtRentalItems,
    ctStart, setCtStart, ctEnd, setCtEnd, ctRateBasis, setCtRateBasis,
    ctMonthlyRate, setCtMonthlyRate, ctDailyRate, setCtDailyRate, ctVatAmount, setCtVatAmount,
    ctBillingDay, setCtBillingDay, ctDeposit, setCtDeposit, ctTaxSpec, setCtTaxSpec,
    setCtFileUrl, ctFileName, setCtFileName, isCtFileDragging, setIsCtFileDragging, ctFileInputRef,
    blContractId, setBlContractId, blYm, setBlYm, blStart, setBlStart, blEnd, setBlEnd,
    blDays, setBlDays, blRateBasis, setBlRateBasis, blDailyRate, setBlDailyRate,
    blUseProRata, setBlUseProRata, blSupplyAmount, setBlSupplyAmount,
    blVatAmount, setBlVatAmount, blTaxSpec, setBlTaxSpec,
    inStockProducts, partnerComboboxOptions, modelComboboxOptions,
    inStockProductComboboxOptions, contractComboboxOptions,
    fetchData, recalcDraftItemsTotals, handleContractFileUpload, handleOpenContractFile,
    handleAddModel, computeNextRentalAssetNo, handleAcquireAsset, handleExecuteDepreciation,
    handleAddContract, handleReturnContract, handleOpenEditContract, handleUpdateContract,
    handleDeleteContract, handleDeleteBilling, recalcBillingAmounts,
    applyRentalContractTemplateToBilling, handleOpenBillingFromContract,
    handleAddBilling, handleIssueTaxFromRental, openAcquireAssetModal, openAddModelModal,
  } = useRentalTabController({ currentUser, selectedEntity, onNavigateToTax });

  const subTabItems: Array<{ key: RentalSubTabKey; label: string; icon: React.ReactNode }> = [
    { key: "assets", label: `자산 취득 & 감가상각 (${assets.length})`, icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { key: "contracts", label: `임대계약 대장 (${contracts.length})`, icon: <Truck className="w-3.5 h-3.5" /> },
    { key: "billings", label: `일할 매출정산 & 청구 (${billings.length})`, icon: <DollarSign className="w-3.5 h-3.5" /> },
    { key: "models", label: `임대 기종 모델 (${models.length})`, icon: <Layers className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full gap-3 p-4 bg-[#ebe5d8] text-[#0f172a] overflow-hidden font-sans dark:bg-slate-950 dark:text-slate-100">
      {toast && (
        <div className={`fixed top-16 right-5 z-50 px-4 py-2 rounded text-xs font-bold text-white shadow-xl ${
          toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-[#b5a894] dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          {subTabItems.map((t) => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
                subTab === t.key
                  ? "bg-[#1d4ed8] text-white shadow"
                  : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Action Buttons (Pipeline) */}
        <div className="flex items-center gap-2">
          {subTab === "assets" && (
            <>
              <button
                onClick={() => setShowDeprecModal(true)}
                className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-xs font-bold text-amber-300 rounded flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>당월 감가상각 마감 실행</span>
              </button>
              <button
                onClick={openAcquireAssetModal}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>자산 취득 등록</span>
              </button>
            </>
          )}
          {subTab === "contracts" && (
            <button
              onClick={() => setShowAddContractModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>신규 임대계약</span>
            </button>
          )}
          {subTab === "billings" && canBill && (
            <button
              onClick={() => setShowAddBillingModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>일할 청구서 생성</span>
            </button>
          )}
          {subTab === "models" && (
            <button
              onClick={openAddModelModal}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>기종 모델 등록</span>
            </button>
          )}
          <button
            onClick={fetchData}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Scope Filter Bar + Main Inspection Grids + Terminal Summary */}
      <RentalSubTabGrids
        subTab={subTab} selectedYm={selectedYm} setSelectedYm={setSelectedYm}
        rentalSearchQuery={rentalSearchQuery} setRentalSearchQuery={setRentalSearchQuery}
        assets={assets} contracts={contracts} billings={billings} models={models} canBill={canBill}
        handleOpenBillingFromContract={handleOpenBillingFromContract} handleOpenEditContract={handleOpenEditContract}
        handleDeleteContract={handleDeleteContract} handleOpenContractFile={handleOpenContractFile}
        handleReturnContract={handleReturnContract} handleDeleteBilling={handleDeleteBilling}
        handleIssueTaxFromRental={handleIssueTaxFromRental}
      />

      {showAcquireAssetModal && (
        <AcquireAssetModal
          acqCost={acqCost} acqDate={acqDate} assetModelId={assetModelId} assetNo={assetNo} assetQty={assetQty}
          assets={assets} computeNextRentalAssetNo={computeNextRentalAssetNo} handleAcquireAsset={handleAcquireAsset}
          modelComboboxOptions={modelComboboxOptions} salvageValue={salvageValue} serialNo={serialNo}
          setAcqCost={setAcqCost} setAcqDate={setAcqDate} setAssetModelId={setAssetModelId} setAssetNo={setAssetNo}
          setAssetQty={setAssetQty} setSalvageValue={setSalvageValue} setSerialNo={setSerialNo}
          setShowAcquireAssetModal={setShowAcquireAssetModal} setUsefulLife={setUsefulLife}
          showAcquireAssetModal={showAcquireAssetModal} usefulLife={usefulLife}
        />
      )}

      {showAddModelModal && (
        <AddModelModal
          handleAddModel={handleAddModel} modelCode={modelCode} modelDailyManual={modelDailyManual}
          modelDailyRate={modelDailyRate} modelMonthlyRate={modelMonthlyRate} modelName={modelName} modelSpec={modelSpec}
          setModelCode={setModelCode} setModelDailyManual={setModelDailyManual} setModelDailyRate={setModelDailyRate}
          setModelMonthlyRate={setModelMonthlyRate} setModelName={setModelName} setModelSpec={setModelSpec}
          setShowAddModelModal={setShowAddModelModal} showAddModelModal={showAddModelModal}
        />
      )}

      {showAddContractModal && (
        <AddContractModal
          contractComboboxOptions={contractComboboxOptions} contracts={contracts} ctAttachedOptions={ctAttachedOptions}
          ctBaseContractId={ctBaseContractId} ctBillingDay={ctBillingDay} ctCustomer={ctCustomer}
          ctDailyRate={ctDailyRate} ctDeposit={ctDeposit} ctEnd={ctEnd} ctEntityType={ctEntityType}
          ctFileInputRef={ctFileInputRef} ctFileName={ctFileName} ctMonthlyRate={ctMonthlyRate}
          ctPartnerId={ctPartnerId} ctRateBasis={ctRateBasis} ctRentalItems={ctRentalItems} ctStart={ctStart}
          ctTaxSpec={ctTaxSpec} ctVatAmount={ctVatAmount} handleAddContract={handleAddContract}
          handleContractFileUpload={handleContractFileUpload} inStockProductComboboxOptions={inStockProductComboboxOptions}
          inStockProducts={inStockProducts} isCtFileDragging={isCtFileDragging} optionCatalog={optionCatalog}
          partnerComboboxOptions={partnerComboboxOptions} partners={partners} recalcDraftItemsTotals={recalcDraftItemsTotals}
          setCtAttachedOptions={setCtAttachedOptions} setCtBaseContractId={setCtBaseContractId}
          setCtBillingDay={setCtBillingDay} setCtCustomer={setCtCustomer} setCtDailyRate={setCtDailyRate}
          setCtDeposit={setCtDeposit} setCtEnd={setCtEnd} setCtEntityType={setCtEntityType} setCtFileName={setCtFileName}
          setCtFileUrl={setCtFileUrl} setCtMonthlyRate={setCtMonthlyRate} setCtPartnerId={setCtPartnerId}
          setCtRateBasis={setCtRateBasis} setCtRentalItems={setCtRentalItems} setCtStart={setCtStart}
          setCtTaxSpec={setCtTaxSpec} setCtVatAmount={setCtVatAmount} setIsCtFileDragging={setIsCtFileDragging}
          setShowAddContractModal={setShowAddContractModal} showAddContractModal={showAddContractModal}
        />
      )}

      {showEditContractModal && (
        <EditContractModal
          editCtAddItems={editCtAddItems} editCtAttachedOptions={editCtAttachedOptions} editCtBillingDay={editCtBillingDay}
          editCtContractNo={editCtContractNo} editCtCustomer={editCtCustomer} editCtDailyRate={editCtDailyRate}
          editCtDeposit={editCtDeposit} editCtEnd={editCtEnd} editCtEntityType={editCtEntityType} editCtMemo={editCtMemo}
          editCtMonthlyRate={editCtMonthlyRate} editCtPartnerId={editCtPartnerId} editCtRateBasis={editCtRateBasis}
          editCtStart={editCtStart} editCtStatus={editCtStatus} editCtTaxSpec={editCtTaxSpec} editCtVatAmount={editCtVatAmount}
          handleUpdateContract={handleUpdateContract} inStockProductComboboxOptions={inStockProductComboboxOptions}
          inStockProducts={inStockProducts} optionCatalog={optionCatalog} partnerComboboxOptions={partnerComboboxOptions}
          partners={partners} recalcDraftItemsTotals={recalcDraftItemsTotals} setEditCtAddItems={setEditCtAddItems}
          setEditCtAttachedOptions={setEditCtAttachedOptions} setEditCtBillingDay={setEditCtBillingDay}
          setEditCtCustomer={setEditCtCustomer} setEditCtDailyRate={setEditCtDailyRate} setEditCtDeposit={setEditCtDeposit}
          setEditCtEnd={setEditCtEnd} setEditCtEntityType={setEditCtEntityType} setEditCtMemo={setEditCtMemo}
          setEditCtMonthlyRate={setEditCtMonthlyRate} setEditCtPartnerId={setEditCtPartnerId}
          setEditCtRateBasis={setEditCtRateBasis} setEditCtStart={setEditCtStart} setEditCtStatus={setEditCtStatus}
          setEditCtTaxSpec={setEditCtTaxSpec} setEditCtVatAmount={setEditCtVatAmount}
          setShowEditContractModal={setShowEditContractModal} showEditContractModal={showEditContractModal}
        />
      )}

      {showAddBillingModal && (
        <AddBillingModal
          applyRentalContractTemplateToBilling={applyRentalContractTemplateToBilling} blContractId={blContractId}
          blDailyRate={blDailyRate} blDays={blDays} blEnd={blEnd} blRateBasis={blRateBasis} blStart={blStart}
          blSupplyAmount={blSupplyAmount} blTaxSpec={blTaxSpec} blUseProRata={blUseProRata} blVatAmount={blVatAmount}
          blYm={blYm} contractComboboxOptions={contractComboboxOptions} contracts={contracts}
          handleAddBilling={handleAddBilling} recalcBillingAmounts={recalcBillingAmounts} setBlContractId={setBlContractId}
          setBlDailyRate={setBlDailyRate} setBlDays={setBlDays} setBlEnd={setBlEnd} setBlRateBasis={setBlRateBasis}
          setBlStart={setBlStart} setBlSupplyAmount={setBlSupplyAmount} setBlTaxSpec={setBlTaxSpec}
          setBlUseProRata={setBlUseProRata} setBlVatAmount={setBlVatAmount} setBlYm={setBlYm}
          setShowAddBillingModal={setShowAddBillingModal} showAddBillingModal={showAddBillingModal}
        />
      )}

      {showDeprecModal && (
        <RentalDeprecModal
          assetCount={assets.length}
          onClose={() => setShowDeprecModal(false)}
          onExecute={handleExecuteDepreciation}
        />
      )}

      {activeDocViewer && (
        <RentalDocViewerModal activeDocViewer={activeDocViewer} onClose={() => setActiveDocViewer(null)} />
      )}
    </div>
  );
};
