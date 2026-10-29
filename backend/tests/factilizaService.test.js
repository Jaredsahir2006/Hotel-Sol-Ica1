const assert = require("node:assert/strict");
const { test } = require("node:test");

const { consultarDni } = require("../services/factilizaService");

test("reports a rejected Factiliza token when the upstream returns an empty 401", async () => {
    const originalToken = process.env.FACTILIZA_TOKEN;
    const originalFetch = global.fetch;
    process.env.FACTILIZA_TOKEN = "test-token";
    let authorization;

    global.fetch = async (_url, options) => {
        authorization = options.headers.Authorization;
        return {
            status: 401,
            ok: false,
            headers: { get: () => null },
            text: async () => ""
        };
    };

    try {
        await assert.rejects(consultarDni("00000000"), (error) => {
            assert.equal(error.code, "AUTH_REJECTED");
            assert.match(error.publicMessage, /mismo token API/);
            return true;
        });
        assert.equal(authorization, "Bearer test-token");
    } finally {
        global.fetch = originalFetch;
        if (originalToken === undefined) {
            delete process.env.FACTILIZA_TOKEN;
        } else {
            process.env.FACTILIZA_TOKEN = originalToken;
        }
    }
});

test("returns data from a successful Factiliza JSON response", async () => {
    const originalToken = process.env.FACTILIZA_TOKEN;
    const originalFetch = global.fetch;
    process.env.FACTILIZA_TOKEN = "test-token";
    const data = { numero: "00000000", nombres: "TEST" };

    global.fetch = async () => ({
        status: 200,
        ok: true,
        text: async () => JSON.stringify({ success: true, data })
    });

    try {
        assert.deepEqual(await consultarDni("00000000"), data);
    } finally {
        global.fetch = originalFetch;
        if (originalToken === undefined) {
            delete process.env.FACTILIZA_TOKEN;
        } else {
            process.env.FACTILIZA_TOKEN = originalToken;
        }
    }
});

test("reports the status and content type when Factiliza returns non-JSON", async () => {
    const originalToken = process.env.FACTILIZA_TOKEN;
    const originalFetch = global.fetch;
    process.env.FACTILIZA_TOKEN = "test-token";

    global.fetch = async () => ({
        status: 403,
        ok: false,
        headers: { get: () => "text/html; charset=utf-8" },
        text: async () => "<html>Forbidden</html>"
    });

    try {
        await assert.rejects(consultarDni("00000000"), (error) => {
            assert.equal(error.code, "UPSTREAM_REJECTED");
            assert.match(error.publicMessage, /HTTP 403/);
            assert.match(error.publicMessage, /text\/html/);
            return true;
        });
    } finally {
        global.fetch = originalFetch;
        if (originalToken === undefined) {
            delete process.env.FACTILIZA_TOKEN;
        } else {
            process.env.FACTILIZA_TOKEN = originalToken;
        }
    }
});
