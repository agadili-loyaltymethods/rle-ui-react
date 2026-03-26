/**
 * Shared test fixtures for common entity shapes.
 * Use these as base objects and spread overrides as needed.
 */

export const testProgram = {
  _id: "prog-1",
  name: "Test Program",
  status: "active",
  description: "A test program",
  org: "testorg",
  division: "us",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

export const testMember = {
  _id: "mem-1",
  firstName: "John",
  lastName: "Doe",
  email: "john@test.com",
  status: "active",
  org: "testorg",
  program: "prog-1",
};

export const testLocation = {
  _id: "loc-1",
  name: "Test Location",
  city: "San Francisco",
  state: "CA",
  country: "US",
  status: "active",
};

export const testReward = {
  _id: "rew-1",
  name: "Test Reward",
  description: "A test reward",
  status: "active",
  pointsCost: 100,
  category: "general",
};

export const testUser = {
  _id: "user-1",
  login: "testorg/testuser",
  email: "test@test.com",
  org: "testorg",
  division: "us",
  role: "admin",
};
