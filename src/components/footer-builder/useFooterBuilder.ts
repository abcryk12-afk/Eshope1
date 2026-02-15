"use client";

import { useCallback, useMemo } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  resetFooterLayout,
  setFooterLayout,
  type FooterLayout,
} from "@/store/footerSlice";
import { getFooterTemplateById } from "@/lib/footerTemplates";

export function useFooterBuilder() {
  const dispatch = useAppDispatch();
  const layout = useAppSelector((s) => s.footer.layout);
  const updatedAt = useAppSelector((s) => s.footer.updatedAt);

  const setLayout = useCallback(
    (next: FooterLayout) => {
      dispatch(setFooterLayout(next));
    },
    [dispatch]
  );

  const reset = useCallback(() => {
    dispatch(resetFooterLayout());
    dispatch(setFooterLayout(getFooterTemplateById("classic-4col")));
  }, [dispatch]);

  return useMemo(
    () => ({ layout, updatedAt, setLayout, reset }),
    [layout, reset, setLayout, updatedAt]
  );
}
