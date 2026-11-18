"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Package, Plus, RefreshCw, Wrench, X } from "lucide-react";
import { type SearchSelectOption } from "./SearchSelectCombobox";
import { useErpTableSort } from "./SortableTh";
import { cleanErpNumber, formatErpInputNumber, formatErpNumber, sortErpItems } from "@/lib/erpFormat";
import { getKstTodayIso } from "@/lib/forkliftDomain";
import {
  DEFAULT_PM_INTERVAL_DAYS,
  PART_TRANSFER_TYPE_LABELS,
  createDefaultPmChecklist,
  type AssetWearComputedItem,
  type MaintenanceResultStatus,
  type MaintenanceType,
  type PartStockSource,
  type PartTransferType,
  type PmChecklistItem,
} from "@/lib/rentalMaintenanceDomain";
import { MaintenanceActivitiesAndPmSubTabs } from "./rental-maintenance/MaintenanceActivitiesAndPmSubTabs";
import { HoursWearSubTab, VehicleStockSubTab } from "./rental-maintenance/HoursWearAndVehicleStockTabs";
import {
  ASSET_STATUS_LABELS,
  sanitizeDecimalText,
  type SubTabKey,
  type CurrentUserInfo,
  type MaintenanceAssetOption,
  type EmployeeOption,
  type ServiceVehicleRecord,
  type PartCatalogItem,
  type MaintenanceRecord,
  type PmScheduleRow,
  type AssetWearRow,
  type HourLogRow,
  type PartMovementRow,
  type FleetStockSummaryRow,
  type PartDraftLine,
  type MaintenanceSummaryStats,
} from "./rental-maintenance/rentalMaintenanceTypes";

const MaintModal = dynamic(
  () => import("./rental-maintenance/RentalMaintActivityModal").then((m) => m.MaintModal),
  { ssr: false }
);
const TransferModal = dynamic(
  () => import("./rental-maintenance/RentalMaintStockVehicleModals").then((m) => m.TransferModal),
  { ssr: false }
);
const VehicleModal = dynamic(
  () => import("./rental-maintenance/RentalMaintStockVehicleModals").then((m) => m.VehicleModal),
  { ssr: false }
);
const QuickPartModal = dynamic(
  () => import("./rental-maintenance/RentalMaintStockVehicleModals").then((m) => m.QuickPartModal),
  { ssr: false }
);
const YardReceiptModal = dynamic(
  () => import("./rental-maintenance/RentalMaintStockVehicleModals").then((m) => m.YardReceiptModal),
  { ssr: false }
);

