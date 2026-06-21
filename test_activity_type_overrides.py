import unittest
from types import SimpleNamespace
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent / "run_page"))

from generator.db import (
    Activity,
    apply_activity_type_overrides,
    init_db,
    update_or_create_activity,
)


class ActivityTypeOverridesTest(unittest.TestCase):
    def test_overrides_existing_and_synced_activities(self) -> None:
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as tmp:
            session = init_db(f"{tmp}/data.db")
            session.add(Activity(run_id=1756503423000, type="Run"))
            session.commit()

            apply_activity_type_overrides(session)
            session.commit()

            existing = session.query(Activity).filter_by(run_id=1756503423000).one()
            self.assertEqual(existing.type, "hiking")

            incoming = SimpleNamespace(
                id=1756598193000,
                name="Morning walk",
                distance=9989.61,
                moving_time=None,
                elapsed_time=None,
                type="Run",
                subtype=None,
                start_date="2025-08-30 23:56:33",
                start_date_local="2025-08-31 07:56:33",
                average_heartrate=95,
                average_speed=1.36,
                map=None,
                start_latlng=None,
            )
            update_or_create_activity(session, incoming)
            session.commit()

            synced = session.query(Activity).filter_by(run_id=1756598193000).one()
            self.assertEqual(synced.type, "hiking")


if __name__ == "__main__":
    unittest.main()
