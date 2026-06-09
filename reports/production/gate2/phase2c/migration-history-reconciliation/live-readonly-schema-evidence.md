# Live read-only DreamResponse schema evidence
command: psql read-only SELECT catalog queries (DATABASE_URL redacted)

## migration_row

```
 migration_name | checksum | finished | rolled_back | applied_steps_count 
----------------+----------+----------+-------------+---------------------
(0 rows)


exit_code: 0
```

## dream_response_enums

```
         enum_name         |      enumlabel       | enumsortorder 
---------------------------+----------------------+---------------
 DreamResponseProviderType | VENDOR               |             1
 DreamResponseProviderType | VENUE                |             2
 DreamResponseStatus       | OPEN                 |             1
 DreamResponseStatus       | VIEWED               |             2
 DreamResponseStatus       | INTERESTED           |             3
 DreamResponseStatus       | ARCHIVED             |             4
 DreamResponseType         | IDEAS                |             1
 DreamResponseType         | ROUGH_PRICING        |             2
 DreamResponseType         | PACKAGE_SUGGESTION   |             3
 DreamResponseType         | VENUE_RECOMMENDATION |             4
(10 rows)


exit_code: 0
```

## dream_response_columns

```
    column_name    |          data_type          |         udt_name          | is_nullable |        column_default         | character_maximum_length 
-------------------+-----------------------------+---------------------------+-------------+-------------------------------+--------------------------
 id                | text                        | text                      | NO          |                               |                         
 createdAt         | timestamp without time zone | timestamp                 | NO          | CURRENT_TIMESTAMP             |                         
 updatedAt         | timestamp without time zone | timestamp                 | NO          |                               |                         
 eventId           | text                        | text                      | NO          |                               |                         
 providerOrgId     | text                        | text                      | NO          |                               |                         
 providerType      | USER-DEFINED                | DreamResponseProviderType | NO          |                               |                         
 status            | USER-DEFINED                | DreamResponseStatus       | NO          | 'OPEN'::"DreamResponseStatus" |                         
 responseType      | USER-DEFINED                | DreamResponseType         | NO          |                               |                         
 message           | text                        | text                      | NO          |                               |                         
 roughPriceMin     | integer                     | int4                      | YES         |                               |                         
 roughPriceMax     | integer                     | int4                      | YES         |                               |                         
 currency          | character varying           | varchar                   | YES         | 'USD'::character varying      |                        3
 preferredNextStep | text                        | text                      | YES         |                               |                         
 createdByUserId   | text                        | text                      | NO          |                               |                         
 viewedAt          | timestamp without time zone | timestamp                 | YES         |                               |                         
 interestedAt      | timestamp without time zone | timestamp                 | YES         |                               |                         
 archivedAt        | timestamp without time zone | timestamp                 | YES         |                               |                         
(17 rows)


exit_code: 0
```

## dream_response_constraints

```
              conname               | contype |                                           definition                                            
------------------------------------+---------+-------------------------------------------------------------------------------------------------
 DreamResponse_createdByUserId_fkey | f       | FOREIGN KEY ("createdByUserId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE
 DreamResponse_eventId_fkey         | f       | FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON UPDATE CASCADE ON DELETE CASCADE
 DreamResponse_pkey                 | p       | PRIMARY KEY (id)
 DreamResponse_providerOrgId_fkey   | f       | FOREIGN KEY ("providerOrgId") REFERENCES "Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE
(4 rows)


exit_code: 0
```

## dream_response_indexes

```
                 indexname                 |                                                           indexdef                                                            
-------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------
 DreamResponse_eventId_createdAt_idx       | CREATE INDEX "DreamResponse_eventId_createdAt_idx" ON public."DreamResponse" USING btree ("eventId", "createdAt")
 DreamResponse_pkey                        | CREATE UNIQUE INDEX "DreamResponse_pkey" ON public."DreamResponse" USING btree (id)
 DreamResponse_providerOrgId_createdAt_idx | CREATE INDEX "DreamResponse_providerOrgId_createdAt_idx" ON public."DreamResponse" USING btree ("providerOrgId", "createdAt")
 DreamResponse_status_createdAt_idx        | CREATE INDEX "DreamResponse_status_createdAt_idx" ON public."DreamResponse" USING btree (status, "createdAt")
(4 rows)


exit_code: 0
```

