"use client";

import React, { useState, useEffect } from "react";
import {
  MenuHistoryState,
  createMenuHistory,
  pushMenuHistory,
  stepMenuHistoryBack,
  stepMenuHistoryForward,
  pruneMenuHistoryByAllowed,
  canStepMenuBack,
  canStepMenuForward,
  getPrevMenuEntry,
  getNextMenuEntry,
} from "@/lib/erpMenuHistory";
import type { EntityScope, ErpThemeMode } from "./components/ErpHeader";
import {
  CATEGORIES,
  MENU_PERM_KEY_MAP,
  type ErpCategoryKey,
  type ErpMenuKey,
} from "./erpMenuConfig";

const MAX_MOUNTED_MENUS = 12; // 최근 사용 탭 최대 12개 LRU 유지

export type RolePermissionEntry = {
  roleCode: string;
  menuKey: string;
  canView: boolean;
  canSave: boolean;
  canBill?: boolean;
};

export type MenuPrefsState = {
  categoryOrder: ErpCategoryKey[];
  itemOrder: Partial<Record<ErpCategoryKey, ErpMenuKey[]>>;
  hiddenMenus: ErpMenuKey[];
  defaultMenu?: ErpMenuKey;
};

type ScrollSnapshotItem = { el: HTMLElement; top: number; left: number };

