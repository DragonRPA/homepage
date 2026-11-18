/**
 * ERP 메뉴 방문 이력(이전/다음 이동) 순수 상태 머신 SSOT
 */

export interface MenuHistoryEntry<M extends string = string, C extends string = string> {
  menu: M;
  category: C;
}

export interface MenuHistoryState<M extends string = string, C extends string = string> {
  entries: MenuHistoryEntry<M, C>[];
  index: number;
}

export const MAX_MENU_HISTORY = 50;

export function createMenuHistory<M extends string, C extends string>(
  menu: M,
  category: C
): MenuHistoryState<M, C> {
  return {
    entries: [{ menu, category }],
    index: 0,
  };
}

export function pushMenuHistory<M extends string, C extends string>(
  state: MenuHistoryState<M, C>,
  menu: M,
  category: C
): MenuHistoryState<M, C> {
  const current = state.entries[state.index];
  if (current && current.menu === menu) {
    if (current.category === category) {
      return state;
    }
    const updatedEntries = state.entries.map((entry, idx) =>
      idx === state.index ? { menu, category } : entry
    );
    return {
      entries: updatedEntries,
      index: state.index,
    };
  }

  const baseEntries = state.entries.slice(0, Math.max(0, state.index + 1));
  baseEntries.push({ menu, category });

  const trimmedEntries =
    baseEntries.length > MAX_MENU_HISTORY
      ? baseEntries.slice(baseEntries.length - MAX_MENU_HISTORY)
      : baseEntries;

  return {
    entries: trimmedEntries,
    index: trimmedEntries.length - 1,
  };
}

export function stepMenuHistoryBack<M extends string, C extends string>(
  state: MenuHistoryState<M, C>
): MenuHistoryState<M, C> {
  if (state.index <= 0) {
    return state;
  }
  return {
    entries: state.entries,
    index: state.index - 1,
  };
}

export function stepMenuHistoryForward<M extends string, C extends string>(
  state: MenuHistoryState<M, C>
): MenuHistoryState<M, C> {
  if (state.index >= state.entries.length - 1) {
    return state;
  }
  return {
    entries: state.entries,
    index: state.index + 1,
  };
}

export function pruneMenuHistoryByAllowed<M extends string, C extends string>(
  state: MenuHistoryState<M, C>,
  allowedMenus: ReadonlySet<M>,
  fallback: MenuHistoryEntry<M, C>
): MenuHistoryState<M, C> {
  const nextEntries: MenuHistoryEntry<M, C>[] = [];
  let mappedIndex = -1;

  for (let i = 0; i < state.entries.length; i++) {
    const entry = state.entries[i];
    if (!allowedMenus.has(entry.menu)) {
      continue;
    }
    const prev = nextEntries[nextEntries.length - 1];
    if (!prev || prev.menu !== entry.menu) {
      nextEntries.push(entry);
    } else if (i === state.index && prev.category !== entry.category) {
      nextEntries[nextEntries.length - 1] = entry;
    }
    if (i <= state.index) {
      mappedIndex = nextEntries.length - 1;
    }
  }

  if (nextEntries.length === 0) {
    if (
      state.entries.length === 1 &&
      state.index === 0 &&
      state.entries[0].menu === fallback.menu &&
      state.entries[0].category === fallback.category
    ) {
      return state;
    }
    return createMenuHistory(fallback.menu, fallback.category);
  }

  const nextIndex = Math.max(0, Math.min(mappedIndex, nextEntries.length - 1));

  if (
    nextIndex === state.index &&
    nextEntries.length === state.entries.length &&
    nextEntries.every(
      (item, idx) =>
        item.menu === state.entries[idx].menu &&
        item.category === state.entries[idx].category
    )
  ) {
    return state;
  }

  return {
    entries: nextEntries,
    index: nextIndex,
  };
}

export function canStepMenuBack<M extends string, C extends string>(
  state: MenuHistoryState<M, C>
): boolean {
  return state.index > 0;
}

export function canStepMenuForward<M extends string, C extends string>(
  state: MenuHistoryState<M, C>
): boolean {
  return state.index < state.entries.length - 1;
}

export function getPrevMenuEntry<M extends string, C extends string>(
  state: MenuHistoryState<M, C>
): MenuHistoryEntry<M, C> | null {
  return state.index > 0 ? state.entries[state.index - 1] : null;
}

export function getNextMenuEntry<M extends string, C extends string>(
  state: MenuHistoryState<M, C>
): MenuHistoryEntry<M, C> | null {
  return state.index < state.entries.length - 1
    ? state.entries[state.index + 1]
    : null;
}
