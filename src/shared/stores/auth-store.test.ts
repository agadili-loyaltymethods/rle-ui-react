import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore, type AuthUser } from "./auth-store";

const testUser: AuthUser = {
  id: "u1",
  login: "gap/tester",
  email: "tester@example.com",
  org: "gap",
  division: "us",
};

describe("auth-store", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });

  it("has correct initial state when sessionStorage is empty", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  describe("login", () => {
    it("sets token, user, and isAuthenticated", () => {
      useAuthStore.getState().login("jwt-token-123", testUser);

      const state = useAuthStore.getState();
      expect(state.token).toBe("jwt-token-123");
      expect(state.user).toEqual(testUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it("persists token and user to sessionStorage", () => {
      useAuthStore.getState().login("jwt-token-123", testUser);

      expect(sessionStorage.getItem("rcx.auth.token")).toBe("jwt-token-123");
      expect(JSON.parse(sessionStorage.getItem("rcx.auth.user")!)).toEqual(testUser);
    });
  });

  describe("logout", () => {
    it("clears token, user, and isAuthenticated", () => {
      useAuthStore.getState().login("jwt-token-123", testUser);
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it("removes token and user from sessionStorage", () => {
      useAuthStore.getState().login("jwt-token-123", testUser);
      useAuthStore.getState().logout();

      expect(sessionStorage.getItem("rcx.auth.token")).toBeNull();
      expect(sessionStorage.getItem("rcx.auth.user")).toBeNull();
    });
  });

  describe("setUser", () => {
    it("updates user without affecting token or isAuthenticated", () => {
      useAuthStore.getState().login("jwt-token-123", testUser);

      const updatedUser: AuthUser = { ...testUser, empName: "Test Employee" };
      useAuthStore.getState().setUser(updatedUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(updatedUser);
      expect(state.token).toBe("jwt-token-123");
      expect(state.isAuthenticated).toBe(true);
    });

    it("persists updated user to sessionStorage", () => {
      useAuthStore.getState().login("jwt-token-123", testUser);

      const updatedUser: AuthUser = { ...testUser, empName: "Updated" };
      useAuthStore.getState().setUser(updatedUser);

      expect(JSON.parse(sessionStorage.getItem("rcx.auth.user")!)).toEqual(updatedUser);
    });
  });
});
