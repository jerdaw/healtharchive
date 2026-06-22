# Public Boundary Stub

This public file intentionally contains only a safe summary.

Detailed operator procedures for this topic are environment-specific and are
maintained in the private operations workspace. Public documentation should
only describe the purpose, ownership boundary, and non-sensitive user impact.

Public scope:

- Explain what the feature or workflow is for.
- Keep methodology, limitations, local development, and contribution guidance public.
- Keep host topology, private access paths, service-unit definitions, credential
  locations, alert routes, exact commands, and restoration steps out of tracked
  public documentation.

## Browser Storage Boundary

The frontend may use browser local storage for non-sensitive display
preferences, such as theme selection and compare/diff highlighting options.
Do not store account identifiers, credentials, health records, submitted archive
content, operator notes, or production secrets in browser local storage,
session storage, or cookies unless a future reviewed design explicitly changes
this boundary.
