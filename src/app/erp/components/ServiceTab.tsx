"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Briefcase, Plus, RefreshCw, Layers } from "lucide-react";
import { ServiceLedgersAndDocModal } from "./service/ServiceLedgersAndDocModal";
import { useServiceTabController } from "./service/useServiceTabController";

const AddContractModal = dynamic(
  () => import("./service/ServiceAddContractModal").then((m) => m.AddContractModal),
  { ssr: false }
);
const EditContractModal = dynamic(
  () => import("./service/ServiceEditContractModal").then((m) => m.EditContractModal),
  { ssr: false }
);
const AddBillingModal = dynamic(
  () => import("./service/ServiceBillingModal").then((m) => m.AddBillingModal),
  { ssr: false }
);

interface ServiceTabProps {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onNavigateToTax?: () => void;
}

export const ServiceTab: React.FC<ServiceTabProps> = ({ currentUser, selectedEntity = "ALL", onNavigateToTax }) => {
  const {
    canBill, activeType, setActiveType, loading, toast, showToast,
    contracts, billings, partners, employees,
    showAddContractModal, setShowAddContractModal, showEditContractModal, setShowEditContractModal,
    showAddBillingModal, setShowAddBillingModal, activeDocViewer, setActiveDocViewer,
    billingContractFilter, setBillingContractFilter,
    ctEntityType, setCtEntityType, ctPartnerId, setCtPartnerId, ctCustomer, setCtCustomer,
    ctProject, setCtProject, ctAmount, setCtAmount, ctMonthlyFee, setCtMonthlyFee,
    ctStart, setCtStart, ctEnd, setCtEnd, ctBillingDay, setCtBillingDay, ctMemo, setCtMemo,
    ctVatAmount, setCtVatAmount, ctTaxSpec, setCtTaxSpec, setCtFileUrl, ctFileName, setCtFileName,
    isCtFileDragging, setIsCtFileDragging, ctFileInputRef,
    ctAssignedEmployees, setCtAssignedEmployees, ctSelectedEmpId, setCtSelectedEmpId,
    ctIncludeOtInBilling, setCtIncludeOtInBilling, ctApplyProRata, setCtApplyProRata,
    ctProRataMonth, setCtProRataMonth, ctOtBreakdown,
    editCtContractNo, editCtEntityType, setEditCtEntityType, editCtPartnerId, setEditCtPartnerId,
    editCtCustomer, setEditCtCustomer, editCtProject, setEditCtProject,
    editCtAmount, setEditCtAmount, editCtMonthlyFee, setEditCtMonthlyFee,
    editCtVatAmount, setEditCtVatAmount, editCtStart, setEditCtStart, editCtEnd, setEditCtEnd,
    editCtBillingDay, setEditCtBillingDay, editCtStatus, setEditCtStatus, editCtMemo, setEditCtMemo,
    editCtTaxSpec, setEditCtTaxSpec, editCtFileName, editFileInputRef,
    editCtAssignedEmployees, setEditCtAssignedEmployees, editCtSelectedEmpId, setEditCtSelectedEmpId,
    editCtIncludeOtInBilling, setEditCtIncludeOtInBilling, editCtApplyProRata, setEditCtApplyProRata,
    editCtProRataMonth, setEditCtProRataMonth, editCtOtBreakdown,
    blContractId, setBlContractId, blMilestoneName, setBlMilestoneName,
    blSupplyAmount, setBlSupplyAmount, blVatAmount, setBlVatAmount, blDate, setBlDate,
    blTaxSpec, setBlTaxSpec, blIncludeOtInBilling, setBlIncludeOtInBilling,
    blApplyProRata, setBlApplyProRata, blOtSummary,
    servicePartnerOptions, serviceContractOptions,
    fetchData, enrichAssignedEmployeeJoinDates, syncAssignedEmployeesToContract,
    handleSelectPartner, handleContractFileUpload, handleEditFileUpload, handleOpenContractFile,
    handleAddContract, handleOpenEditContract, handleUpdateContract, handleDeleteContract,
    applyServiceContractTemplateToBilling, handleAddBilling, handleDeleteBilling,
  } = useServiceTabController({ currentUser, selectedEntity, onNavigateToTax });

  return (
    <div className="flex flex-col h-full gap-3 p-4 bg-[#f4efe4] text-[#1c1917] overflow-hidden select-none">
      {toast && (
        <div
          className={`fixed top-16 right-5 z-50 px-4 py-2 rounded text-xs font-bold text-white shadow-xl ${
            toast.type === "error" ? "bg-rose-700" : "bg-emerald-700"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-[#b5a894] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveType("OPERATIONAL")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition border ${
              activeType === "OPERATIONAL"
                ? "bg-blue-700 text-white border-blue-900 shadow-sm"
                : "bg-[#ebe5d8] border-[#b5a894] text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>운영용역 (월 정기 유지보수)</span>
          </button>
          <button
            onClick={() => setActiveType("DEVELOPMENT")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition border ${
              activeType === "DEVELOPMENT"
                ? "bg-purple-700 text-white border-purple-900 shadow-sm"
                : "bg-[#ebe5d8] border-[#b5a894] text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>개발용역 (SI 프로젝트 / 마일스톤)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canBill && (
            <button
              onClick={() => setShowAddBillingModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-900 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{activeType === "OPERATIONAL" ? "정기 청구 생성" : "기성금 청구 생성"}</span>
            </button>
          )}
          <button
            onClick={() => setShowAddContractModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white border border-blue-900 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>신규 계약 체결</span>
          </button>
          <button
            onClick={fetchData}
            className="p-1.5 rounded border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd]"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Split Ledgers, Footer Summary Bar & Document Viewer */}
      <ServiceLedgersAndDocModal
        activeType={activeType} contracts={contracts} billings={billings}
        billingContractFilter={billingContractFilter} setBillingContractFilter={setBillingContractFilter}
        handleOpenEditContract={handleOpenEditContract} handleDeleteContract={handleDeleteContract}
        handleOpenContractFile={handleOpenContractFile} handleDeleteBilling={handleDeleteBilling}
        activeDocViewer={activeDocViewer} setActiveDocViewer={setActiveDocViewer}
      />

      {/* MODAL 1: ADD CONTRACT */}
      {showAddContractModal && (
        <AddContractModal
          activeType={activeType} employees={employees} partners={partners} servicePartnerOptions={servicePartnerOptions}
          ctAmount={ctAmount} setCtAmount={setCtAmount} ctMonthlyFee={ctMonthlyFee} setCtMonthlyFee={setCtMonthlyFee}
          ctVatAmount={ctVatAmount} setCtVatAmount={setCtVatAmount} ctTaxSpec={ctTaxSpec} setCtTaxSpec={setCtTaxSpec}
          ctEntityType={ctEntityType} setCtEntityType={setCtEntityType} ctPartnerId={ctPartnerId} setCtPartnerId={setCtPartnerId}
          ctCustomer={ctCustomer} setCtCustomer={setCtCustomer} ctProject={ctProject} setCtProject={setCtProject}
          ctStart={ctStart} setCtStart={setCtStart} ctEnd={ctEnd} setCtEnd={setCtEnd}
          ctBillingDay={ctBillingDay} setCtBillingDay={setCtBillingDay} ctMemo={ctMemo} setCtMemo={setCtMemo}
          ctFileInputRef={ctFileInputRef} ctFileName={ctFileName} setCtFileName={setCtFileName} setCtFileUrl={setCtFileUrl}
          isCtFileDragging={isCtFileDragging} setIsCtFileDragging={setIsCtFileDragging}
          ctAssignedEmployees={ctAssignedEmployees} setCtAssignedEmployees={setCtAssignedEmployees}
          ctSelectedEmpId={ctSelectedEmpId} setCtSelectedEmpId={setCtSelectedEmpId}
          ctIncludeOtInBilling={ctIncludeOtInBilling} setCtIncludeOtInBilling={setCtIncludeOtInBilling}
          ctApplyProRata={ctApplyProRata} setCtApplyProRata={setCtApplyProRata}
          ctProRataMonth={ctProRataMonth} setCtProRataMonth={setCtProRataMonth} ctOtBreakdown={ctOtBreakdown}
          enrichAssignedEmployeeJoinDates={enrichAssignedEmployeeJoinDates}
          syncAssignedEmployeesToContract={syncAssignedEmployeesToContract}
          handleAddContract={handleAddContract} handleContractFileUpload={handleContractFileUpload}
          handleSelectPartner={handleSelectPartner} showToast={showToast}
          showAddContractModal={showAddContractModal} setShowAddContractModal={setShowAddContractModal}
        />
      )}

      {/* MODAL 2: EDIT CONTRACT */}
      {showEditContractModal && (
        <EditContractModal
          activeType={activeType} employees={employees} partners={partners} servicePartnerOptions={servicePartnerOptions}
          editCtContractNo={editCtContractNo} editCtStatus={editCtStatus} setEditCtStatus={setEditCtStatus}
          editCtAmount={editCtAmount} setEditCtAmount={setEditCtAmount}
          editCtMonthlyFee={editCtMonthlyFee} setEditCtMonthlyFee={setEditCtMonthlyFee}
          editCtVatAmount={editCtVatAmount} setEditCtVatAmount={setEditCtVatAmount}
          editCtTaxSpec={editCtTaxSpec} setEditCtTaxSpec={setEditCtTaxSpec}
          editCtEntityType={editCtEntityType} setEditCtEntityType={setEditCtEntityType}
          editCtPartnerId={editCtPartnerId} setEditCtPartnerId={setEditCtPartnerId}
          editCtCustomer={editCtCustomer} setEditCtCustomer={setEditCtCustomer}
          editCtProject={editCtProject} setEditCtProject={setEditCtProject}
          editCtStart={editCtStart} setEditCtStart={setEditCtStart} editCtEnd={editCtEnd} setEditCtEnd={setEditCtEnd}
          editCtBillingDay={editCtBillingDay} setEditCtBillingDay={setEditCtBillingDay}
          editCtMemo={editCtMemo} setEditCtMemo={setEditCtMemo}
          editFileInputRef={editFileInputRef} editCtFileName={editCtFileName}
          editCtAssignedEmployees={editCtAssignedEmployees} setEditCtAssignedEmployees={setEditCtAssignedEmployees}
          editCtSelectedEmpId={editCtSelectedEmpId} setEditCtSelectedEmpId={setEditCtSelectedEmpId}
          editCtIncludeOtInBilling={editCtIncludeOtInBilling} setEditCtIncludeOtInBilling={setEditCtIncludeOtInBilling}
          editCtApplyProRata={editCtApplyProRata} setEditCtApplyProRata={setEditCtApplyProRata}
          editCtProRataMonth={editCtProRataMonth} setEditCtProRataMonth={setEditCtProRataMonth}
          editCtOtBreakdown={editCtOtBreakdown}
          enrichAssignedEmployeeJoinDates={enrichAssignedEmployeeJoinDates}
          syncAssignedEmployeesToContract={syncAssignedEmployeesToContract}
          handleEditFileUpload={handleEditFileUpload} handleUpdateContract={handleUpdateContract} showToast={showToast}
          showEditContractModal={showEditContractModal} setShowEditContractModal={setShowEditContractModal}
        />
      )}

      {/* MODAL 3: ADD BILLING */}
      {showAddBillingModal && (
        <AddBillingModal
          activeType={activeType} contracts={contracts} serviceContractOptions={serviceContractOptions}
          blContractId={blContractId} setBlContractId={setBlContractId}
          blMilestoneName={blMilestoneName} setBlMilestoneName={setBlMilestoneName}
          blSupplyAmount={blSupplyAmount} setBlSupplyAmount={setBlSupplyAmount}
          blVatAmount={blVatAmount} setBlVatAmount={setBlVatAmount}
          blDate={blDate} setBlDate={setBlDate} blTaxSpec={blTaxSpec} setBlTaxSpec={setBlTaxSpec}
          blIncludeOtInBilling={blIncludeOtInBilling} setBlIncludeOtInBilling={setBlIncludeOtInBilling}
          blApplyProRata={blApplyProRata} setBlApplyProRata={setBlApplyProRata} blOtSummary={blOtSummary}
          applyServiceContractTemplateToBilling={applyServiceContractTemplateToBilling}
          enrichAssignedEmployeeJoinDates={enrichAssignedEmployeeJoinDates} handleAddBilling={handleAddBilling}
          showAddBillingModal={showAddBillingModal} setShowAddBillingModal={setShowAddBillingModal}
        />
      )}
    </div>
  );
};
