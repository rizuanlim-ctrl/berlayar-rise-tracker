# Tracker maintenance

## Identify the current project

This repository is rizuanlim-ctrl/berlayar-rise-tracker. Production is https://berlayar-rise-tracker.vercel.app. Vercel project ID: prj_Vz9jhn1CfJwA6B0VXB8I1xwzU8f6. Confirm these against the current authenticated project and deployment before publishing.

## Vercel scope troubleshooting

On 19 October 2026, explicitly passing teamId team_5ScSa1LVzBHmUF1cT6tvtTpY caused 403 Forbidden, while the authenticated default account successfully resolved the exact project and deployment. Do not interpret that error alone as a disconnected account or ask the owner to repeatedly reconnect.

First inspect the authenticated account, its default team, and this exact project without an explicit team parameter. Use that route only when the returned identity and project ownership match this tracker. If they do not match, stop and resolve the target; never deploy to a different account or project. Authentication and authorization checks remain mandatory.

Production is Git-connected. Read and update the current GitHub main source with blob-SHA conflict protection. An unavailable Vercel deployment file tree does not mean source is missing: inspect deployment Git metadata and use this repository. Do not redeploy an old scratch checkout or the earlier Sites version over the current production tracker.

## Quota updates and data preservation

Read the current supplied image and current tracker source. Verify room type and blocks; ask for missing block attribution rather than guessing. Use the source date as the date recorded, not an assumed HDB publication date. Official three-room opening quotas supplied on 19 October 2026 apply to 200A and 201B only: Malay 19, Chinese 72, Indian / Other 10 for each block. 204A has no three-room units.

Match existing quota wording, update source notes and translations, and remove obsolete estimate presentation for confirmed figures. Preserve two-room and four-room values unless separately requested.

Never reset community booking records, user shortlists, localStorage or IndexedDB keys, recovery links, database state, or API persistence for a quota-only change. Retain existing saved quota overrides and missing-ethnicity handling unless explicitly requested otherwise.

## Verify before reporting completion

Check JavaScript syntax and all changed quota values. Check remaining-quota calculations, missing ethnicity, and block applicability. After committing, confirm Vercel production READY for that exact commit and verify the public production asset matches the tested source. A successful source write alone is not evidence the change is live. Report precisely what changed and any unresolved issue.
