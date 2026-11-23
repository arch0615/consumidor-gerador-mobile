/// <reference types="node" />
import fs from "fs";
import path from "path";
import { parseConfig } from "../env";

/** The committed environment templates must stay valid and internally consistent (API ↔ portal of the same environment). */
function readTemplate(name: string): Record<string, string> {
  const text = fs.readFileSync(path.resolve(__dirname, "../../..", name), "utf8");
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#") && line.includes("="))
      .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()])
  );
}

describe("environment templates", () => {
  it("homologation: homologation APIs with the homologation portal (cliente-test)", () => {
    const result = parseConfig(readTemplate(".env.homologation.example"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.authApiUrl).toMatch(/^https:\/\/api-acvel\.souaiv\.com\//);
    expect(result.config.consumidorAppUrl).toBe("https://cliente-test.appacvel.com.br");
    expect(result.config.termsUrl).toBe("https://cliente-test.appacvel.com.br/termos-de-uso-e-privacidade");
    expect(result.config.privacyUrl).toBe(result.config.termsUrl);
    expect(result.config.useMocks).toBe(false);
  });

  it("production: production APIs with the production portal (cliente)", () => {
    const result = parseConfig(readTemplate(".env.production.example"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.appEnv).toBe("production");
    expect(result.config.authApiUrl).toMatch(/^https:\/\/api\.appacvel\.com\.br\//);
    expect(result.config.consumidorAppUrl).toBe("https://cliente.appacvel.com.br");
    expect(result.config.termsUrl).toBe("https://cliente.appacvel.com.br/termos-de-uso-e-privacidade");
    expect(result.config.privacyUrl).toBe(result.config.termsUrl);
  });
});
