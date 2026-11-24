"use client";

import { useEffect, useState } from "react";
import {usePathname, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { selectRootState } from "@/lib/store";
import { useSelector } from "react-redux";
import axios from "axios";

export default function AdminProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState<boolean | null>(
    pathname === "/admin/signin" ? true : false
  );

 
  const adminAuth = useSelector((state) => selectRootState(state).auth);

  useEffect(() => {
  
     if (pathname === "/admin/signin") {
      setAuthenticated(true);
      return;
    }

    const token = localStorage.getItem("admin_access_token");
    if (!token || token === "undefined" || token === "null") {
      localStorage.removeItem("admin_access_token");
      localStorage.removeItem("admin_refresh_token");
      router.replace("/admin/signin");
      return;
    }

    const verifyRole = async () => {
      try {
        const res = await axios.get("/api/admin/loginuser", {
          headers: {
            "admin-authorization": `Bearer ${token}`,
          },
        });

        const { success, role } = res.data;

        if (success && role === "admin") {
          setAuthenticated(true);
        } else {
          router.replace("/error");
        }
      } catch (err: any) {
        if (err?.response?.status === 401) {
          // Attempt silent token refresh before giving up
          const refreshToken = localStorage.getItem("admin_refresh_token");
          if (refreshToken && refreshToken !== "undefined" && refreshToken !== "null") {
            try {
              const refreshRes = await axios.post("/api/admin/refreshtoken", { refreshToken });
              const newAccessToken =
                refreshRes.data?.data?.accessToken ||
                refreshRes.data?.data?.admin_access_token;
              const newRefreshToken =
                refreshRes.data?.data?.refreshToken ||
                refreshRes.data?.data?.admin_refresh_token;

              if (newAccessToken) {
                localStorage.setItem("admin_access_token", newAccessToken);
                if (newRefreshToken) {
                  localStorage.setItem("admin_refresh_token", newRefreshToken);
                }

                // Retry verification with new token
                const retryRes = await axios.get("/api/admin/loginuser", {
                  headers: {
                    "admin-authorization": `Bearer ${newAccessToken}`,
                  },
                });

                if (retryRes.data?.success && retryRes.data?.role === "admin") {
                  setAuthenticated(true);
                  return;
                }
              }
            } catch (refreshErr) {
              console.warn("Token refresh failed in AdminProtectedRoute:", refreshErr);
            }
          }

          localStorage.removeItem("admin_access_token");
          localStorage.removeItem("admin_refresh_token");
          router.replace("/admin/signin");
        } else {
          // Non-401 errors (e.g. temporary network glitch or server reboot): do NOT clear tokens
          console.error("Role verification network/server error:", err);
        }
      }
    };
     
    verifyRole();
  }, [pathname]);

  if (!authenticated) return null;

  return <>{children}</>;
}