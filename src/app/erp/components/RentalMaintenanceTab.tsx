"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Edit3,
  Gauge,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  Wrench,
  X,
  ArrowRightLeft,
} from "lucide-react";
import SearchSelectCombobox, { type SearchSelectOption } from "./SearchSelectCombobox";
import { SortableTh, useErpTableSort } from "./SortableTh";
import { cleanErpNumber, formatErpInputNumber, formatErpNumber, sortErpItems } from "@/lib/erpFormat";
import { getKstTodayIso } from "@/lib/forkliftDomain";
import {
  DEFAULT_PM_INTERVAL_DAYS,
  DEFAULT_WEAR_COMPONENTS,
  MAINTENANCE_RESULT_LABELS,
  MAINTENANCE_TYPE_LABELS,
  PART_TRANSFER_TYPE_LABELS,
  PM_DUE_STATUS_LABELS,
  WEAR_SEVERITY_LABELS,
  createDefaultPmChecklist,
  type AssetWearComputedItem,
  type AssetWearSummary,
  type MaintenancePartLineRecord,
  type MaintenanceResultStatus,
  type MaintenanceType,
  type PartStockSource,
  type PartTransferType,
  type PmChecklistItem,
  type PmChecklistStatus,
  type PmDueStatus,
  type WearSeverityStatus,
} from "@/lib/rentalMaintenanceDomain";
import { HoursWearSubTab, VehicleStockSubTab } from "./rental-maintenance/HoursWearAndVehicleStockTabs";
import { MaintModal, TransferModal, VehicleModal, QuickPartModal, YardReceiptModal } from "./rental-maintenance/RentalMaintenanceModals";

