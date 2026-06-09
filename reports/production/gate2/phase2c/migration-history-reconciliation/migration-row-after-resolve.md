# migration row after resolve
command: psql read-only SELECT (DATABASE_URL redacted)

```
          migration_name           |                             checksum                             | finished | rolled_back | applied_steps_count 
-----------------------------------+------------------------------------------------------------------+----------+-------------+---------------------
 20260509210000_add_dream_response | f46abdc1e979e89c63b48034f1a6dc33111bbdd98459b07a3fa52be9ba3120f8 | t        | f           |                   0
(1 row)


exit_code: 0
```
