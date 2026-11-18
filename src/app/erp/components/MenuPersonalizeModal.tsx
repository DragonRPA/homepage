"use client";

import React from "react";
import {
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RotateCcw,
  X,
  Star,
} from "lucide-react";
import {
  CATEGORIES,
  CategoryConfig,
  ErpCategoryKey,
  ErpMenuKey,
  ErpMenuPrefs,
  MenuItem,
} from "../erpMenuConfig";

interface MenuPersonalizeModalProps {
  menuPrefs: ErpMenuPrefs;
  permittedCategories: CategoryConfig[];
  saveMenuPrefs: (nextPrefs: ErpMenuPrefs) => void;
  onClose: () => void;
}

export function MenuPersonalizeModal({
  menuPrefs,
  permittedCategories,
  saveMenuPrefs,
  onClose,
}: MenuPersonalizeModalProps) {
  const catOrder = menuPrefs.categoryOrder || [];
  const orderedPermittedCats = [...permittedCategories].sort((a, b) => {
    const ia = catOrder.indexOf(a.key);
    const ib = catOrder.indexOf(b.key);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const moveCategory = (catKey: ErpCategoryKey, dir: -1 | 1) => {
    const currentKeys = orderedPermittedCats.map((c) => c.key);
    const idx = currentKeys.indexOf(catKey);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= currentKeys.length) return;
    const nextKeys = [...currentKeys];
    const [moved] = nextKeys.splice(idx, 1);
    nextKeys.splice(targetIdx, 0, moved);
    saveMenuPrefs({
      ...menuPrefs,
      categoryOrder: nextKeys,
    });
  };

  const moveItem = (
    catKey: ErpCategoryKey,
    items: MenuItem[],
    itemKey: ErpMenuKey,
    dir: -1 | 1
  ) => {
    const currentKeys = items.map((i) => i.key);
    const idx = currentKeys.indexOf(itemKey);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= currentKeys.length) return;
    const nextKeys = [...currentKeys];
    const [moved] = nextKeys.splice(idx, 1);
    nextKeys.splice(targetIdx, 0, moved);
    saveMenuPrefs({
      ...menuPrefs,
      itemOrder: {
        ...menuPrefs.itemOrder,
        [catKey]: nextKeys,
      },
    });
  };

  const toggleHideMenu = (itemKey: ErpMenuKey) => {
    const isHidden = menuPrefs.hiddenMenus.includes(itemKey);
    const nextHidden = isHidden
      ? menuPrefs.hiddenMenus.filter((k) => k !== itemKey)
      : [...menuPrefs.hiddenMenus, itemKey];
    saveMenuPrefs({
      ...menuPrefs,
      hiddenMenus: nextHidden,
    });
  };

  const toggleDefaultMenu = (itemKey: ErpMenuKey) => {
    saveMenuPrefs({
      ...menuPrefs,
      defaultMenu: menuPrefs.defaultMenu === itemKey ? undefined : itemKey,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#ebe5d8] dark:bg-slate-900 border-2 border-[#b5a894] dark:border-slate-700 rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden text-[#0f172a] dark:text-slate-100">
        <div className="px-4 py-3 border-b border-[#b5a894] dark:border-slate-800 bg-[#dfd7c7] dark:bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <span className="text-xs font-bold">메뉴 개인화 설정</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {orderedPermittedCats.map((cat, catIdx) => {
            const customItemOrder = menuPrefs.itemOrder?.[cat.key] || [];
            const sortedAllItems = [...cat.items].sort((a, b) => {
              const ia = customItemOrder.indexOf(a.key);
              const ib = customItemOrder.indexOf(b.key);
              return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
            });
            const GroupIcon = cat.icon;

            return (
              <div
                key={cat.key}
                className="rounded border border-[#b5a894] dark:border-slate-800 bg-[#f4efe4] dark:bg-slate-950 overflow-hidden"
              >
                <div className="px-3 py-2 bg-[#ded6c5] dark:bg-slate-900 border-b border-[#b5a894] dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold">
                    <GroupIcon className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                    <span>{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={catIdx === 0}
                      onClick={() => moveCategory(cat.key, -1)}
                      className="p-1 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 disabled:opacity-30 hover:bg-[#d0c6b4]"
                      title="그룹 위로 이동"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={catIdx === orderedPermittedCats.length - 1}
                      onClick={() => moveCategory(cat.key, 1)}
                      className="p-1 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 disabled:opacity-30 hover:bg-[#d0c6b4]"
                      title="그룹 아래로 이동"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-[#d0c6b4] dark:divide-slate-800">
                  {sortedAllItems.map((item, itemIdx) => {
                    const ItemIcon = item.icon;
                    const isHidden = menuPrefs.hiddenMenus.includes(item.key);
                    const isDefault = menuPrefs.defaultMenu === item.key;

                    return (
                      <div
                        key={item.key}
                        className={`px-3 py-2 flex items-center justify-between gap-2 ${
                          isHidden ? "opacity-45 bg-black/5 dark:bg-white/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ItemIcon className="w-3.5 h-3.5 shrink-0 text-[#475569] dark:text-slate-400" />
                          <span className={`truncate font-medium ${isHidden ? "line-through" : ""}`}>
                            {item.label}
                          </span>
                          {isDefault && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              시작메뉴
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleDefaultMenu(item.key)}
                            className={`px-1.5 py-1 rounded border text-[10px] font-bold flex items-center gap-1 ${
                              isDefault
                                ? "bg-amber-500 text-white border-amber-600"
                                : "bg-[#ebe5d8] dark:bg-slate-800 border-[#b5a894] dark:border-slate-700 opacity-75 hover:opacity-100"
                            }`}
                            title="로그인 시 기본 시작 메뉴 지정"
                          >
                            <Star className="w-3 h-3" />
                            <span>시작</span>
                          </button>

                          <button
                            type="button"
                            disabled={itemIdx === 0}
                            onClick={() => moveItem(cat.key, sortedAllItems, item.key, -1)}
                            className="p-1 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 disabled:opacity-30 hover:bg-[#d0c6b4]"
                            title="메뉴 위로 이동"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={itemIdx === sortedAllItems.length - 1}
                            onClick={() => moveItem(cat.key, sortedAllItems, item.key, 1)}
                            className="p-1 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 disabled:opacity-30 hover:bg-[#d0c6b4]"
                            title="메뉴 아래로 이동"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleHideMenu(item.key)}
                            className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 ${
                              isHidden
                                ? "bg-rose-600 text-white border-rose-700"
                                : "bg-[#ebe5d8] dark:bg-slate-800 border-[#b5a894] dark:border-slate-700 hover:bg-[#d0c6b4]"
                            }`}
                            title={isHidden ? "메뉴 표시" : "메뉴 숨김"}
                          >
                            {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{isHidden ? "숨김" : "표시"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-[#b5a894] dark:border-slate-800 bg-[#dfd7c7] dark:bg-slate-950 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              saveMenuPrefs({
                categoryOrder: CATEGORIES.map((c) => c.key),
                itemOrder: {},
                hiddenMenus: [],
                defaultMenu: undefined,
              });
            }}
            className="px-3 py-1.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 text-xs font-bold flex items-center gap-1.5 hover:bg-[#d0c6b4]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>초기화</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