export function useErpShellController() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [menuHistory, setMenuHistory] = useState<
    MenuHistoryState<ErpMenuKey, ErpCategoryKey>
  >(() =>
    createMenuHistory<ErpMenuKey, ErpCategoryKey>("FINANCIAL_REPORT", "FINANCE")
  );
  const menuHistoryRef = React.useRef(menuHistory);
  menuHistoryRef.current = menuHistory;

  const currentHistoryEntry = menuHistory.entries[menuHistory.index] || {
    menu: "FINANCIAL_REPORT" as ErpMenuKey,
    category: "FINANCE" as ErpCategoryKey,
  };
  const activeMenu = currentHistoryEntry.menu;
  const activeCategory = currentHistoryEntry.category;

  const [mountedMenus, setMountedMenus] = useState<ErpMenuKey[]>([]);
  const paneRefs = React.useRef<Partial<Record<ErpMenuKey, HTMLDivElement | null>>>({});
  const scrollSnapshotsRef = React.useRef<
    Partial<Record<ErpMenuKey, ScrollSnapshotItem[]>>
  >({});
  const lastHardwareNavAtRef = React.useRef<number>(0);
  const bootPermsKeyRef = React.useRef<string>("");

  const [targetWorkImprovementId, setTargetWorkImprovementId] = useState<number | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [theme, setTheme] = useState<ErpThemeMode>("light");
  const [selectedEntity, setSelectedEntity] = useState<EntityScope>("ALL");
  const [rolePerms, setRolePerms] = useState<RolePermissionEntry[]>([]);
  const [employeeRolesMap, setEmployeeRolesMap] = useState<
    Record<number, { role: string; roleCode: string }>
  >({});
  const [permsLoaded, setPermsLoaded] = useState(false);

  const [showMenuPersonalizeModal, setShowMenuPersonalizeModal] = useState(false);
  const [menuPrefs, setMenuPrefs] = useState<MenuPrefsState>({
    categoryOrder: CATEGORIES.map((c) => c.key),
    itemOrder: {},
    hiddenMenus: [],
  });

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    HR: true,
    APPROVAL: true,
    FINANCE: true,
    PARTNER: true,
    ASSET: true,
    INOUT: true,
    BUSINESS: true,
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const applyPermissionsPayload = React.useCallback((data: any) => {
    if (data?.success && Array.isArray(data.permissions)) {
      setRolePerms(data.permissions);
    }
    if (data?.success && Array.isArray(data.employeeRoles)) {
      const map: Record<number, { role: string; roleCode: string }> = {};
      for (const emp of data.employeeRoles) {
        map[Number(emp.id)] = {
          role: emp.role || "",
          roleCode: emp.roleCode || "",
        };
      }
      setEmployeeRolesMap(map);
    }
  }, []);

  const fetchRolePermissions = React.useCallback(async () => {
    try {
      const res = await fetch("/api/erp/permissions", { cache: "no-store" });
      const data = await res.json();
      applyPermissionsPayload(data);
    } catch (e) {
      console.error("Failed to load role permissions:", e);
    } finally {
      setPermsLoaded(true);
    }
  }, [applyPermissionsPayload]);

  // Restore server session & UI theme on mount (parallel session + permissions prefetch)
  useEffect(() => {
    let cancelled = false;

    try {
      localStorage.removeItem("dragonrpa_erp_user");
      const savedTheme = localStorage.getItem("dragonrpa_erp_theme");
      if (savedTheme === "white") {
        setTheme("white");
      } else {
        setTheme("light"); // e-Bro ERP 전사 표준: 밝은화면모드 기본
      }

      const savedEntity = localStorage.getItem("dragonrpa_erp_entity") as EntityScope;
      if (savedEntity === "ALL" || savedEntity === "CORP" || savedEntity === "INDIVIDUAL") {
        setSelectedEntity(savedEntity);
      }
    } catch {
      // ignore storage access failure
    }

    (async () => {
      const permsFetchPromise = fetch("/api/erp/permissions", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      try {
        const res = await fetch("/api/erp/auth/session", { cache: "no-store" });
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (data?.success && data.user) {
            const permsData = await permsFetchPromise;
            if (cancelled) return;
            if (permsData) {
              applyPermissionsPayload(permsData);
              setPermsLoaded(true);
              bootPermsKeyRef.current = `${data.user.id}:${data.user.role}:${data.user.roleCode}`;
            }
            setCurrentUser(data.user);
          }
        }
      } catch {
        // ignore network errors on boot
      } finally {
        if (!cancelled) {
          setIsInitialized(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyPermissionsPayload]);

  useEffect(() => {
    if (currentUser) {
      const userKey = `${currentUser.id}:${currentUser.role}:${currentUser.roleCode}`;
      if (bootPermsKeyRef.current === userKey) {
        bootPermsKeyRef.current = "";
      } else {
        setPermsLoaded(false);
        fetchRolePermissions();
      }
      scrollSnapshotsRef.current = {};
      setMountedMenus([]);
      let startMenu: ErpMenuKey = "FINANCIAL_REPORT";
      let startCat: ErpCategoryKey = "FINANCE";
      try {
        const prefKey = `dragonrpa_erp_menu_prefs_${currentUser.id || currentUser.loginId || "default"}`;
        const rawPref = localStorage.getItem(prefKey);
        if (rawPref) {
          const parsed = JSON.parse(rawPref);
          const validCatKeys = CATEGORIES.map((c) => c.key);
          const mergedCatOrder = [
            ...(Array.isArray(parsed.categoryOrder)
              ? parsed.categoryOrder.filter((k: any) => validCatKeys.includes(k))
              : []),
            ...validCatKeys.filter((k) => !(parsed.categoryOrder || []).includes(k)),
          ];
          setMenuPrefs({
            categoryOrder: mergedCatOrder,
            itemOrder: parsed.itemOrder || {},
            hiddenMenus: Array.isArray(parsed.hiddenMenus) ? parsed.hiddenMenus : [],
            defaultMenu: parsed.defaultMenu || undefined,
          });
          if (parsed.defaultMenu) {
            const matchedCat = CATEGORIES.find((c) =>
              c.items.some((i) => i.key === parsed.defaultMenu)
            );
            if (matchedCat) {
              startMenu = parsed.defaultMenu;
              startCat = matchedCat.key;
            }
          }
        } else {
          setMenuPrefs({
            categoryOrder: CATEGORIES.map((c) => c.key),
            itemOrder: {},
            hiddenMenus: [],
          });
        }
      } catch (err) {
        console.error("Failed to load menu prefs:", err);
      }
      const init = createMenuHistory<ErpMenuKey, ErpCategoryKey>(startMenu, startCat);
      menuHistoryRef.current = init;
      setMenuHistory(init);
    }
  }, [currentUser?.id, currentUser?.role, currentUser?.roleCode, fetchRolePermissions]);

  const saveMenuPrefs = (nextPrefs: MenuPrefsState) => {
    setMenuPrefs(nextPrefs);
    try {
      const prefKey = `dragonrpa_erp_menu_prefs_${currentUser?.id || currentUser?.loginId || "default"}`;
      localStorage.setItem(prefKey, JSON.stringify(nextPrefs));
    } catch (err) {
      console.error("Failed to save menu prefs:", err);
    }
  };

  const effectiveRoleCode = React.useMemo(() => {
    if (!currentUser) return "EMPLOYEE";
    const dbEmp = employeeRolesMap[Number(currentUser.id)];
    const r = String(dbEmp?.role || currentUser.role || "").toUpperCase();
    const rc = String(dbEmp?.roleCode || currentUser.roleCode || "").toUpperCase();
    if (
      currentUser.loginId === "admin" ||
      r === "ADMIN" ||
      r === "SUPER_ADMIN" ||
      rc === "ADMIN"
    ) {
      return "ADMIN";
    }
    if (rc) return rc;
    if (r === "MANAGER") return "MANAGER";
    return "EMPLOYEE";
  }, [currentUser, employeeRolesMap]);

  const permittedCategories = React.useMemo(() => {
    if (effectiveRoleCode === "ADMIN") {
      return CATEGORIES;
    }
    if (!permsLoaded) {
      return [];
    }
    const allowedSet = new Set(
      rolePerms
        .filter((p) => p.roleCode === effectiveRoleCode && p.canView)
        .map((p) => p.menuKey)
    );
    // 근로기준법 제14조에 의거하여 취업규칙(work_rules)은 모든 임직원에게 항상 열람 허용
    allowedSet.add("work_rules");
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => allowedSet.has(MENU_PERM_KEY_MAP[item.key])),
    })).filter((cat) => cat.items.length > 0);
  }, [effectiveRoleCode, permsLoaded, rolePerms]);

  const visibleCategories = React.useMemo(() => {
    const hiddenSet = new Set(menuPrefs.hiddenMenus || []);
    const catOrder = menuPrefs.categoryOrder || [];

    const orderedCats = [...permittedCategories].sort((a, b) => {
      const idxA = catOrder.indexOf(a.key);
      const idxB = catOrder.indexOf(b.key);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    return orderedCats
      .map((cat) => {
        const customItemOrder = menuPrefs.itemOrder?.[cat.key] || [];
        const sortedItems = [...cat.items]
          .filter((item) => !hiddenSet.has(item.key))
          .sort((a, b) => {
            const ia = customItemOrder.indexOf(a.key);
            const ib = customItemOrder.indexOf(b.key);
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
          });
        return {
          ...cat,
          items: sortedItems,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [permittedCategories, menuPrefs]);

  const isMenuAllowed = visibleCategories.some((c) =>
    c.items.some((i) => i.key === activeMenu)
  );

  // 권한 또는 숨김 설정 변경 시 방문 이력 및 Keep-Alive 마운트 목록 정리
  useEffect(() => {
    if (!currentUser || visibleCategories.length === 0) return;
    const firstCat = visibleCategories[0];
    const firstItem = firstCat?.items[0];
    if (!firstCat || !firstItem) return;

    const allowedSet = new Set<ErpMenuKey>(
      visibleCategories.flatMap((c) => c.items.map((i) => i.key))
    );

    setMenuHistory((prev) => {
      const next = pruneMenuHistoryByAllowed(prev, allowedSet, {
        menu: firstItem.key,
        category: firstCat.key,
      });
      menuHistoryRef.current = next;
      return next;
    });

    setMountedMenus((prev) => {
      const next = prev.filter((m) => allowedSet.has(m));
      return next.length === prev.length ? prev : next;
    });
  }, [currentUser, visibleCategories]);

  // 실제 스크롤이 발생한 컨테이너만 기록하여 Layout Thrashing(querySelectorAll("*")) 제거
  const scrolledElementsRef = React.useRef<Map<ErpMenuKey, Set<HTMLElement>>>(new Map());

  React.useEffect(() => {
    const handlePassiveScroll = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      const currentRoot = paneRefs.current[activeMenu];
      if (!currentRoot) return;

      if (target === currentRoot || currentRoot.contains(target)) {
        let set = scrolledElementsRef.current.get(activeMenu);
        if (!set) {
          set = new Set<HTMLElement>();
          scrolledElementsRef.current.set(activeMenu, set);
        }
        set.add(target);
      }
    };

    window.addEventListener("scroll", handlePassiveScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener("scroll", handlePassiveScroll, { capture: true });
    };
  }, [activeMenu]);

  // 인가된 활성 메뉴만 최초 방문 시 Lazy-Mount 후 Keep-Alive 유지 (최근 MAX_MOUNTED_MENUS개 LRU 상한)
  useEffect(() => {
    if (!currentUser || !isMenuAllowed) return;
    setMountedMenus((prev) => {
      const filtered = prev.filter((m) => m !== activeMenu);
      const next = [...filtered, activeMenu];
      if (next.length > MAX_MOUNTED_MENUS) {
        return next.slice(next.length - MAX_MOUNTED_MENUS);
      }
      return next;
    });
  }, [currentUser, activeMenu, isMenuAllowed]);

  const saveMenuScrollSnapshot = React.useCallback((menuKey: ErpMenuKey) => {
    const root = paneRefs.current[menuKey];
    if (!root) return;
    const items: ScrollSnapshotItem[] = [];
    if (root.scrollTop > 0 || root.scrollLeft > 0) {
      items.push({ el: root, top: root.scrollTop, left: root.scrollLeft });
    }

    const tracked = scrolledElementsRef.current.get(menuKey);
    if (tracked && tracked.size > 0) {
      for (const node of tracked) {
        if (node !== root && node.isConnected) {
          if (node.scrollTop > 0 || node.scrollLeft > 0) {
            items.push({ el: node, top: node.scrollTop, left: node.scrollLeft });
          }
        }
      }
    }
    scrollSnapshotsRef.current[menuKey] = items;
  }, []);

  React.useLayoutEffect(() => {
    const items = scrollSnapshotsRef.current[activeMenu];
    if (!items || items.length === 0) return;
    for (const item of items) {
      if (item.el && item.el.isConnected) {
        item.el.scrollTop = item.top;
        item.el.scrollLeft = item.left;
      }
    }
  }, [activeMenu]);

  const resolveCategoryForMenu = React.useCallback(
    (menuKey: ErpMenuKey): ErpCategoryKey => {
      const visibleCat = visibleCategories.find((c) =>
        c.items.some((i) => i.key === menuKey)
      );
      if (visibleCat) return visibleCat.key;
      const staticCat = CATEGORIES.find((c) =>
        c.items.some((i) => i.key === menuKey)
      );
      return staticCat ? staticCat.key : "FINANCE";
    },
    [visibleCategories]
  );

  const navigateToMenu = React.useCallback(
    (nextMenu: ErpMenuKey, explicitCategory?: ErpCategoryKey) => {
      const nextCat = explicitCategory || resolveCategoryForMenu(nextMenu);
      const currentEntry =
        menuHistoryRef.current.entries[menuHistoryRef.current.index];
      if (currentEntry && currentEntry.menu !== nextMenu) {
        saveMenuScrollSnapshot(currentEntry.menu);
      }
      const nextState = pushMenuHistory(
        menuHistoryRef.current,
        nextMenu,
        nextCat
      );
      menuHistoryRef.current = nextState;
      setMenuHistory(nextState);
      setExpandedGroups((prev) =>
        prev[nextCat] === true ? prev : { ...prev, [nextCat]: true }
      );
      setIsMobileSidebarOpen(false);
    },
    [resolveCategoryForMenu, saveMenuScrollSnapshot]
  );

  const handleGoBack = React.useCallback((): boolean => {
    if (!canStepMenuBack(menuHistoryRef.current)) return false;
    const currentEntry =
      menuHistoryRef.current.entries[menuHistoryRef.current.index];
    if (currentEntry) {
      saveMenuScrollSnapshot(currentEntry.menu);
    }
    const nextState = stepMenuHistoryBack(menuHistoryRef.current);
    menuHistoryRef.current = nextState;
    setMenuHistory(nextState);
    const targetCat = nextState.entries[nextState.index]?.category;
    if (targetCat) {
      setExpandedGroups((prev) =>
        prev[targetCat] === true ? prev : { ...prev, [targetCat]: true }
      );
    }
    setIsMobileSidebarOpen(false);
    return true;
  }, [saveMenuScrollSnapshot]);

  const handleGoForward = React.useCallback((): boolean => {
    if (!canStepMenuForward(menuHistoryRef.current)) return false;
    const currentEntry =
      menuHistoryRef.current.entries[menuHistoryRef.current.index];
    if (currentEntry) {
      saveMenuScrollSnapshot(currentEntry.menu);
    }
    const nextState = stepMenuHistoryForward(menuHistoryRef.current);
    menuHistoryRef.current = nextState;
    setMenuHistory(nextState);
    const targetCat = nextState.entries[nextState.index]?.category;
    if (targetCat) {
      setExpandedGroups((prev) =>
        prev[targetCat] === true ? prev : { ...prev, [targetCat]: true }
      );
    }
    setIsMobileSidebarOpen(false);
    return true;
  }, [saveMenuScrollSnapshot]);

  // 5버튼 마우스 사이드 버튼(3=뒤로, 4=앞으로), 하드웨어 키, Alt+화살표 및 popstate 가드
  useEffect(() => {
    if (!currentUser) return;

    const ensureSentinel = () => {
      try {
        if (window.history.state?.dragonErpSentinel !== true) {
          window.history.pushState(
            { ...(window.history.state || {}), dragonErpSentinel: true },
            "",
            window.location.href
          );
        }
      } catch {}
    };

    ensureSentinel();

    const isEditableTarget = (el: EventTarget | null): boolean => {
      const node =
        el instanceof HTMLElement
          ? el
          : document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      if (!node) return false;
      const tag = node.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return true;
      }
      return node.isContentEditable;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 3) {
        e.preventDefault();
        e.stopPropagation();
        lastHardwareNavAtRef.current = performance.now();
        handleGoBack();
      } else if (e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
        lastHardwareNavAtRef.current = performance.now();
        handleGoForward();
      }
    };

    const onAuxClick = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "BrowserBack") {
        e.preventDefault();
        e.stopPropagation();
        lastHardwareNavAtRef.current = performance.now();
        handleGoBack();
        return;
      }
      if (e.key === "BrowserForward") {
        e.preventDefault();
        e.stopPropagation();
        lastHardwareNavAtRef.current = performance.now();
        handleGoForward();
        return;
      }
      if (
        e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        (e.key === "ArrowLeft" || e.key === "ArrowRight")
      ) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        lastHardwareNavAtRef.current = performance.now();
        if (e.key === "ArrowLeft") {
          handleGoBack();
        } else {
          handleGoForward();
        }
      }
    };

    const onPopState = () => {
      if (performance.now() - lastHardwareNavAtRef.current < 200) {
        ensureSentinel();
        return;
      }
      if (canStepMenuBack(menuHistoryRef.current)) {
        handleGoBack();
        ensureSentinel();
      }
    };

    window.addEventListener("mousedown", onMouseDown, { capture: true });
    window.addEventListener("mouseup", onMouseUp, { capture: true });
    window.addEventListener("auxclick", onAuxClick, { capture: true });
    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("mousedown", onMouseDown, { capture: true });
      window.removeEventListener("mouseup", onMouseUp, { capture: true });
      window.removeEventListener("auxclick", onAuxClick, { capture: true });
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("popstate", onPopState);
    };
  }, [currentUser, handleGoBack, handleGoForward]);

  const enrichedUserByMenu = React.useMemo(() => {
    const result = {} as Record<ErpMenuKey, any>;
    if (!currentUser) return result;
    const menuKeys = Object.keys(MENU_PERM_KEY_MAP) as ErpMenuKey[];
    for (const menuKey of menuKeys) {
      if (effectiveRoleCode === "ADMIN") {
        result[menuKey] = {
          ...currentUser,
          roleCode: effectiveRoleCode,
          canSave: true,
          canBill: true,
        };
        continue;
      }
      const permKey = MENU_PERM_KEY_MAP[menuKey];
      const found = rolePerms.find(
        (p) => p.roleCode === effectiveRoleCode && p.menuKey === permKey
      );
      result[menuKey] = {
        ...currentUser,
        roleCode: effectiveRoleCode,
        canSave: found ? Boolean(found.canSave) : false,
        canBill: found ? Boolean(found.canBill) : false,
      };
    }
    return result;
  }, [currentUser, effectiveRoleCode, rolePerms]);

  const enrichedUser = enrichedUserByMenu[activeMenu] || null;

  const toggleTheme = () => {
    const next: ErpThemeMode = theme === "light" ? "white" : "light";
    setTheme(next);
    try {
      localStorage.setItem("dragonrpa_erp_theme", next);
    } catch (e) {
      console.error("Failed to save theme:", e);
    }
  };

  const handleLogout = React.useCallback(async () => {
    try {
      localStorage.removeItem("dragonrpa_erp_user");
    } catch {}
    try {
      await fetch("/api/erp/auth/logout", { method: "POST" });
    } catch {}
    scrollSnapshotsRef.current = {};
    setMountedMenus([]);
    const init = createMenuHistory<ErpMenuKey, ErpCategoryKey>(
      "FINANCIAL_REPORT",
      "FINANCE"
    );
    menuHistoryRef.current = init;
    setMenuHistory(init);
    setCurrentUser(null);
  }, []);

  // 개인정보 보호법 안전성 확보조치: 30분 이상 미사용 시 자동 로그아웃
  useEffect(() => {
    if (!currentUser) return;
    const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
    let lastActivityAt = Date.now();
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const triggerIdleLogout = () => {
      void handleLogout();
    };

    const scheduleTimer = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(triggerIdleLogout, IDLE_TIMEOUT_MS);
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivityAt < 10000) return;
      lastActivityAt = now;
      scheduleTimer();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && Date.now() - lastActivityAt >= IDLE_TIMEOUT_MS) {
        triggerIdleLogout();
      }
    };

    scheduleTimer();
    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    for (const ev of events) {
      window.addEventListener(ev, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (timerId) clearTimeout(timerId);
      for (const ev of events) {
        window.removeEventListener(ev, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [currentUser, handleLogout]);

  const currentCategoryConfig =
    visibleCategories.find((c) => c.key === activeCategory) || visibleCategories[0] || CATEGORIES[0];
  const currentMenuItem =
    currentCategoryConfig?.items.find((i) => i.key === activeMenu) ||
    visibleCategories.flatMap((c) => c.items).find((i) => i.key === activeMenu);

  const canGoBack = canStepMenuBack(menuHistory);
  const canGoForward = canStepMenuForward(menuHistory);
  const prevEntry = getPrevMenuEntry(menuHistory);
  const nextEntry = getNextMenuEntry(menuHistory);
  const prevMenuLabel = prevEntry
    ? CATEGORIES.flatMap((c) => c.items).find((i) => i.key === prevEntry.menu)?.label
    : undefined;
  const nextMenuLabel = nextEntry
    ? CATEGORIES.flatMap((c) => c.items).find((i) => i.key === nextEntry.menu)?.label
    : undefined;

  return {
    currentUser,
    setCurrentUser,
    isInitialized,
    activeMenu,
    mountedMenus,
    paneRefs,
    targetWorkImprovementId,
    setTargetWorkImprovementId,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    showPasswordModal,
    setShowPasswordModal,
    theme,
    selectedEntity,
    setSelectedEntity,
    permsLoaded,
    showMenuPersonalizeModal,
    setShowMenuPersonalizeModal,
    menuPrefs,
    expandedGroups,
    toggleGroup,
    fetchRolePermissions,
    saveMenuPrefs,
    effectiveRoleCode,
    permittedCategories,
    visibleCategories,
    isMenuAllowed,
    navigateToMenu,
    handleGoBack,
    handleGoForward,
    enrichedUserByMenu,
    enrichedUser,
    toggleTheme,
    handleLogout,
    currentCategoryConfig,
    currentMenuItem,
    canGoBack,
    canGoForward,
    prevMenuLabel,
    nextMenuLabel,
  };
}