import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_BADGE,
  PM_BADGE,
  WEAR_BADGE,
  MOVEMENT_TYPE_LABELS,
  sanitizeDecimalText,
  type SubTabKey,
  type CurrentUserInfo,
  type MaintenanceAssetOption,
  type EmployeeOption,
  type VehicleStockItem,
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
    Array<{
      componentCode: string;
      componentName: string;
      intervalHours: string;
      lastReplacedHours: string;
      lastReplacedDate: string;
      memo: string;
    }>
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
  const [maintFormChecklist, setMaintFormChecklist] = useState<PmChecklistItem[]>(
    createDefaultPmChecklist()
  );
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
  }, [
    endDateFilter,
    pmStatusFilter,
    resultFilter,
    searchQuery,
    selectedVehicleId,
    startDateFilter,
    typeFilter,
  ]);

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
    if (activeSubTab === "HOURS_WEAR") {
      void loadOperatingHoursData();
    } else if (activeSubTab === "VEHICLE_STOCK") {
      void loadVehicleStocksData();
    }
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
        searchKeywords: [
          a.serialNo,
          a.modelName || "",
          a.currentCustomer || "",
          a.currentSite || "",
          a.contractNo || "",
        ],
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
          badgeColor:
            availQty > 0
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-600",
          searchKeywords: [
            p.name,
            p.skuCode,
            p.partNo || "",
            p.category || "",
            p.manufacturer || "",
          ],
        };
      });
    },
    [partsCatalog, vehicles]
  );

  // Modal Open Helpers
  const openCreateMaintenanceModal = useCallback(
    (preset?: {
      assetId?: number;
      maintenanceType?: MaintenanceType;
      title?: string;
      resetCodes?: string[];
    }) => {
      const targetAsset = preset?.assetId ? assets.find((a) => a.id === preset.assetId) : null;
      const mType = preset?.maintenanceType || "PREVENTIVE";
      setEditingMaintId(null);
      setEditingMaintNo("");
      setMaintFormAssetId(targetAsset ? String(targetAsset.id) : "");
      setMaintFormDate(today);
      setMaintFormType(mType);
      setMaintFormResult("COMPLETED");
      setMaintFormHours(targetAsset ? String(targetAsset.operatingHours || 0) : "0");
      setMaintFormTechId("");
      setMaintFormTechName(actorName);
      setMaintFormVehicleId(vehicles.find((v) => v.status === "ACTIVE") ? String(vehicles.find((v) => v.status === "ACTIVE")!.id) : "");
      setMaintFormStatusAfter("KEEP");
      setMaintFormTitle(
        preset?.title ||
          (mType === "PREVENTIVE"
            ? `${today.slice(0, 7)} 월간 정기 사전점검`
            : "")
      );
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

  const openEditMaintenanceModal = useCallback((rec: MaintenanceRecord) => {
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
    setMaintFormChecklist(
      rec.checklist.length > 0 ? rec.checklist : createDefaultPmChecklist()
    );
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
  }, [today]);

  const handleSelectMaintAsset = useCallback(
    (newAssetId: string) => {
      setMaintFormAssetId(newAssetId);
      const found = assets.find((a) => String(a.id) === newAssetId);
      if (found) {
        setMaintFormHours(String(found.operatingHours || 0));
      }
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
            if (p) {
              next.unitCost = formatErpInputNumber(p.standardCost || 0);
            }
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

  const maintPartsTotalCost = useMemo(() => {
    return maintFormParts.reduce((sum, line) => {
      const q = Number(sanitizeDecimalText(line.qty)) || 0;
      const c = cleanErpNumber(line.unitCost);
      return sum + Math.round(q * c);
    }, 0);
  }, [maintFormParts]);

  const maintGrandTotalCost = useMemo(() => {
    return (
      maintPartsTotalCost +
      cleanErpNumber(maintFormLaborCost) +
      cleanErpNumber(maintFormTravelCost)
    );
  }, [maintFormLaborCost, maintFormTravelCost, maintPartsTotalCost]);

  // Save Maintenance Create/Update
  const handleSaveMaintenance = async () => {
    setErrorMsg(null);
    if (!maintFormAssetId) {
      setErrorMsg("정비 대상 렌탈자산을 선택하세요.");
      return;
    }
    if (!maintFormTitle.trim()) {
      setErrorMsg("정비 제목(작업명)을 입력하세요.");
      return;
    }

    const partsPayload = maintFormParts.map((p) => ({
      productId: Number(p.productId),
      qty: Number(sanitizeDecimalText(p.qty)),
      sourceType: p.sourceType,
      vehicleId: p.sourceType === "VEHICLE" && p.vehicleId ? Number(p.vehicleId) : null,
      unitCost: cleanErpNumber(p.unitCost),
      note: p.note.trim() || null,
    }));

    setSavingMaint(true);
    try {
      const endpoint = "/api/erp/rental/maintenance";
      const method = editingMaintId ? "PUT" : "POST";
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
        partsUsed: partsPayload,
        laborCost: cleanErpNumber(maintFormLaborCost),
        travelCost: cleanErpNumber(maintFormTravelCost),
        nextPmDueDate: maintFormNextPm || null,
        assetStatusAfter: maintFormStatusAfter === "KEEP" ? null : maintFormStatusAfter,
        createdBy: actorName,
        updatedBy: actorName,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "정비이력 저장에 실패했습니다.");
      }

      setShowMaintModal(false);
      setNoticeMsg(
        editingMaintId
          ? `정비이력(${editingMaintNo})이 수정되었습니다.`
          : `정비이력(${json.data.maintenanceNo})이 등록되었습니다.`
      );
      await refreshAll();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "정비 저장 오류");
    } finally {
      setSavingMaint(false);
    }
  };

  // Record Operating Hours
  const handleRecordOperatingHours = async () => {
    if (!selectedWearAsset) return;
    const val = Number(sanitizeDecimalText(hourInputValue));
    if (!Number.isFinite(val) || val < 0) {
      setErrorMsg("유효한 가동시간을 입력하세요.");
      return;
    }
    setSavingHours(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/erp/rental/operating-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_HOURS",
          assetId: selectedWearAsset.assetId,
          recordedHours: val,
          recordedDate: hourInputDate,
          recordedBy: actorName,
          note: hourInputNote.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "가동시간 기록 실패");
      }
      setNoticeMsg(
        `${selectedWearAsset.serialNo} 가동시간이 ${formatErpNumber(val)}h 로 기록되었습니다.`
      );
      await Promise.all([loadOperatingHoursData(selectedWearAsset.assetId), loadMaintenanceData()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "가동시간 기록 오류");
    } finally {
      setSavingHours(false);
    }
  };

  // Save Wear Intervals & Resets
  const handleSaveWearConfig = async () => {
    if (!selectedWearAsset) return;
    setSavingHours(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/erp/rental/operating-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "소모품 교체주기 설정 저장 실패");
      }
      setNoticeMsg(`${selectedWearAsset.serialNo} 열화·점검 주기 설정이 저장되었습니다.`);
      await Promise.all([loadOperatingHoursData(selectedWearAsset.assetId), loadMaintenanceData()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "열화 설정 저장 오류");
    } finally {
      setSavingHours(false);
    }
  };

  // Open Transfer Modal
  const openTransferModal = useCallback(
    (preset?: {
      type?: PartTransferType;
      fromVehicleId?: number;
      toVehicleId?: number;
      productId?: number;
    }) => {
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
    setErrorMsg(null);
    if (!transferProductId) {
      setErrorMsg("이동할 부품 품목을 선택하세요.");
      return;
    }
    const qtyNum = Number(sanitizeDecimalText(transferQty));
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setErrorMsg("이동 수량을 0보다 크게 입력하세요.");
      return;
    }
    setSavingTransfer(true);
    try {
      const res = await fetch("/api/erp/rental/vehicle-stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transferType,
          productId: Number(transferProductId),
          qty: qtyNum,
          fromVehicleId: transferFromVehicleId ? Number(transferFromVehicleId) : null,
          toVehicleId: transferToVehicleId ? Number(transferToVehicleId) : null,
          targetQty: transferTargetQty ? Number(sanitizeDecimalText(transferTargetQty)) : null,
          movementDate: transferDate,
          actorName,
          note: transferNote.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "부품 이동 처리 실패");
      }
      setShowTransferModal(false);
      setNoticeMsg(`${PART_TRANSFER_TYPE_LABELS[transferType]} 처리가 완료되었습니다.`);
      await refreshAll();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "부품 이동 오류");
    } finally {
      setSavingTransfer(false);
    }
  };

  // Vehicle Create/Edit
  const openVehicleModal = (veh?: ServiceVehicleRecord) => {
    if (veh) {
      setEditingVehicleId(veh.id);
      setVehNo(veh.vehicleNo);
      setVehName(veh.vehicleName);
      setVehDriverId(veh.driverEmployeeId ? String(veh.driverEmployeeId) : "");
      setVehDriverName(veh.driverName || "");
      setVehDriverPhone(veh.driverPhone || "");
      setVehRegion(veh.region || "");
      setVehStatus(veh.status);
      setVehMemo(veh.memo || "");
    } else {
      setEditingVehicleId(null);
      setVehNo("");
      setVehName("");
      setVehDriverId("");
      setVehDriverName("");
      setVehDriverPhone("");
      setVehRegion("");
      setVehStatus("ACTIVE");
      setVehMemo("");
    }
    setShowVehicleModal(true);
  };

  const handleSaveVehicle = async () => {
    if (!vehNo.trim() || !vehName.trim()) {
      setErrorMsg("차량번호와 차량명칭을 입력하세요.");
      return;
    }
    setSavingVehicle(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/erp/rental/vehicles", {
        method: editingVehicleId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingVehicleId ? { id: editingVehicleId } : {}),
          vehicleNo: vehNo.trim(),
          vehicleName: vehName.trim(),
          driverEmployeeId: vehDriverId ? Number(vehDriverId) : null,
          driverName: vehDriverName.trim() || null,
          driverPhone: vehDriverPhone.trim() || null,
          region: vehRegion.trim() || null,
          status: vehStatus,
          memo: vehMemo.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "정비차량 저장 실패");
      }
      setShowVehicleModal(false);
      setSelectedVehicleId(json.data.id);
      setNoticeMsg(`정비차량 ${json.data.vehicleNo} 정보가 저장되었습니다.`);
      await loadMaintenanceData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "차량 저장 오류");
    } finally {
      setSavingVehicle(false);
    }
  };

  // Quick Create Part SKU
  const handleSaveQuickPart = async () => {
    if (!qpName.trim()) {
      setErrorMsg("부품 품목명을 입력하세요.");
      return;
    }
    setSavingQuickPart(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/erp/rental/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "부품 품목 등록 실패");
      }
      setShowQuickPartModal(false);
      setQpName("");
      setQpSkuCode("");
      setQpPartNo("");
      setQpCost("0");
      setQpPrice("0");
      setQpInitialStock("0");
      setNoticeMsg(`부품 품목 [${json.data.name}]이 등록되었습니다.`);
      await refreshAll();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "부품 등록 오류");
    } finally {
      setSavingQuickPart(false);
    }
  };

  // Yard Receipt
  const handleSaveYardReceipt = async () => {
    const qtyNum = Number(sanitizeDecimalText(yrQty));
    if (!yrProductId || !Number.isFinite(qtyNum) || qtyNum <= 0) {
      setErrorMsg("입고 부품 품목과 수량(0 초과)을 입력하세요.");
      return;
    }
    setSavingYardReceipt(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/erp/rental/vehicle-stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "YARD_STOCK_RECEIPT",
          productId: Number(yrProductId),
          qty: qtyNum,
          movementDate: yrDate,
          actorName,
          note: yrNote.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "주기장 입고 처리 실패");
      }
      setShowYardReceiptModal(false);
      setYrProductId("");
      setYrQty("1");
      setYrNote("");
      setNoticeMsg("주기장 부품 재고 입고가 반영되었습니다.");
      await refreshAll();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "주기장 입고 오류");
    } finally {
      setSavingYardReceipt(false);
    }
  };

  const transferSourcePartOptions = useMemo(() => {
    if (transferType === "LOAD_TO_VEHICLE") {
      return buildPartComboOptions("YARD");
    }
    return buildPartComboOptions("VEHICLE", transferFromVehicleId);
  }, [buildPartComboOptions, transferFromVehicleId, transferType]);

  const maintSort = useErpTableSort("", null);
  const pmSort = useErpTableSort("", null);
  const wearSort = useErpTableSort("", null);
  const hourLogSort = useErpTableSort("", null);
  const vehicleSort = useErpTableSort("", null);
  const vehStockSort = useErpTableSort("", null);
  const fleetStockSort = useErpTableSort("", null);
  const movementSort = useErpTableSort("", null);

  const sortedMaintenances = useMemo(
    () =>
      sortErpItems(
        maintenances,
        maintSort.sortKey,
        maintSort.sortDir,
        (m, k) => (k === "parts" ? m.parts?.length || 0 : undefined)
      ),
    [maintenances, maintSort.sortKey, maintSort.sortDir]
  );

  const sortedPmSchedules = useMemo(
    () => sortErpItems(pmSchedules, pmSort.sortKey, pmSort.sortDir),
    [pmSchedules, pmSort.sortKey, pmSort.sortDir]
  );

  const sortedWearAssets = useMemo(
    () => sortErpItems(wearAssets, wearSort.sortKey, wearSort.sortDir),
    [wearAssets, wearSort.sortKey, wearSort.sortDir]
  );

  const sortedHourLogs = useMemo(
    () => sortErpItems(hourLogs, hourLogSort.sortKey, hourLogSort.sortDir),
    [hourLogs, hourLogSort.sortKey, hourLogSort.sortDir]
  );

  const sortedVehicles = useMemo(
    () =>
      sortErpItems(
        vehicles,
        vehicleSort.sortKey,
        vehicleSort.sortDir,
        (v, k) =>
          k === "qtySum"
            ? (v.stocks || []).reduce((sum, st) => sum + Number(st.currentQty || 0), 0)
            : undefined
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

  const sortedMovements = useMemo(
    () => sortErpItems(movements, movementSort.sortKey, movementSort.sortDir),
    [movements, movementSort.sortKey, movementSort.sortDir]
  );

  const fleetStockTotals = useMemo(() => {
    return fleetStockSummary.reduce(
      (acc, r) => {
        acc.yard += r.yardQty;
        acc.vehicle += r.vehicleQtySum;
        acc.total += r.totalFleetQty;
        return acc;
      },
      { yard: 0, vehicle: 0, total: 0 }
    );
  }, [fleetStockSummary]);

  const criticalWearCount = useMemo(
    () => wearAssets.filter((a) => a.wearSummary.overallSeverity === "CRITICAL").length,
    [wearAssets]
  );
  const warningWearCount = useMemo(
    () => wearAssets.filter((a) => a.wearSummary.overallSeverity === "WARNING").length,
    [wearAssets]
  );

  return (
    <div className="h-full flex flex-col gap-3 text-slate-900 dark:text-slate-100">
      {/* Top Bar: Title + SubTabs (Top-Left) + Primary Actions (Top-Right) */}
      <div className="bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 pr-3 border-r border-[#b5a894] dark:border-slate-700">
            <Wrench className="w-5 h-5 text-slate-800 dark:text-amber-400 shrink-0" />
            <h2 className="text-base font-bold tracking-tight whitespace-nowrap">
              렌탈 정비·부품관리
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                {
                  key: "ACTIVITIES" as SubTabKey,
                  label: "정비활동 관리",
                  badge: summary.totalMaintenances,
                },
                {
                  key: "PREVENTIVE_PM" as SubTabKey,
                  label: "정기 사전점검",
                  badge: summary.pmOverdueCount + summary.pmDueSoonCount,
                  alert: summary.pmOverdueCount > 0,
                },
                {
                  key: "HOURS_WEAR" as SubTabKey,
                  label: "가동시간·부품열화",
                  badge: criticalWearCount + warningWearCount,
                  alert: criticalWearCount > 0,
                },
                {
                  key: "VEHICLE_STOCK" as SubTabKey,
                  label: "정비차량 부품재고",
                  badge: vehicles.filter((v) => v.status === "ACTIVE").length,
                },
              ] as Array<{
                key: SubTabKey;
                label: string;
                badge?: number;
                alert?: boolean;
              }>
            ).map((tab) => {
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
          <button type="button" onClick={() => setErrorMsg(null)} className="p-0.5 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {noticeMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-3 py-2 rounded text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{noticeMsg}</span>
          </div>
          <button type="button" onClick={() => setNoticeMsg(null)} className="p-0.5 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ==================== SUB-TAB 1: 정비활동 관리 ==================== */}
      {activeSubTab === "ACTIVITIES" && (
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {/* Top-Left Scope Filter + Top-Right Summary KPIs */}
          <div className="bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg p-3 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  통합검색
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="차대번호·모델·거래처·작업명·담당자"
                    className="h-8 pl-8 pr-2.5 w-60 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  정비유형
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-8 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                >
                  <option value="ALL">전체 유형</option>
                  <option value="PREVENTIVE">정기 사전점검</option>
                  <option value="CORRECTIVE">일반 수리</option>
                  <option value="EMERGENCY">긴급 출동정비</option>
                  <option value="OVERHAUL">중정비·오버홀</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  정비결과
                </label>
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value)}
                  className="h-8 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                >
                  <option value="ALL">전체 결과</option>
                  <option value="COMPLETED">완료</option>
                  <option value="FOLLOW_UP_REQUIRED">추가조치 필요</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  시작일
                </label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="h-8 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  종료일
                </label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="h-8 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                />
              </div>

              {(searchQuery || typeFilter !== "ALL" || resultFilter !== "ALL" || startDateFilter || endDateFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setTypeFilter("ALL");
                    setResultFilter("ALL");
                    setStartDateFilter("");
                    setEndDateFilter("");
                  }}
                  className="h-8 px-2.5 rounded border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:border-slate-700 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  필터 초기화
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="px-2.5 py-1 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 whitespace-nowrap">
                <span className="text-slate-600 dark:text-slate-400 mr-1.5">조회건수</span>
                <span className="font-bold">{formatErpNumber(summary.totalMaintenances)}건</span>
              </div>
              <div className="px-2.5 py-1 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 whitespace-nowrap">
                <span className="text-slate-600 dark:text-slate-400 mr-1.5">사전점검</span>
                <span className="font-bold">{formatErpNumber(summary.preventiveCount)}건</span>
              </div>
              <div className="px-2.5 py-1 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 whitespace-nowrap">
                <span className="text-slate-600 dark:text-slate-400 mr-1.5">부품비용</span>
                <span className="font-bold">₩{formatErpNumber(summary.partsCostSum)}</span>
              </div>
            </div>
          </div>

          {/* Center High-Density Grid (Action Column Leftmost) */}
          <div className="flex-1 bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  <tr>
                    <th className="px-2.5 py-2 text-left font-bold whitespace-nowrap">관리</th>
                    <SortableTh label="정비번호" colKey="maintenanceNo" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="정비일자" colKey="maintenanceDate" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="유형" colKey="maintenanceType" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="차대번호" colKey="serialNo" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="모델" colKey="modelName" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="거래처·현장" colKey="customerName" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="작업명" colKey="title" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="담당자·차량" colKey="technicianName" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="가동시간" colKey="operatingHours" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} align="right" className="px-2.5 py-2 font-bold" />
                    <SortableTh label="사용부품 내역" colKey="parts" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="합계비용" colKey="totalCost" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} align="right" className="px-2.5 py-2 font-bold" />
                    <SortableTh label="결과" colKey="resultStatus" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dcd4c4] dark:divide-slate-800">
                  {sortedMaintenances.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                        등록된 정비활동 이력이 없습니다. 우측 상단 정비활동 등록 버튼을 눌러 등록하세요.
                      </td>
                    </tr>
                  ) : (
                    sortedMaintenances.map((m) => (
                      <tr
                        key={m.id}
                        className="hover:bg-[#ebe5d8]/70 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditMaintenanceModal(m)}
                            className="px-2 py-1 rounded text-[11px] font-bold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#dcd4c4] dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                          >
                            상세·수정 ➔
                          </button>
                        </td>
                        <td className="px-2.5 py-2 font-mono font-semibold whitespace-nowrap">
                          {m.maintenanceNo}
                        </td>
                        <td className="px-2.5 py-2 font-mono whitespace-nowrap">{m.maintenanceDate}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                              m.maintenanceType === "PREVENTIVE"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                : m.maintenanceType === "EMERGENCY"
                                  ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                                  : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                            }`}
                          >
                            {MAINTENANCE_TYPE_LABELS[m.maintenanceType]}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 font-mono font-bold whitespace-nowrap">
                          {m.serialNo || "-"}
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{m.modelName || "-"}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          {m.customerName ? (
                            <span>
                              {m.customerName}
                              {m.siteName ? ` / ${m.siteName}` : ""}
                            </span>
                          ) : (
                            <span className="text-slate-500">주기장</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 max-w-[220px] truncate font-medium" title={m.title}>
                          {m.title}
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          {m.technicianName || "-"}
                          {m.vehicleNo ? ` (${m.vehicleNo})` : ""}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono whitespace-nowrap">
                          {formatErpNumber(m.operatingHours)}h
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          {m.parts.length === 0 ? (
                            <span className="text-slate-400">없음</span>
                          ) : (
                            <span
                              className="inline-block max-w-[220px] truncate"
                              title={m.parts
                                .map(
                                  (p) =>
                                    `${p.productName} x${p.qty} (${
                                      p.sourceType === "VEHICLE" ? p.vehicleNo || "차량" : "주기장"
                                    })`
                                )
                                .join(", ")}
                            >
                              {m.parts[0].productName} x{m.parts[0].qty}
                              {m.parts[0].sourceType === "VEHICLE"
                                ? ` [${m.parts[0].vehicleNo || "차량"}]`
                                : " [주기장]"}
                              {m.parts.length > 1 ? ` 외 ${m.parts.length - 1}건` : ""}
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono font-bold whitespace-nowrap">
                          ₩{formatErpNumber(m.totalCost)}
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                              m.resultStatus === "COMPLETED"
                                ? "bg-slate-800 text-[#f4efe4] border-slate-800 dark:bg-slate-700"
                                : "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300"
                            }`}
                          >
                            {MAINTENANCE_RESULT_LABELS[m.resultStatus]}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom-Right Terminal Audit Equation */}
            <div className="px-3 py-2 border-t border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800/80 flex items-center justify-end gap-4 text-xs font-mono">
              <span className="whitespace-nowrap">
                건수 <strong>{formatErpNumber(summary.totalMaintenances)}</strong>건
              </span>
              <span className="whitespace-nowrap">
                부품비 <strong>₩{formatErpNumber(summary.partsCostSum)}</strong> + 공임·출장{" "}
                <strong>₩{formatErpNumber(summary.totalCostSum - summary.partsCostSum)}</strong> = 총 정비비{" "}
                <strong>₩{formatErpNumber(summary.totalCostSum)}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 2: 정기 사전점검 ==================== */}
      {activeSubTab === "PREVENTIVE_PM" && (
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <div className="bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg p-3 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  점검상태
                </label>
                <div className="flex flex-wrap items-center gap-1">
                  {(
                    [
                      { key: "ALL", label: "전체" },
                      { key: "OVERDUE", label: `기한 초과 (${summary.pmOverdueCount})` },
                      { key: "DUE_SOON", label: `점검 도래 (${summary.pmDueSoonCount})` },
                      { key: "ON_TRACK", label: `정상 (${summary.pmOnTrackCount})` },
                      { key: "STANDBY", label: "대기" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setPmStatusFilter(opt.key)}
                      className={`h-8 px-2.5 rounded text-xs font-semibold border whitespace-nowrap shrink-0 ${
                        pmStatusFilter === opt.key
                          ? "bg-slate-900 text-[#f4efe4] border-slate-900 dark:bg-amber-600 dark:text-slate-950"
                          : "bg-[#ebe5d8] text-slate-800 border-[#b5a894] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  자산·거래처 검색
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="차대번호·모델·거래처"
                  className="h-8 px-2.5 w-52 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <CalendarClock className="w-4 h-4 text-slate-700 dark:text-amber-400 shrink-0" />
              <span className="font-semibold whitespace-nowrap">기준일: {today}</span>
            </div>
          </div>

          <div className="flex-1 bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700">
                  <tr>
                    <th className="px-2.5 py-2 text-left font-bold whitespace-nowrap">조치</th>
                    <SortableTh label="차대번호" colKey="serialNo" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="모델" colKey="modelName" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="자산상태" colKey="assetStatus" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="거래처·현장" colKey="currentCustomer" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="점검상태" colKey="pmStatus" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="차기 예정일" colKey="nextPmDueDate" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="잔여일" colKey="daysUntilDue" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} align="right" className="px-2.5 py-2 font-bold" />
                    <SortableTh label="최종 점검일" colKey="lastPmDate" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="점검주기" colKey="pmIntervalDays" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} align="right" className="px-2.5 py-2 font-bold" />
                    <SortableTh label="누적 가동시간" colKey="operatingHours" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} align="right" className="px-2.5 py-2 font-bold" />
                    <SortableTh label="누적 점검" colKey="pmCount" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} align="right" className="px-2.5 py-2 font-bold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dcd4c4] dark:divide-slate-800">
                  {sortedPmSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-12 text-center text-slate-500">
                        조건에 해당하는 사전점검 대상 자산이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    sortedPmSchedules.map((row) => (
                      <tr
                        key={row.assetId}
                        className="hover:bg-[#ebe5d8]/70 dark:hover:bg-slate-800/60"
                      >
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              openCreateMaintenanceModal({
                                assetId: row.assetId,
                                maintenanceType: "PREVENTIVE",
                                title: `${today.slice(0, 7)} 월간 정기 사전점검`,
                              })
                            }
                            className="px-2 py-1 rounded text-[11px] font-bold bg-slate-900 text-[#f4efe4] hover:bg-slate-800 dark:bg-amber-600 dark:text-slate-950 whitespace-nowrap shrink-0"
                          >
                            점검 등록 ➔
                          </button>
                        </td>
                        <td className="px-2.5 py-2 font-mono font-bold whitespace-nowrap">
                          {row.serialNo}
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{row.modelName || "-"}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                              ASSET_STATUS_BADGE[row.assetStatus] || ""
                            }`}
                          >
                            {ASSET_STATUS_LABELS[row.assetStatus] || row.assetStatus}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          {row.currentCustomer ? (
                            <span>
                              {row.currentCustomer}
                              {row.currentSite ? ` / ${row.currentSite}` : ""}
                            </span>
                          ) : (
                            <span className="text-slate-500">주기장</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                              PM_BADGE[row.pmStatus]
                            }`}
                          >
                            {PM_DUE_STATUS_LABELS[row.pmStatus]}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 font-mono font-semibold whitespace-nowrap">
                          {row.nextPmDueDate || "-"}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono font-bold whitespace-nowrap">
                          {row.daysUntilDue === null ? (
                            "-"
                          ) : row.daysUntilDue < 0 ? (
                            <span className="text-rose-700 dark:text-rose-400">
                              +{Math.abs(row.daysUntilDue)}일 초과
                            </span>
                          ) : (
                            <span>D-{row.daysUntilDue}일</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 font-mono whitespace-nowrap">
                          {row.lastPmDate || "미실시"}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono whitespace-nowrap">
                          {row.pmIntervalDays}일
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono whitespace-nowrap">
                          {formatErpNumber(row.operatingHours)}h
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono whitespace-nowrap">
                          {formatErpNumber(row.pmCount)}회
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-3 py-2 border-t border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800/80 flex items-center justify-end gap-4 text-xs font-mono">
              <span className="whitespace-nowrap">
                표시대상 <strong>{formatErpNumber(pmSchedules.length)}</strong>대
              </span>
              <span className="whitespace-nowrap text-rose-700 dark:text-rose-400">
                기한초과 <strong>{summary.pmOverdueCount}</strong>
              </span>
              <span className="whitespace-nowrap text-amber-700 dark:text-amber-400">
                점검도래(7일내) <strong>{summary.pmDueSoonCount}</strong>
              </span>
              <span className="whitespace-nowrap text-emerald-700 dark:text-emerald-400">
                정상 <strong>{summary.pmOnTrackCount}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 3: 가동시간·부품열화 ==================== */}
      <HoursWearSubTab
        activeSubTab={activeSubTab}
        criticalWearCount={criticalWearCount}
        handleRecordOperatingHours={handleRecordOperatingHours}
        handleSaveWearConfig={handleSaveWearConfig}
        hourInputDate={hourInputDate}
        hourInputNote={hourInputNote}
        hourInputValue={hourInputValue}
        hourLogSort={hourLogSort}
        openCreateMaintenanceModal={openCreateMaintenanceModal}
        savingHours={savingHours}
        searchQuery={searchQuery}
        selectedWearAsset={selectedWearAsset}
        selectedWearAssetId={selectedWearAssetId}
        setHourInputDate={setHourInputDate}
        setHourInputNote={setHourInputNote}
        setHourInputValue={setHourInputValue}
        setSearchQuery={setSearchQuery}
        setSelectedWearAssetId={setSelectedWearAssetId}
        setWearEditItems={setWearEditItems}
        setWearEditPmInterval={setWearEditPmInterval}
        setWearSeverityFilter={setWearSeverityFilter}
        sortedHourLogs={sortedHourLogs}
        sortedWearAssets={sortedWearAssets}
        warningWearCount={warningWearCount}
        wearEditItems={wearEditItems}
        wearEditPmInterval={wearEditPmInterval}
        wearSeverityFilter={wearSeverityFilter}
        wearSort={wearSort}
      />

      {/* ==================== SUB-TAB 4: 정비차량 부품재고 ==================== */}
      <VehicleStockSubTab
        activeSubTab={activeSubTab}
        fleetStockSort={fleetStockSort}
        fleetStockTotals={fleetStockTotals}
        movementSort={movementSort}
        movementTypeFilter={movementTypeFilter}
        openTransferModal={openTransferModal}
        openVehicleModal={openVehicleModal}
        selectedVehicle={selectedVehicle}
        selectedVehicleId={selectedVehicleId}
        setMovementTypeFilter={setMovementTypeFilter}
        setSelectedVehicleId={setSelectedVehicleId}
        setShowYardReceiptModal={setShowYardReceiptModal}
        sortedFleetStockSummary={sortedFleetStockSummary}
        sortedMovements={sortedMovements}
        sortedSelectedVehicleStocks={sortedSelectedVehicleStocks}
        sortedVehicles={sortedVehicles}
        vehStockSort={vehStockSort}
        vehicleSort={vehicleSort}
      />

      {/* ==================== MODAL 1: 정비활동 등록/수정 ==================== */}
      <MaintModal
        addMaintPartRow={addMaintPartRow}
        assetComboOptions={assetComboOptions}
        buildPartComboOptions={buildPartComboOptions}
        editingMaintId={editingMaintId}
        editingMaintNo={editingMaintNo}
        employeeComboOptions={employeeComboOptions}
        employees={employees}
        handleSaveMaintenance={handleSaveMaintenance}
        handleSelectMaintAsset={handleSelectMaintAsset}
        maintFormAssetId={maintFormAssetId}
        maintFormChecklist={maintFormChecklist}
        maintFormDate={maintFormDate}
        maintFormHours={maintFormHours}
        maintFormLaborCost={maintFormLaborCost}
        maintFormNextPm={maintFormNextPm}
        maintFormParts={maintFormParts}
        maintFormResetCodes={maintFormResetCodes}
        maintFormResult={maintFormResult}
        maintFormStatusAfter={maintFormStatusAfter}
        maintFormSymptom={maintFormSymptom}
        maintFormTechId={maintFormTechId}
        maintFormTechName={maintFormTechName}
        maintFormTitle={maintFormTitle}
        maintFormTravelCost={maintFormTravelCost}
        maintFormType={maintFormType}
        maintFormVehicleId={maintFormVehicleId}
        maintFormWork={maintFormWork}
        maintGrandTotalCost={maintGrandTotalCost}
        maintPartsTotalCost={maintPartsTotalCost}
        savingMaint={savingMaint}
        setMaintFormChecklist={setMaintFormChecklist}
        setMaintFormDate={setMaintFormDate}
        setMaintFormHours={setMaintFormHours}
        setMaintFormLaborCost={setMaintFormLaborCost}
        setMaintFormNextPm={setMaintFormNextPm}
        setMaintFormParts={setMaintFormParts}
        setMaintFormResetCodes={setMaintFormResetCodes}
        setMaintFormResult={setMaintFormResult}
        setMaintFormStatusAfter={setMaintFormStatusAfter}
        setMaintFormSymptom={setMaintFormSymptom}
        setMaintFormTechId={setMaintFormTechId}
        setMaintFormTechName={setMaintFormTechName}
        setMaintFormTitle={setMaintFormTitle}
        setMaintFormTravelCost={setMaintFormTravelCost}
        setMaintFormType={setMaintFormType}
        setMaintFormVehicleId={setMaintFormVehicleId}
        setMaintFormWork={setMaintFormWork}
        setShowMaintModal={setShowMaintModal}
        setShowQuickPartModal={setShowQuickPartModal}
        showMaintModal={showMaintModal}
        updateMaintPartRow={updateMaintPartRow}
        vehicleComboOptions={vehicleComboOptions}
        vehicles={vehicles}
      />

      {/* ==================== MODAL 2: 부품 이동 ==================== */}
      <TransferModal
        handleSaveTransfer={handleSaveTransfer}
        savingTransfer={savingTransfer}
        setShowTransferModal={setShowTransferModal}
        setTransferDate={setTransferDate}
        setTransferFromVehicleId={setTransferFromVehicleId}
        setTransferNote={setTransferNote}
        setTransferProductId={setTransferProductId}
        setTransferQty={setTransferQty}
        setTransferTargetQty={setTransferTargetQty}
        setTransferToVehicleId={setTransferToVehicleId}
        setTransferType={setTransferType}
        showTransferModal={showTransferModal}
        transferDate={transferDate}
        transferFromVehicleId={transferFromVehicleId}
        transferNote={transferNote}
        transferProductId={transferProductId}
        transferQty={transferQty}
        transferSourcePartOptions={transferSourcePartOptions}
        transferTargetQty={transferTargetQty}
        transferToVehicleId={transferToVehicleId}
        transferType={transferType}
        vehicleComboOptions={vehicleComboOptions}
      />

      {/* ==================== MODAL 3: 정비차량 등록/수정 ==================== */}
      <VehicleModal
        editingVehicleId={editingVehicleId}
        employeeComboOptions={employeeComboOptions}
        employees={employees}
        handleSaveVehicle={handleSaveVehicle}
        savingVehicle={savingVehicle}
        setShowVehicleModal={setShowVehicleModal}
        setVehDriverId={setVehDriverId}
        setVehDriverName={setVehDriverName}
        setVehDriverPhone={setVehDriverPhone}
        setVehMemo={setVehMemo}
        setVehName={setVehName}
        setVehNo={setVehNo}
        setVehRegion={setVehRegion}
        setVehStatus={setVehStatus}
        showVehicleModal={showVehicleModal}
        vehDriverId={vehDriverId}
        vehDriverName={vehDriverName}
        vehDriverPhone={vehDriverPhone}
        vehMemo={vehMemo}
        vehName={vehName}
        vehNo={vehNo}
        vehRegion={vehRegion}
        vehStatus={vehStatus}
      />

      {/* ==================== MODAL 4: 신규 부품 SKU 등록 ==================== */}
      <QuickPartModal
        handleSaveQuickPart={handleSaveQuickPart}
        qpCategory={qpCategory}
        qpCost={qpCost}
        qpInitialStock={qpInitialStock}
        qpName={qpName}
        qpPartNo={qpPartNo}
        qpPrice={qpPrice}
        qpSafetyStock={qpSafetyStock}
        qpSkuCode={qpSkuCode}
        qpUnit={qpUnit}
        savingQuickPart={savingQuickPart}
        setQpCategory={setQpCategory}
        setQpCost={setQpCost}
        setQpInitialStock={setQpInitialStock}
        setQpName={setQpName}
        setQpPartNo={setQpPartNo}
        setQpPrice={setQpPrice}
        setQpSafetyStock={setQpSafetyStock}
        setQpSkuCode={setQpSkuCode}
        setQpUnit={setQpUnit}
        setShowQuickPartModal={setShowQuickPartModal}
        showQuickPartModal={showQuickPartModal}
      />

      {/* ==================== MODAL 5: 주기장 부품 입고 ==================== */}
      <YardReceiptModal
        buildPartComboOptions={buildPartComboOptions}
        handleSaveYardReceipt={handleSaveYardReceipt}
        savingYardReceipt={savingYardReceipt}
        setShowYardReceiptModal={setShowYardReceiptModal}
        setYrDate={setYrDate}
        setYrNote={setYrNote}
        setYrProductId={setYrProductId}
        setYrQty={setYrQty}
        showYardReceiptModal={showYardReceiptModal}
        yrDate={yrDate}
        yrNote={yrNote}
        yrProductId={yrProductId}
        yrQty={yrQty}
      />
    </div>
  );
}