export default function RentalMaintenanceTab({ currentUser }: { currentUser?: CurrentUserInfo | null }) {
  const actorName = currentUser?.name || currentUser?.username || "담당자";
  const today = useMemo(() => getKstTodayIso(), []);

  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>("ACTIVITIES");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  // Core data from GET /api/erp/rental/maintenance
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [pmSchedules, setPmSchedules] = useState<PmScheduleRow[]>([]);
  const [assets, setAssets] = useState<MaintenanceAssetOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [vehicles, setVehicles] = useState<ServiceVehicleRecord[]>([]);
  const [partsCatalog, setPartsCatalog] = useState<PartCatalogItem[]>([]);
  const [summary, setSummary] = useState<MaintenanceSummaryStats>({
    totalMaintenances: 0,
    preventiveCount: 0,
    correctiveCount: 0,
    partsCostSum: 0,
    totalCostSum: 0,
    pmOverdueCount: 0,
    pmDueSoonCount: 0,
    pmOnTrackCount: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [resultFilter, setResultFilter] = useState<string>("ALL");
  const [pmStatusFilter, setPmStatusFilter] = useState<string>("ALL");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");

  // Operating hours & wear state
  const [wearAssets, setWearAssets] = useState<AssetWearRow[]>([]);
  const [wearSeverityFilter, setWearSeverityFilter] = useState<string>("ALL");
  const [selectedWearAssetId, setSelectedWearAssetId] = useState<number | null>(null);
  const [hourLogs, setHourLogs] = useState<HourLogRow[]>([]);
  const [hourInputValue, setHourInputValue] = useState("");
  const [hourInputDate, setHourInputDate] = useState(today);
  const [hourInputNote, setHourInputNote] = useState("");
  const [wearEditPmInterval, setWearEditPmInterval] = useState(String(DEFAULT_PM_INTERVAL_DAYS));
  const [wearEditItems, setWearEditItems] = useState<
    Array<{ componentCode: string; componentName: string; intervalHours: string; lastReplacedHours: string; lastReplacedDate: string; memo: string }>
  >([]);
  const [savingHours, setSavingHours] = useState(false);

  // Vehicle stocks state
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [movements, setMovements] = useState<PartMovementRow[]>([]);
  const [fleetStockSummary, setFleetStockSummary] = useState<FleetStockSummaryRow[]>([]);
  const [movementTypeFilter, setMovementTypeFilter] = useState("ALL");

  // Maintenance Modal State
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [editingMaintId, setEditingMaintId] = useState<number | null>(null);
  const [editingMaintNo, setEditingMaintNo] = useState<string>("");
  const [maintFormAssetId, setMaintFormAssetId] = useState<string>("");
  const [maintFormDate, setMaintFormDate] = useState<string>(today);
  const [maintFormType, setMaintFormType] = useState<MaintenanceType>("PREVENTIVE");
  const [maintFormResult, setMaintFormResult] = useState<MaintenanceResultStatus>("COMPLETED");
  const [maintFormHours, setMaintFormHours] = useState<string>("0");
  const [maintFormTechId, setMaintFormTechId] = useState<string>("");
  const [maintFormTechName, setMaintFormTechName] = useState<string>("");
  const [maintFormVehicleId, setMaintFormVehicleId] = useState<string>("");
  const [maintFormStatusAfter, setMaintFormStatusAfter] = useState<string>("KEEP");
  const [maintFormTitle, setMaintFormTitle] = useState<string>("");
  const [maintFormSymptom, setMaintFormSymptom] = useState<string>("");
  const [maintFormWork, setMaintFormWork] = useState<string>("");
  const [maintFormNextPm, setMaintFormNextPm] = useState<string>("");
  const [maintFormLaborCost, setMaintFormLaborCost] = useState<string>("0");
  const [maintFormTravelCost, setMaintFormTravelCost] = useState<string>("0");
  const [maintFormChecklist, setMaintFormChecklist] = useState<PmChecklistItem[]>(createDefaultPmChecklist());
  const [maintFormResetCodes, setMaintFormResetCodes] = useState<string[]>([]);
  const [maintFormParts, setMaintFormParts] = useState<PartDraftLine[]>([]);
  const [savingMaint, setSavingMaint] = useState(false);

  // Stock Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferType, setTransferType] = useState<PartTransferType>("LOAD_TO_VEHICLE");
  const [transferFromVehicleId, setTransferFromVehicleId] = useState<string>("");
  const [transferToVehicleId, setTransferToVehicleId] = useState<string>("");
  const [transferProductId, setTransferProductId] = useState<string>("");
  const [transferQty, setTransferQty] = useState<string>("1");
  const [transferTargetQty, setTransferTargetQty] = useState<string>("");
  const [transferDate, setTransferDate] = useState<string>(today);
  const [transferNote, setTransferNote] = useState<string>("");
  const [savingTransfer, setSavingTransfer] = useState(false);

  // Vehicle Create/Edit Modal State
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [vehNo, setVehNo] = useState("");
  const [vehName, setVehName] = useState("");
  const [vehDriverId, setVehDriverId] = useState("");
  const [vehDriverName, setVehDriverName] = useState("");
  const [vehDriverPhone, setVehDriverPhone] = useState("");
  const [vehRegion, setVehRegion] = useState("");
  const [vehStatus, setVehStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [vehMemo, setVehMemo] = useState("");
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Quick Part SKU Modal State
  const [showQuickPartModal, setShowQuickPartModal] = useState(false);
  const [qpName, setQpName] = useState("");
  const [qpSkuCode, setQpSkuCode] = useState("");
  const [qpPartNo, setQpPartNo] = useState("");
  const [qpCategory, setQpCategory] = useState("소모품·필터");
  const [qpUnit, setQpUnit] = useState("EA");
  const [qpCost, setQpCost] = useState("0");
  const [qpPrice, setQpPrice] = useState("0");
  const [qpSafetyStock, setQpSafetyStock] = useState("2");
  const [qpInitialStock, setQpInitialStock] = useState("0");
  const [savingQuickPart, setSavingQuickPart] = useState(false);

  // Yard Receipt Modal State
  const [showYardReceiptModal, setShowYardReceiptModal] = useState(false);
  const [yrProductId, setYrProductId] = useState("");
  const [yrQty, setYrQty] = useState("1");
  const [yrDate, setYrDate] = useState(today);
  const [yrNote, setYrNote] = useState("");
  const [savingYardReceipt, setSavingYardReceipt] = useState(false);

  const submitMaintenanceApi = async <T = any>(
    url: string,
    method: "POST" | "PUT",
    payload: unknown,
    fallbackMsg: string,
    setSaving: React.Dispatch<React.SetStateAction<boolean>>
  ): Promise<T | null> => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || fallbackMsg);
      }
      return json.data as T;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : fallbackMsg);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const loadMaintenanceData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const qs = new URLSearchParams();
      if (typeFilter !== "ALL") qs.set("type", typeFilter);
      if (resultFilter !== "ALL") qs.set("resultStatus", resultFilter);
      if (pmStatusFilter !== "ALL") qs.set("pmStatus", pmStatusFilter);
      if (startDateFilter) qs.set("startDate", startDateFilter);
      if (endDateFilter) qs.set("endDate", endDateFilter);
      if (searchQuery.trim()) qs.set("q", searchQuery.trim());

      const res = await fetch(`/api/erp/rental/maintenance?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "정비·부품 데이터를 불러오지 못했습니다.");
      }
      const d = json.data;
      setMaintenances(d.maintenances || []);
      setPmSchedules(d.pmSchedules || []);
      setAssets(d.assets || []);
      setEmployees(d.employees || []);
      setVehicles(d.vehicles || []);
      setPartsCatalog(d.partsCatalog || []);
      setSummary(
        d.summary || {
          totalMaintenances: 0,
          preventiveCount: 0,
          correctiveCount: 0,
          partsCostSum: 0,
          totalCostSum: 0,
          pmOverdueCount: 0,
          pmDueSoonCount: 0,
          pmOnTrackCount: 0,
        }
      );
      if (!selectedVehicleId && Array.isArray(d.vehicles) && d.vehicles.length > 0) {
        setSelectedVehicleId(d.vehicles[0].id);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "조회 오류");
    } finally {
      setLoading(false);
    }
  }, [endDateFilter, pmStatusFilter, resultFilter, searchQuery, selectedVehicleId, startDateFilter, typeFilter]);

  const loadOperatingHoursData = useCallback(
    async (overrideAssetId?: number | null) => {
      try {
        const qs = new URLSearchParams();
        const targetAssetId = overrideAssetId ?? selectedWearAssetId;
        if (targetAssetId) qs.set("assetId", String(targetAssetId));
        if (wearSeverityFilter !== "ALL") qs.set("severity", wearSeverityFilter);
        if (searchQuery.trim()) qs.set("q", searchQuery.trim());

        const res = await fetch(`/api/erp/rental/operating-hours?${qs.toString()}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "가동시간·열화 현황 조회 실패");
        }
        const rows: AssetWearRow[] = json.data.assets || [];
        setWearAssets(rows);
        setHourLogs(json.data.hourLogs || []);
        if ((!targetAssetId || !rows.some((r) => r.assetId === targetAssetId)) && rows.length > 0) {
          setSelectedWearAssetId(rows[0].assetId);
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "가동시간 조회 오류");
      }
    },
    [searchQuery, selectedWearAssetId, wearSeverityFilter]
  );

  const loadVehicleStocksData = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (movementTypeFilter !== "ALL") qs.set("movementType", movementTypeFilter);
      const res = await fetch(`/api/erp/rental/vehicle-stocks?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "부품재고 이동이력 조회 실패");
      }
      setMovements(json.data.movements || []);
      setFleetStockSummary(json.data.fleetStockSummary || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "부품재고 조회 오류");
    }
  }, [movementTypeFilter]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadMaintenanceData(), loadOperatingHoursData(), loadVehicleStocksData()]);
  }, [loadMaintenanceData, loadOperatingHoursData, loadVehicleStocksData]);

  useEffect(() => {
    void loadMaintenanceData();
  }, [loadMaintenanceData]);

  useEffect(() => {
    if (activeSubTab === "HOURS_WEAR") void loadOperatingHoursData();
    else if (activeSubTab === "VEHICLE_STOCK") void loadVehicleStocksData();
  }, [activeSubTab, loadOperatingHoursData, loadVehicleStocksData]);

  const selectedWearAsset = useMemo(
    () => wearAssets.find((a) => a.assetId === selectedWearAssetId) || null,
    [wearAssets, selectedWearAssetId]
  );

  useEffect(() => {
    if (!selectedWearAsset) return;
    setHourInputValue(String(selectedWearAsset.operatingHours || 0));
    setHourInputDate(today);
    setHourInputNote("");
    setWearEditPmInterval(String(selectedWearAsset.pmSchedule.pmIntervalDays || 30));
    setWearEditItems(
      selectedWearAsset.wearSummary.items.map((item: AssetWearComputedItem) => ({
        componentCode: item.componentCode,
        componentName: item.componentName,
        intervalHours: String(item.intervalHours),
        lastReplacedHours: String(item.lastReplacedHours),
        lastReplacedDate: item.lastReplacedDate || "",
        memo: item.memo || "",
      }))
    );
  }, [selectedWearAsset, today]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId]
  );

  // Combobox Options
  const assetComboOptions = useMemo<SearchSelectOption[]>(() => {
    return assets
      .filter((a) => a.status !== "DISPOSED")
      .map((a) => ({
        value: String(a.id),
        label: `${a.serialNo} · ${a.modelName || "모델미지정"}`,
        subLabel: a.currentCustomer
          ? `${a.currentCustomer}${a.currentSite ? ` (${a.currentSite})` : ""} · ${formatErpNumber(a.operatingHours)}h`
          : `주기장 대기 · ${formatErpNumber(a.operatingHours)}h`,
        badgeText: ASSET_STATUS_LABELS[a.status] || a.status,
        badgeColor:
          a.status === "RENTED"
            ? "bg-blue-100 text-blue-700"
            : a.status === "REPAIRING"
              ? "bg-amber-100 text-amber-700"
              : "bg-emerald-100 text-emerald-700",
        searchKeywords: [a.serialNo, a.modelName || "", a.currentCustomer || "", a.currentSite || "", a.contractNo || ""],
      }));
  }, [assets]);

  const employeeComboOptions = useMemo<SearchSelectOption[]>(() => {
    return employees.map((e) => ({
      value: String(e.id),
      label: `${e.name}${e.position ? ` (${e.position})` : ""}`,
      subLabel: [e.department, e.phone].filter(Boolean).join(" · "),
      searchKeywords: [e.name, e.department || "", e.position || "", e.employeeNo || ""],
    }));
  }, [employees]);

  const vehicleComboOptions = useMemo<SearchSelectOption[]>(() => {
    return vehicles
      .filter((v) => v.status === "ACTIVE")
      .map((v) => ({
        value: String(v.id),
        label: `${v.vehicleNo} · ${v.vehicleName}`,
        subLabel: [v.driverName, v.region].filter(Boolean).join(" · "),
        searchKeywords: [v.vehicleNo, v.vehicleName, v.driverName || "", v.region || ""],
      }));
  }, [vehicles]);

  const buildPartComboOptions = useCallback(
    (sourceType: PartStockSource, vehicleIdStr?: string): SearchSelectOption[] => {
      const vId = Number(vehicleIdStr || 0);
      const selectedVeh = vId > 0 ? vehicles.find((v) => v.id === vId) : null;
      return partsCatalog.map((p) => {
        const vehStock = selectedVeh?.stocks.find((s) => s.productId === p.id)?.currentQty ?? 0;
        const availQty = sourceType === "VEHICLE" && selectedVeh ? vehStock : p.currentStock;
        return {
          value: String(p.id),
          label: `${p.name} [${p.skuCode}]`,
          subLabel: `${p.partNo ? `P/N ${p.partNo} · ` : ""}${
            sourceType === "VEHICLE" && selectedVeh
              ? `차량적재 ${formatErpNumber(availQty)} ${p.unit}`
              : `주기장 ${formatErpNumber(p.currentStock)} ${p.unit} (차량합 ${formatErpNumber(p.vehicleTotalStock)})`
          } · 원가 ₩${formatErpNumber(p.standardCost)}`,
          badgeText: p.itemClass === "PART" ? "부품" : p.category || p.itemClass,
          badgeColor: availQty > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600",
          searchKeywords: [p.name, p.skuCode, p.partNo || "", p.category || "", p.manufacturer || ""],
        };
      });
    },
    [partsCatalog, vehicles]
  );

  // Modal Open Helpers
  const openCreateMaintenanceModal = useCallback(
    (preset?: { assetId?: number; maintenanceType?: MaintenanceType; title?: string; resetCodes?: string[] }) => {
      const targetAsset = preset?.assetId ? assets.find((a) => a.id === preset.assetId) : null;
      const mType = preset?.maintenanceType || "PREVENTIVE";
      const firstActiveVeh = vehicles.find((v) => v.status === "ACTIVE");
      setEditingMaintId(null);
      setEditingMaintNo("");
      setMaintFormAssetId(targetAsset ? String(targetAsset.id) : "");
      setMaintFormDate(today);
      setMaintFormType(mType);
      setMaintFormResult("COMPLETED");
      setMaintFormHours(targetAsset ? String(targetAsset.operatingHours || 0) : "0");
      setMaintFormTechId("");
      setMaintFormTechName(actorName);
      setMaintFormVehicleId(firstActiveVeh ? String(firstActiveVeh.id) : "");
      setMaintFormStatusAfter("KEEP");
      setMaintFormTitle(preset?.title || (mType === "PREVENTIVE" ? `${today.slice(0, 7)} 월간 정기 사전점검` : ""));
      setMaintFormSymptom("");
      setMaintFormWork("");
      setMaintFormNextPm("");
      setMaintFormLaborCost("0");
      setMaintFormTravelCost("0");
      setMaintFormChecklist(createDefaultPmChecklist());
      setMaintFormResetCodes(preset?.resetCodes || []);
      setMaintFormParts([]);
      setShowMaintModal(true);
    },
    [actorName, assets, today, vehicles]
  );

  const openEditMaintenanceModal = useCallback(
    (rec: MaintenanceRecord) => {
      setEditingMaintId(rec.id);
      setEditingMaintNo(rec.maintenanceNo);
      setMaintFormAssetId(String(rec.assetId));
      setMaintFormDate(rec.maintenanceDate || today);
      setMaintFormType(rec.maintenanceType);
      setMaintFormResult(rec.resultStatus);
      setMaintFormHours(String(rec.operatingHours || 0));
      setMaintFormTechId(rec.technicianEmployeeId ? String(rec.technicianEmployeeId) : "");
      setMaintFormTechName(rec.technicianName || "");
      setMaintFormVehicleId(rec.vehicleId ? String(rec.vehicleId) : "");
      setMaintFormStatusAfter(rec.assetStatusAfter || "KEEP");
      setMaintFormTitle(rec.title);
      setMaintFormSymptom(rec.symptom || "");
      setMaintFormWork(rec.workPerformed || "");
      setMaintFormNextPm(rec.nextPmDueDate || "");
      setMaintFormLaborCost(formatErpInputNumber(rec.laborCost || 0));
      setMaintFormTravelCost(formatErpInputNumber(rec.travelCost || 0));
      setMaintFormChecklist(rec.checklist.length > 0 ? rec.checklist : createDefaultPmChecklist());
      setMaintFormResetCodes(rec.resetComponentCodes || []);
      setMaintFormParts(
        rec.parts.map((p, idx) => ({
          key: `edit-${p.id || idx}-${Date.now()}`,
          productId: String(p.productId),
          sourceType: p.sourceType,
          vehicleId: p.vehicleId ? String(p.vehicleId) : "",
          qty: String(p.qty),
          unitCost: formatErpInputNumber(p.unitCost),
          note: p.note || "",
        }))
      );
      setShowMaintModal(true);
    },
    [today]
  );

  const handleSelectMaintAsset = useCallback(
    (newAssetId: string) => {
      setMaintFormAssetId(newAssetId);
      const found = assets.find((a) => String(a.id) === newAssetId);
      if (found) setMaintFormHours(String(found.operatingHours || 0));
    },
    [assets]
  );

  const addMaintPartRow = useCallback(() => {
    const defaultSource: PartStockSource = maintFormVehicleId ? "VEHICLE" : "YARD";
    setMaintFormParts((prev) => [
      ...prev,
      {
        key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: "",
        sourceType: defaultSource,
        vehicleId: defaultSource === "VEHICLE" ? maintFormVehicleId : "",
        qty: "1",
        unitCost: "0",
        note: "",
      },
    ]);
  }, [maintFormVehicleId]);

  const updateMaintPartRow = useCallback(
    (key: string, patch: Partial<PartDraftLine>) => {
      setMaintFormParts((prev) =>
        prev.map((row) => {
          if (row.key !== key) return row;
          const next = { ...row, ...patch };
          if (patch.productId !== undefined) {
            const p = partsCatalog.find((item) => String(item.id) === patch.productId);
            if (p) next.unitCost = formatErpInputNumber(p.standardCost || 0);
          }
          if (patch.sourceType === "YARD") {
            next.vehicleId = "";
          } else if (patch.sourceType === "VEHICLE" && !next.vehicleId) {
            next.vehicleId = maintFormVehicleId || (vehicles[0] ? String(vehicles[0].id) : "");
          }
          return next;
        })
      );
    },
    [maintFormVehicleId, partsCatalog, vehicles]
  );

  const maintPartsTotalCost = useMemo(
    () =>
      maintFormParts.reduce(
        (sum, line) => sum + Math.round((Number(sanitizeDecimalText(line.qty)) || 0) * cleanErpNumber(line.unitCost)),
        0
      ),
    [maintFormParts]
  );

  const maintGrandTotalCost = useMemo(
    () => maintPartsTotalCost + cleanErpNumber(maintFormLaborCost) + cleanErpNumber(maintFormTravelCost),
    [maintFormLaborCost, maintFormTravelCost, maintPartsTotalCost]
  );

  // Save Maintenance Create/Update
  const handleSaveMaintenance = async () => {
    if (!maintFormAssetId) return setErrorMsg("정비 대상 렌탈자산을 선택하세요.");
    if (!maintFormTitle.trim()) return setErrorMsg("정비 제목(작업명)을 입력하세요.");

    const payload = {
      ...(editingMaintId ? { id: editingMaintId } : {}),
      assetId: Number(maintFormAssetId),
      maintenanceDate: maintFormDate,
      maintenanceType: maintFormType,
      resultStatus: maintFormResult,
      operatingHours: Number(sanitizeDecimalText(maintFormHours)) || 0,
      technicianEmployeeId: maintFormTechId ? Number(maintFormTechId) : null,
      technicianName: maintFormTechName.trim() || actorName,
      vehicleId: maintFormVehicleId ? Number(maintFormVehicleId) : null,
      title: maintFormTitle.trim(),
      symptom: maintFormSymptom.trim() || null,
      workPerformed: maintFormWork.trim() || null,
      checklist: maintFormChecklist,
      resetComponentCodes: maintFormResetCodes,
      partsUsed: maintFormParts.map((p) => ({
        productId: Number(p.productId),
        qty: Number(sanitizeDecimalText(p.qty)),
        sourceType: p.sourceType,
        vehicleId: p.sourceType === "VEHICLE" && p.vehicleId ? Number(p.vehicleId) : null,
        unitCost: cleanErpNumber(p.unitCost),
        note: p.note.trim() || null,
      })),
      laborCost: cleanErpNumber(maintFormLaborCost),
      travelCost: cleanErpNumber(maintFormTravelCost),
      nextPmDueDate: maintFormNextPm || null,
      assetStatusAfter: maintFormStatusAfter === "KEEP" ? null : maintFormStatusAfter,
      createdBy: actorName,
      updatedBy: actorName,
    };

    const data = await submitMaintenanceApi<{ maintenanceNo: string }>(
      "/api/erp/rental/maintenance",
      editingMaintId ? "PUT" : "POST",
      payload,
      "정비이력 저장에 실패했습니다.",
      setSavingMaint
    );
    if (!data) return;

    setShowMaintModal(false);
    setNoticeMsg(
      editingMaintId
        ? `정비이력(${editingMaintNo})이 수정되었습니다.`
        : `정비이력(${data.maintenanceNo})이 등록되었습니다.`
    );
    await refreshAll();
  };

  // Record Operating Hours
  const handleRecordOperatingHours = async () => {
    if (!selectedWearAsset) return;
    const val = Number(sanitizeDecimalText(hourInputValue));
    if (!Number.isFinite(val) || val < 0) return setErrorMsg("유효한 가동시간을 입력하세요.");

    const data = await submitMaintenanceApi(
      "/api/erp/rental/operating-hours",
      "POST",
      {
        action: "RECORD_HOURS",
        assetId: selectedWearAsset.assetId,
        recordedHours: val,
        recordedDate: hourInputDate,
        recordedBy: actorName,
        note: hourInputNote.trim() || null,
      },
      "가동시간 기록 실패",
      setSavingHours
    );
    if (!data) return;

    setNoticeMsg(`${selectedWearAsset.serialNo} 가동시간이 ${formatErpNumber(val)}h 로 기록되었습니다.`);
    await Promise.all([loadOperatingHoursData(selectedWearAsset.assetId), loadMaintenanceData()]);
  };

  // Save Wear Intervals & Resets
  const handleSaveWearConfig = async () => {
    if (!selectedWearAsset) return;
    const data = await submitMaintenanceApi(
      "/api/erp/rental/operating-hours",
      "POST",
      {
        action: "SAVE_WEAR_CONFIG",
        assetId: selectedWearAsset.assetId,
        pmIntervalDays: cleanErpNumber(wearEditPmInterval) || DEFAULT_PM_INTERVAL_DAYS,
        components: wearEditItems.map((c) => ({
          componentCode: c.componentCode,
          componentName: c.componentName,
          intervalHours: Number(sanitizeDecimalText(c.intervalHours)) || 500,
          lastReplacedHours: Number(sanitizeDecimalText(c.lastReplacedHours)) || 0,
          lastReplacedDate: c.lastReplacedDate || null,
          memo: c.memo.trim() || null,
        })),
      },
      "소모품 교체주기 설정 저장 실패",
      setSavingHours
    );
    if (!data) return;

    setNoticeMsg(`${selectedWearAsset.serialNo} 열화·점검 주기 설정이 저장되었습니다.`);
    await Promise.all([loadOperatingHoursData(selectedWearAsset.assetId), loadMaintenanceData()]);
  };

  // Open Transfer Modal
  const openTransferModal = useCallback(
    (preset?: { type?: PartTransferType; fromVehicleId?: number; toVehicleId?: number; productId?: number }) => {
      const tType = preset?.type || "LOAD_TO_VEHICLE";
      setTransferType(tType);
      setTransferFromVehicleId(preset?.fromVehicleId ? String(preset.fromVehicleId) : "");
      setTransferToVehicleId(
        preset?.toVehicleId
          ? String(preset.toVehicleId)
          : selectedVehicleId && tType === "LOAD_TO_VEHICLE"
            ? String(selectedVehicleId)
            : ""
      );
      setTransferProductId(preset?.productId ? String(preset.productId) : "");
      setTransferQty("1");
      setTransferTargetQty("");
      setTransferDate(today);
      setTransferNote("");
      setShowTransferModal(true);
    },
    [selectedVehicleId, today]
  );

  const handleSaveTransfer = async () => {
    if (!transferProductId) return setErrorMsg("이동할 부품 품목을 선택하세요.");
    const qtyNum = Number(sanitizeDecimalText(transferQty));
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) return setErrorMsg("이동 수량을 0보다 크게 입력하세요.");

    const data = await submitMaintenanceApi(
      "/api/erp/rental/vehicle-stocks",
      "POST",
      {
        transferType,
        productId: Number(transferProductId),
        qty: qtyNum,
        fromVehicleId: transferFromVehicleId ? Number(transferFromVehicleId) : null,
        toVehicleId: transferToVehicleId ? Number(transferToVehicleId) : null,
        targetQty: transferTargetQty ? Number(sanitizeDecimalText(transferTargetQty)) : null,
        movementDate: transferDate,
        actorName,
        note: transferNote.trim() || null,
      },
      "부품 이동 처리 실패",
      setSavingTransfer
    );
    if (!data) return;

    setShowTransferModal(false);
    setNoticeMsg(`${PART_TRANSFER_TYPE_LABELS[transferType]} 처리가 완료되었습니다.`);
    await refreshAll();
  };

  // Vehicle Create/Edit
  const openVehicleModal = (veh?: ServiceVehicleRecord) => {
    setEditingVehicleId(veh ? veh.id : null);
    setVehNo(veh?.vehicleNo || "");
    setVehName(veh?.vehicleName || "");
    setVehDriverId(veh?.driverEmployeeId ? String(veh.driverEmployeeId) : "");
    setVehDriverName(veh?.driverName || "");
    setVehDriverPhone(veh?.driverPhone || "");
    setVehRegion(veh?.region || "");
    setVehStatus(veh?.status || "ACTIVE");
    setVehMemo(veh?.memo || "");
    setShowVehicleModal(true);
  };

  const handleSaveVehicle = async () => {
    if (!vehNo.trim() || !vehName.trim()) return setErrorMsg("차량번호와 차량명칭을 입력하세요.");

    const data = await submitMaintenanceApi<{ id: number; vehicleNo: string }>(
      "/api/erp/rental/vehicles",
      editingVehicleId ? "PUT" : "POST",
      {
        ...(editingVehicleId ? { id: editingVehicleId } : {}),
        vehicleNo: vehNo.trim(),
        vehicleName: vehName.trim(),
        driverEmployeeId: vehDriverId ? Number(vehDriverId) : null,
        driverName: vehDriverName.trim() || null,
        driverPhone: vehDriverPhone.trim() || null,
        region: vehRegion.trim() || null,
        status: vehStatus,
        memo: vehMemo.trim() || null,
      },
      "정비차량 저장 실패",
      setSavingVehicle
    );
    if (!data) return;

    setShowVehicleModal(false);
    setSelectedVehicleId(data.id);
    setNoticeMsg(`정비차량 ${data.vehicleNo} 정보가 저장되었습니다.`);
    await loadMaintenanceData();
  };

  // Quick Create Part SKU
  const handleSaveQuickPart = async () => {
    if (!qpName.trim()) return setErrorMsg("부품 품목명을 입력하세요.");

    const data = await submitMaintenanceApi<{ name: string }>(
      "/api/erp/rental/vehicles",
      "POST",
      {
        action: "QUICK_CREATE_PART",
        name: qpName.trim(),
        skuCode: qpSkuCode.trim() || null,
        partNo: qpPartNo.trim() || null,
        category: qpCategory.trim() || "소모품·필터",
        unit: qpUnit.trim() || "EA",
        standardCost: cleanErpNumber(qpCost),
        standardPrice: cleanErpNumber(qpPrice),
        safetyStock: Number(sanitizeDecimalText(qpSafetyStock)) || 0,
        currentStock: Number(sanitizeDecimalText(qpInitialStock)) || 0,
      },
      "부품 품목 등록 실패",
      setSavingQuickPart
    );
    if (!data) return;

    setShowQuickPartModal(false);
    setQpName("");
    setQpSkuCode("");
    setQpPartNo("");
    setQpCost("0");
    setQpPrice("0");
    setQpInitialStock("0");
    setNoticeMsg(`부품 품목 [${data.name}]이 등록되었습니다.`);
    await refreshAll();
  };

  // Yard Receipt
  const handleSaveYardReceipt = async () => {
    const qtyNum = Number(sanitizeDecimalText(yrQty));
    if (!yrProductId || !Number.isFinite(qtyNum) || qtyNum <= 0) {
      return setErrorMsg("입고 부품 품목과 수량(0 초과)을 입력하세요.");
    }

    const data = await submitMaintenanceApi(
      "/api/erp/rental/vehicle-stocks",
      "POST",
      {
        action: "YARD_STOCK_RECEIPT",
        productId: Number(yrProductId),
        qty: qtyNum,
        movementDate: yrDate,
        actorName,
        note: yrNote.trim() || null,
      },
      "주기장 입고 처리 실패",
      setSavingYardReceipt
    );
    if (!data) return;

    setShowYardReceiptModal(false);
    setYrProductId("");
    setYrQty("1");
    setYrNote("");
    setNoticeMsg("주기장 부품 재고 입고가 반영되었습니다.");
    await refreshAll();
  };

  const transferSourcePartOptions = useMemo(
    () => (transferType === "LOAD_TO_VEHICLE" ? buildPartComboOptions("YARD") : buildPartComboOptions("VEHICLE", transferFromVehicleId)),
    [buildPartComboOptions, transferFromVehicleId, transferType]
  );

  const wearSort = useErpTableSort("", null);
  const hourLogSort = useErpTableSort("", null);
  const vehicleSort = useErpTableSort("", null);
  const vehStockSort = useErpTableSort("", null);
  const fleetStockSort = useErpTableSort("", null);
  const movementSort = useErpTableSort("", null);

  const sortedWearAssets = useMemo(() => sortErpItems(wearAssets, wearSort.sortKey, wearSort.sortDir), [wearAssets, wearSort.sortKey, wearSort.sortDir]);
  const sortedHourLogs = useMemo(() => sortErpItems(hourLogs, hourLogSort.sortKey, hourLogSort.sortDir), [hourLogs, hourLogSort.sortKey, hourLogSort.sortDir]);
  const sortedVehicles = useMemo(
    () =>
      sortErpItems(vehicles, vehicleSort.sortKey, vehicleSort.sortDir, (v, k) =>
        k === "qtySum" ? (v.stocks || []).reduce((sum, st) => sum + Number(st.currentQty || 0), 0) : undefined
      ),
    [vehicles, vehicleSort.sortKey, vehicleSort.sortDir]
  );
  const sortedSelectedVehicleStocks = useMemo(
    () => sortErpItems(selectedVehicle?.stocks || [], vehStockSort.sortKey, vehStockSort.sortDir),
    [selectedVehicle, vehStockSort.sortKey, vehStockSort.sortDir]
  );
  const sortedFleetStockSummary = useMemo(
    () => sortErpItems(fleetStockSummary, fleetStockSort.sortKey, fleetStockSort.sortDir),
    [fleetStockSummary, fleetStockSort.sortKey, fleetStockSort.sortDir]
  );
  const sortedMovements = useMemo(() => sortErpItems(movements, movementSort.sortKey, movementSort.sortDir), [movements, movementSort.sortKey, movementSort.sortDir]);

  const fleetStockTotals = useMemo(
    () =>
      fleetStockSummary.reduce(
        (acc, r) => ({ yard: acc.yard + r.yardQty, vehicle: acc.vehicle + r.vehicleQtySum, total: acc.total + r.totalFleetQty }),
        { yard: 0, vehicle: 0, total: 0 }
      ),
    [fleetStockSummary]
  );

  const criticalWearCount = useMemo(() => wearAssets.filter((a) => a.wearSummary.overallSeverity === "CRITICAL").length, [wearAssets]);
  const warningWearCount = useMemo(() => wearAssets.filter((a) => a.wearSummary.overallSeverity === "WARNING").length, [wearAssets]);

  const subTabs: Array<{ key: SubTabKey; label: string; badge?: number; alert?: boolean }> = [
    { key: "ACTIVITIES", label: "정비활동 관리", badge: summary.totalMaintenances },
    { key: "PREVENTIVE_PM", label: "정기 사전점검", badge: summary.pmOverdueCount + summary.pmDueSoonCount, alert: summary.pmOverdueCount > 0 },
    { key: "HOURS_WEAR", label: "가동시간·부품열화", badge: criticalWearCount + warningWearCount, alert: criticalWearCount > 0 },
    { key: "VEHICLE_STOCK", label: "정비차량 부품재고", badge: vehicles.filter((v) => v.status === "ACTIVE").length },
  ];

  return (
    <div className="h-full flex flex-col gap-3 text-slate-900 dark:text-slate-100">
      {/* Top Bar: Title + SubTabs (Top-Left) + Primary Actions (Top-Right) */}
      <div className="bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 pr-3 border-r border-[#b5a894] dark:border-slate-700">
            <Wrench className="w-5 h-5 text-slate-800 dark:text-amber-400 shrink-0" />
            <h2 className="text-base font-bold tracking-tight whitespace-nowrap">렌탈 정비·부품관리</h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {subTabs.map((tab) => {
              const isActive = activeSubTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveSubTab(tab.key)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold border transition whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? "bg-slate-900 text-[#f4efe4] border-slate-900 dark:bg-amber-600 dark:text-slate-950 dark:border-amber-600"
                      : "bg-[#ebe5d8] text-slate-800 border-[#b5a894] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.badge === "number" && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        tab.alert
                          ? "bg-rose-600 text-[#fdfbf7]"
                          : isActive
                            ? "bg-slate-700 text-[#f4efe4] dark:bg-slate-900 dark:text-amber-300"
                            : "bg-[#dcd4c4] text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Primary Pipeline Actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => openCreateMaintenanceModal()}
            className="px-3 py-1.5 rounded text-xs font-bold bg-slate-900 text-[#f4efe4] hover:bg-slate-800 dark:bg-amber-600 dark:text-slate-950 dark:hover:bg-amber-500 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>정비활동 등록</span>
          </button>
          <button
            type="button"
            onClick={() => openTransferModal({ type: "LOAD_TO_VEHICLE" })}
            className="px-3 py-1.5 rounded text-xs font-semibold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
            <span>부품 이동</span>
          </button>
          <button
            type="button"
            onClick={() => setShowQuickPartModal(true)}
            className="px-3 py-1.5 rounded text-xs font-semibold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span>부품 SKU 등록</span>
          </button>
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={loading}
            className="px-2.5 py-1.5 rounded text-xs font-semibold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${loading ? "animate-spin" : ""}`} />
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 px-3 py-2 rounded text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="p-0.5 hover:opacity-75"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {noticeMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-3 py-2 rounded text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{noticeMsg}</span>
          </div>
          <button type="button" onClick={() => setNoticeMsg(null)} className="p-0.5 hover:opacity-75"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* SUB-TAB 1 & 2: 정비활동 관리 / 정기 사전점검 */}
      <MaintenanceActivitiesAndPmSubTabs
        activeSubTab={activeSubTab} maintenances={maintenances} pmSchedules={pmSchedules} summary={summary} today={today}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery} typeFilter={typeFilter} setTypeFilter={setTypeFilter}
        resultFilter={resultFilter} setResultFilter={setResultFilter} pmStatusFilter={pmStatusFilter} setPmStatusFilter={setPmStatusFilter}
        startDateFilter={startDateFilter} setStartDateFilter={setStartDateFilter} endDateFilter={endDateFilter} setEndDateFilter={setEndDateFilter}
        openCreateMaintenanceModal={openCreateMaintenanceModal} openEditMaintenanceModal={openEditMaintenanceModal}
      />

      {/* SUB-TAB 3: 가동시간·부품열화 */}
      <HoursWearSubTab
        activeSubTab={activeSubTab} criticalWearCount={criticalWearCount} handleRecordOperatingHours={handleRecordOperatingHours}
        handleSaveWearConfig={handleSaveWearConfig} hourInputDate={hourInputDate} hourInputNote={hourInputNote}
        hourInputValue={hourInputValue} hourLogSort={hourLogSort} openCreateMaintenanceModal={openCreateMaintenanceModal}
        savingHours={savingHours} searchQuery={searchQuery} selectedWearAsset={selectedWearAsset}
        selectedWearAssetId={selectedWearAssetId} setHourInputDate={setHourInputDate} setHourInputNote={setHourInputNote}
        setHourInputValue={setHourInputValue} setSearchQuery={setSearchQuery} setSelectedWearAssetId={setSelectedWearAssetId}
        setWearEditItems={setWearEditItems} setWearEditPmInterval={setWearEditPmInterval} setWearSeverityFilter={setWearSeverityFilter}
        sortedHourLogs={sortedHourLogs} sortedWearAssets={sortedWearAssets} warningWearCount={warningWearCount}
        wearEditItems={wearEditItems} wearEditPmInterval={wearEditPmInterval} wearSeverityFilter={wearSeverityFilter} wearSort={wearSort}
      />

      {/* SUB-TAB 4: 정비차량 부품재고 */}
      <VehicleStockSubTab
        activeSubTab={activeSubTab} fleetStockSort={fleetStockSort} fleetStockTotals={fleetStockTotals} movementSort={movementSort}
        movementTypeFilter={movementTypeFilter} openTransferModal={openTransferModal} openVehicleModal={openVehicleModal}
        selectedVehicle={selectedVehicle} selectedVehicleId={selectedVehicleId} setMovementTypeFilter={setMovementTypeFilter}
        setSelectedVehicleId={setSelectedVehicleId} setShowYardReceiptModal={setShowYardReceiptModal}
        sortedFleetStockSummary={sortedFleetStockSummary} sortedMovements={sortedMovements}
        sortedSelectedVehicleStocks={sortedSelectedVehicleStocks} sortedVehicles={sortedVehicles}
        vehStockSort={vehStockSort} vehicleSort={vehicleSort}
      />

      {showMaintModal && (
        <MaintModal
          addMaintPartRow={addMaintPartRow} assetComboOptions={assetComboOptions} buildPartComboOptions={buildPartComboOptions}
          editingMaintId={editingMaintId} editingMaintNo={editingMaintNo} employeeComboOptions={employeeComboOptions}
          employees={employees} handleSaveMaintenance={handleSaveMaintenance} handleSelectMaintAsset={handleSelectMaintAsset}
          maintFormAssetId={maintFormAssetId} maintFormChecklist={maintFormChecklist} maintFormDate={maintFormDate}
          maintFormHours={maintFormHours} maintFormLaborCost={maintFormLaborCost} maintFormNextPm={maintFormNextPm}
          maintFormParts={maintFormParts} maintFormResetCodes={maintFormResetCodes} maintFormResult={maintFormResult}
          maintFormStatusAfter={maintFormStatusAfter} maintFormSymptom={maintFormSymptom} maintFormTechId={maintFormTechId}
          maintFormTechName={maintFormTechName} maintFormTitle={maintFormTitle} maintFormTravelCost={maintFormTravelCost}
          maintFormType={maintFormType} maintFormVehicleId={maintFormVehicleId} maintFormWork={maintFormWork}
          maintGrandTotalCost={maintGrandTotalCost} maintPartsTotalCost={maintPartsTotalCost} savingMaint={savingMaint}
          setMaintFormChecklist={setMaintFormChecklist} setMaintFormDate={setMaintFormDate} setMaintFormHours={setMaintFormHours}
          setMaintFormLaborCost={setMaintFormLaborCost} setMaintFormNextPm={setMaintFormNextPm} setMaintFormParts={setMaintFormParts}
          setMaintFormResetCodes={setMaintFormResetCodes} setMaintFormResult={setMaintFormResult} setMaintFormStatusAfter={setMaintFormStatusAfter}
          setMaintFormSymptom={setMaintFormSymptom} setMaintFormTechId={setMaintFormTechId} setMaintFormTechName={setMaintFormTechName}
          setMaintFormTitle={setMaintFormTitle} setMaintFormTravelCost={setMaintFormTravelCost} setMaintFormType={setMaintFormType}
          setMaintFormVehicleId={setMaintFormVehicleId} setMaintFormWork={setMaintFormWork} setShowMaintModal={setShowMaintModal}
          setShowQuickPartModal={setShowQuickPartModal} showMaintModal={showMaintModal} updateMaintPartRow={updateMaintPartRow}
          vehicleComboOptions={vehicleComboOptions} vehicles={vehicles}
        />
      )}

      {showTransferModal && (
        <TransferModal
          handleSaveTransfer={handleSaveTransfer} savingTransfer={savingTransfer} setShowTransferModal={setShowTransferModal}
          setTransferDate={setTransferDate} setTransferFromVehicleId={setTransferFromVehicleId} setTransferNote={setTransferNote}
          setTransferProductId={setTransferProductId} setTransferQty={setTransferQty} setTransferTargetQty={setTransferTargetQty}
          setTransferToVehicleId={setTransferToVehicleId} setTransferType={setTransferType} showTransferModal={showTransferModal}
          transferDate={transferDate} transferFromVehicleId={transferFromVehicleId} transferNote={transferNote}
          transferProductId={transferProductId} transferQty={transferQty} transferSourcePartOptions={transferSourcePartOptions}
          transferTargetQty={transferTargetQty} transferToVehicleId={transferToVehicleId} transferType={transferType}
          vehicleComboOptions={vehicleComboOptions}
        />
      )}

      {showVehicleModal && (
        <VehicleModal
          editingVehicleId={editingVehicleId} employeeComboOptions={employeeComboOptions} employees={employees}
          handleSaveVehicle={handleSaveVehicle} savingVehicle={savingVehicle} setShowVehicleModal={setShowVehicleModal}
          setVehDriverId={setVehDriverId} setVehDriverName={setVehDriverName} setVehDriverPhone={setVehDriverPhone}
          setVehMemo={setVehMemo} setVehName={setVehName} setVehNo={setVehNo} setVehRegion={setVehRegion}
          setVehStatus={setVehStatus} showVehicleModal={showVehicleModal} vehDriverId={vehDriverId}
          vehDriverName={vehDriverName} vehDriverPhone={vehDriverPhone} vehMemo={vehMemo} vehName={vehName}
          vehNo={vehNo} vehRegion={vehRegion} vehStatus={vehStatus}
        />
      )}

      {showQuickPartModal && (
        <QuickPartModal
          handleSaveQuickPart={handleSaveQuickPart} qpCategory={qpCategory} qpCost={qpCost} qpInitialStock={qpInitialStock}
          qpName={qpName} qpPartNo={qpPartNo} qpPrice={qpPrice} qpSafetyStock={qpSafetyStock} qpSkuCode={qpSkuCode}
          qpUnit={qpUnit} savingQuickPart={savingQuickPart} setQpCategory={setQpCategory} setQpCost={setQpCost}
          setQpInitialStock={setQpInitialStock} setQpName={setQpName} setQpPartNo={setQpPartNo} setQpPrice={setQpPrice}
          setQpSafetyStock={setQpSafetyStock} setQpSkuCode={setQpSkuCode} setQpUnit={setQpUnit}
          setShowQuickPartModal={setShowQuickPartModal} showQuickPartModal={showQuickPartModal}
        />
      )}

      {showYardReceiptModal && (
        <YardReceiptModal
          buildPartComboOptions={buildPartComboOptions} handleSaveYardReceipt={handleSaveYardReceipt}
          savingYardReceipt={savingYardReceipt} setShowYardReceiptModal={setShowYardReceiptModal} setYrDate={setYrDate}
          setYrNote={setYrNote} setYrProductId={setYrProductId} setYrQty={setYrQty}
          showYardReceiptModal={showYardReceiptModal} yrDate={yrDate} yrNote={yrNote} yrProductId={yrProductId} yrQty={yrQty}
        />
      )}
    </div>
  );
}
