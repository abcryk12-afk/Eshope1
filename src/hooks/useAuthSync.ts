"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

import { useAppDispatch } from "@/store/hooks";
import { setUser } from "@/store/slices/authSlice";

export function useAuthSync() {
  const dispatch = useAppDispatch();
  const { data } = useSession();

  useEffect(() => {
    const user = data?.user;

    if (!user?.id || !user.role) {
      dispatch(setUser(null));
      return;
    }

    dispatch(
      setUser({
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
      })
    );
  }, [data?.user, dispatch]);
}
