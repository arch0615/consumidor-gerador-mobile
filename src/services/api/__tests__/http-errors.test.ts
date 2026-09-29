import { apiErrorFromResponse } from "../http-errors";

describe("apiErrorFromResponse", () => {
  it("maps the canonical envelope code and keeps business messages", () => {
    const error = apiErrorFromResponse(422, { error: { code: "INVALID_CURRENT_PASSWORD", message: "Senha atual incorreta.", details: null, requestId: "req-1" } }, null);
    expect(error.code).toBe("INVALID_CREDENTIALS");
    expect(error.message).toBe("Senha atual incorreta.");
    expect(error.requestId).toBe("req-1");
  });

  it("maps account problems on /auth/me", () => {
    expect(apiErrorFromResponse(403, { error: { code: "ACCOUNT_NOT_PROVISIONED", message: "x", requestId: "r" } }, null).code).toBe("ACCOUNT_NOT_PROVISIONED");
    expect(apiErrorFromResponse(403, { error: { code: "PLATFORM_FORBIDDEN", message: "x", requestId: "r" } }, null).code).toBe("ACCOUNT_NOT_PROVISIONED");
    expect(apiErrorFromResponse(403, { error: { code: "ACCOUNT_SUSPENDED", message: "x", requestId: "r" } }, null).code).toBe("ACCOUNT_BLOCKED");
  });

  it("uses legacy NestJS messages for business-rule errors", () => {
    const error = apiErrorFromResponse(400, { statusCode: 400, message: ["numero_uc must be a string", "cep inválido"], error: "Bad Request" }, "req-2");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("numero_uc must be a string. cep inválido");
    expect(error.requestId).toBe("req-2");
  });

  it("never exposes backend text on 5xx", () => {
    const error = apiErrorFromResponse(500, { message: "PrismaClientKnownRequestError: relation does not exist" }, null);
    expect(error.code).toBe("SERVICE_UNAVAILABLE");
    expect(error.message).not.toMatch(/Prisma/);
    expect(error.isTransient).toBe(true);
  });

  it("drops technical-looking 4xx messages", () => {
    const error = apiErrorFromResponse(409, { message: "<html><body>Conflict</body></html>" }, null);
    expect(error.code).toBe("CONFLICT");
    expect(error.message).not.toMatch(/html/);
  });

  it("uses our own copy for 401/403/404 without envelope", () => {
    expect(apiErrorFromResponse(401, null, null).code).toBe("AUTH_TOKEN_EXPIRED");
    expect(apiErrorFromResponse(403, { message: "Forbidden resource" }, null).message).toBe("Seu perfil não tem permissão para acessar esta informação.");
    expect(apiErrorFromResponse(404, null, null).code).toBe("RESOURCE_NOT_FOUND");
  });
});
