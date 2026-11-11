# Backend: off-chain report storage

Inspection reports are stored off-chain. Only their 32-byte hash is written to the blockchain
(the `reportHash` argument of `certifyInspection`). Anyone can re-hash a stored report to check it
was not changed.

Start it with `npm run backend` (default port 3001, change with `PORT=4000`). No extra dependencies.

## POST /reports

Uploads a report (any text or file bytes) and returns its sha256 hash as a `bytes32` hex string.

```bash
curl -X POST --data 'Inspection passed: battery 98%' http://localhost:3001/reports
# {"reportHash":"0x..."}
```

## GET /reports/:hash

Returns the stored report. Responds `404` if the hash is unknown or the stored file no longer matches it.

```bash
curl http://localhost:3001/reports/0x<hash>
```

## Notes
- Files are saved in `backend/storage/` (git-ignored).
- The hash is `sha256` of the raw bytes, so it can be recomputed with `sha256sum` and prefixed with `0x`.
