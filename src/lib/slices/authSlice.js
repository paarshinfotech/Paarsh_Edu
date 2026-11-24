import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  adminAccessToken: null,
  adminRefreshToken: null,
  admin: null,
  userRole: null,
  isAdminAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAdminAuthData(state, action) {
      const accessToken = action.payload.adminAccessToken || action.payload.admin_access_token;
      const refreshToken = action.payload.adminRefreshToken || action.payload.admin_refresh_token;
      const admin = action.payload.admin || action.payload.user;
      const userRole = action.payload.userRole || action.payload.role;

      state.adminAccessToken = accessToken;
      state.adminRefreshToken = refreshToken;
      state.admin = admin;
      state.userRole = userRole;
      state.isAdminAuthenticated = Boolean(accessToken);
      state.error = null;

      if (typeof window !== "undefined" && accessToken) {
        localStorage.setItem("admin_access_token", accessToken);
        if (refreshToken) {
          localStorage.setItem("admin_refresh_token", refreshToken);
        }
      }
    },
    updateAdminTokens(state, action) {
      const accessToken =
        action.payload.adminAccessToken ||
        action.payload.admin_access_token ||
        action.payload.accessToken;
      const refreshToken =
        action.payload.adminRefreshToken ||
        action.payload.admin_refresh_token ||
        action.payload.refreshToken;

      state.adminAccessToken = accessToken;
      state.adminRefreshToken = refreshToken;

      if (typeof window !== "undefined" && accessToken) {
        localStorage.setItem("admin_access_token", accessToken);
        if (refreshToken) {
          localStorage.setItem("admin_refresh_token", refreshToken);
        }
      }
    },
    logoutAdmin(state) {
      state.adminAccessToken = null;
      state.adminRefreshToken = null;
      state.admin = null;
      state.userRole = null;
      state.isAdminAuthenticated = false;
      state.loading = false;
      state.error = null;

      if (typeof window !== "undefined") {
        localStorage.removeItem("admin_access_token");
        localStorage.removeItem("admin_refresh_token");
      }
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },
    initializeAdminAuth(state) {
      if (typeof window !== "undefined") {
        const adminAccessToken = localStorage.getItem("admin_access_token");
        const adminRefreshToken = localStorage.getItem("admin_refresh_token");
        if (adminAccessToken && adminRefreshToken) {
          state.adminAccessToken = adminAccessToken;
          state.adminRefreshToken = adminRefreshToken;
          state.isAdminAuthenticated = true;
        }
      }
    },
  },
});

export const {
  setAdminAuthData,
  updateAdminTokens,
  logoutAdmin,
  setLoading,
  setError,
  initializeAdminAuth,
} = authSlice.actions;

export default authSlice.reducer;