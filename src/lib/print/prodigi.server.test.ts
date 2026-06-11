import { describe, it, expect, afterEach } from "vitest";
import { buildIntakeAsset, getProdigiConfig } from "./prodigi.server";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env.ORCHESTRATOR_API_TOKEN = ORIGINAL_ENV.ORCHESTRATOR_API_TOKEN;
  process.env.PRODIGI_ORCHESTRATOR_URL = ORIGINAL_ENV.PRODIGI_ORCHESTRATOR_URL;
});

describe("buildIntakeAsset", () => {
  it("emits the orchestrator's explicit-assets shape", () => {
    expect(buildIntakeAsset("Wimbledon Champions (Women's)", "A.pdf", "drive-file-id")).toEqual({
      section: "Tennis Majors",
      designName: "Wimbledon Champions (Women's)",
      filename: "A.pdf",
      googleDriveFileId: "drive-file-id",
    });
  });
});

describe("getProdigiConfig", () => {
  it("is null without a token (intake degrades to skipped)", () => {
    delete process.env.ORCHESTRATOR_API_TOKEN;
    expect(getProdigiConfig()).toBeNull();
  });

  it("defaults the base URL and strips trailing slashes from overrides", () => {
    process.env.ORCHESTRATOR_API_TOKEN = "test-token";
    delete process.env.PRODIGI_ORCHESTRATOR_URL;
    expect(getProdigiConfig()).toEqual({
      baseUrl: "https://etsy-prodigi-bridge.vercel.app",
      token: "test-token",
    });

    process.env.PRODIGI_ORCHESTRATOR_URL = "http://localhost:3100/";
    expect(getProdigiConfig()?.baseUrl).toBe("http://localhost:3100");
  });
});
