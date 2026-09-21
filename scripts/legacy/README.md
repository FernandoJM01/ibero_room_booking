# Legacy one-off scripts

Patch scripts that were run once during development to refactor the frontend
(sidebar, PJAX router, tables, etc.). The changes they made are **already
applied** to the codebase. They are kept for historical reference only and are
not part of the build, the runtime or any workflow.

`test_db.py` is an obsolete connection check that targets a database name
(`ibero_room_booking`) no longer used by this project.
