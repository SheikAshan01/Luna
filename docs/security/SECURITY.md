# LUNA AI Security Architecture & Policy

## 1. Zero Arbitrary Shell Execution
The Language Model is **never** permitted to generate or execute raw shell strings (`bash -c`, `cmd.exe /c`, `powershell.exe -Command`). 

All system operations pass through the **Action Registry**:
- Every action has an immutable definition (`action_id`, `schema`, `permission_level`, `timeout`).
- Inputs are strictly validated against strict Pydantic schemas.
- Application launches are restricted to the user-configurable allowlist (`ALLOWED_APPLICATIONS`).
- Workspace reading and deletion are restricted to allowlisted project folders (`ALLOWED_WORKSPACES`).

---

## 2. Four-Tier Permission Hierarchy

| Level | Risk Level | Examples | Policy |
| :--- | :--- | :--- | :--- |
| **READ_ONLY** | Zero Risk | `system.get_health`, `system.get_battery`, `files.search` | Auto-executed |
| **LOW_RISK** | Low Impact | `app.open` (Allowlisted), `system.capture_screenshot`, `pc.lock` | User-consented execution |
| **SENSITIVE** | Moderate Impact | `app.close` (Process termination) | Confirmation challenge token required |
| **DESTRUCTIVE** | High Impact | `files.delete`, `pc.shutdown`, `pc.restart` | Mandatory confirmation challenge token |

---

## 3. Cryptographic Confirmation Challenge Protocol
When an action marked `confirmation_required: true` is triggered without a valid token:
1. The backend generates a signed HMAC-SHA256 one-time token:
   $$\text{token} = \text{expires\_at} \,\|\, \text{action\_id} \,\|\, \text{HMAC}(\text{SECRET\_KEY}, \text{action\_id} : \text{params} : \text{expires\_at})$$
2. The Electron or Mobile frontend intercepts this response and displays the red/amber **Confirmation Challenge Modal**.
3. The user must explicitly inspect the parameters and click "Authorize & Proceed".
4. The backend verifies the HMAC signature, confirms expiration ($<300$ seconds), ensures exact parameter match, executes the action, and logs a tamper-evident audit entry.

---

## 4. Memory Sanitization & Anti-Leak Policy
LUNA's Persistent Memory engine enforces strict regex pattern guards:
- Any memory key or value containing patterns for `password`, `api_key`, `secret`, `bearer [token]`, or `private_key` is immediately rejected with a `SecurityViolation` exception.
- Conversational memory stores user preferences, project context, and personal notes only.

---

## 5. Device Authentication & Remote Control
- Devices are paired via temporary 6-digit alphanumeric codes (`LN-XXX-XXX`) that expire in 10 minutes.
- Paired Android devices receive a cryptographically signed JWT token with explicit claims.
- The desktop user can inspect active paired devices and immediately revoke tokens with one click.
