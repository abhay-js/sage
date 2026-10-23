# Admin athlete levels and challenge eligibility

Admin → Athletes implements the supplied athlete list design with search, level filters, workout and distance totals, export, level assignment, and workout review navigation. Admin → Challenges implements race selection, saved eligibility, an editable eligibility preview, and eligibility counts for enrolled athletes.

Unassigned athletes show as Under Review. Level 1 represents experienced athletes; Level 2 represents developing athletes. Existing athletes are not automatically assigned a level. Participant eligibility is derived from the athlete's assigned level and the challenge's saved eligible levels. These settings classify participants for admin review; they do not remove existing entries or change enrollment rules or scores.

Existing membership, referral, sync, race creation and training-tip tools remain available through the management links. The new screens are in the admin routing group; there are no controls in athlete Profile.

The migration `20261008121827_admin_athlete_levels.sql` was applied transactionally to `zkznmylxdbjqhxclhkjn` on 2026-10-08. Level and eligibility writes use RPCs that check the trusted database admin role. Athletes cannot grant themselves a level through direct table writes or invoke admin RPCs. Local PGlite tests verify these restrictions, input validation, assignment persistence, and unassigned state. Live read-only tests verify admin listing and athlete access denial.
