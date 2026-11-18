"use client";

import { useEffect, useRef } from "react";

export type MasterDataDomain =
  | "partners"
  | "employees"
  | "assets"
  | "products"
  | "accounts"
  | "custom_roles";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const masterCache = new Map<string, CacheEntry<any>>();
const inFlightPromises = new Map<string, Promise<any>>();

const DEFAULT_TTL_MS = 45 * 1000; // 45초 캐시 유지

const EVENT_NAME = "dragonrpa_erp_master_data_invalidated";

/**
 * 중복 API 네트워크 호출을 방지하고 결과를 메모리에 일정 시간 캐싱하는 유틸
 */
export async function fetchCachedMasterData<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: { force?: boolean; ttlMs?: number }
): Promise<T> {
  const now = Date.now();
  const ttl = options?.ttlMs ?? DEFAULT_TTL_MS;

  if (!options?.force) {
    const cached = masterCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
    const inFlight = inFlightPromises.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  }

  const promise = fetcher()
    .then((data) => {
      masterCache.set(cacheKey, { data, expiresAt: Date.now() + ttl });
      inFlightPromises.delete(cacheKey);
      return data;
    })
    .catch((err) => {
      inFlightPromises.delete(cacheKey);
      throw err;
    });

  inFlightPromises.set(cacheKey, promise);
  return promise;
}

/**
 * 마스터 데이터 변경 시 캐시를 무효화하고 구독 중인 모든 탭에 변경 이벤트를 발행
 */
export function invalidateMasterData(
  domains: MasterDataDomain | MasterDataDomain[]
): void {
  const domainList = Array.isArray(domains) ? domains : [domains];

  for (const domain of domainList) {
    // 캐시 키에서 해당 도메인 관련 항목 제거
    for (const key of masterCache.keys()) {
      if (key.startsWith(domain) || key.includes(`/${domain}`)) {
        masterCache.delete(key);
      }
    }
    for (const key of inFlightPromises.keys()) {
      if (key.startsWith(domain) || key.includes(`/${domain}`)) {
        inFlightPromises.delete(key);
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, { detail: { domain } })
      );
    }
  }
}

/**
 * 마스터 데이터 무효화 이벤트 리스너 등록 (클린업 함수 반환)
 */
export function onMasterDataInvalidated(
  domain: MasterDataDomain | "*",
  callback: (invalidatedDomain: MasterDataDomain) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const customEvt = event as CustomEvent<{ domain: MasterDataDomain }>;
    const targetDomain = customEvt.detail?.domain;
    if (domain === "*" || domain === targetDomain) {
      callback(targetDomain);
    }
  };

  window.addEventListener(EVENT_NAME, handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
  };
}

/**
 * Keep-Alive 탭 간 데이터 자동 최신화를 위한 React 훅
 * - 탭이 활성화(isActive=true) 상태에서 데이터가 변경되면 즉시 onRefresh() 실행
 * - 탭이 비활성화(isActive=false) 상태에서 변경되면 dirty 플래그 설정 후, 다시 탭으로 복귀(isActive=true)할 때 1회 자동 실행
 */
export function useMasterDataSync(
  domains: MasterDataDomain | MasterDataDomain[],
  onRefresh: () => void,
  isActive = true
): void {
  const isDirtyRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const domainList = Array.isArray(domains) ? domains : [domains];

  useEffect(() => {
    const unsubscribes = domainList.map((domain) =>
      onMasterDataInvalidated(domain, () => {
        if (isActive) {
          onRefreshRef.current();
        } else {
          isDirtyRef.current = true;
        }
      })
    );

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [isActive, domainList.join(",")]);

  useEffect(() => {
    if (isActive && isDirtyRef.current) {
      isDirtyRef.current = false;
      onRefreshRef.current();
    }
  }, [isActive]);
}
