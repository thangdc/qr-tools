import unittest
from types import SimpleNamespace

from fastapi import HTTPException

from api.app.main import ApiKey, _authorize_workflow_access


class WorkflowAuthorizationTests(unittest.TestCase):
    def setUp(self):
        self.key = ApiKey(id="key-1", key_hash="hash", rate_limit_per_minute=60, user_id="user-a")

    def test_owner_can_access_workflow(self):
        _authorize_workflow_access(self.key, {"owner_user_id": "user-a"})

    def test_different_owner_is_forbidden(self):
        with self.assertRaises(HTTPException) as raised:
            _authorize_workflow_access(self.key, {"owner_user_id": "user-b"})
        self.assertEqual(raised.exception.status_code, 403)

    def test_unowned_workflow_is_forbidden_to_customer_key(self):
        with self.assertRaises(HTTPException) as raised:
            _authorize_workflow_access(self.key, {"owner_user_id": None})
        self.assertEqual(raised.exception.status_code, 403)

    def test_legacy_infrastructure_key_keeps_compatibility(self):
        key = ApiKey(id="legacy", key_hash="hash", rate_limit_per_minute=60, user_id=None)
        _authorize_workflow_access(key, {"owner_user_id": "user-b"})


if __name__ == "__main__":
    unittest.main()
