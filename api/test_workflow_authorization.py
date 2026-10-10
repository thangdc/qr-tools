import unittest
from fastapi import HTTPException

from api.app.main import ApiKey, _authorize_workflow_access


class WorkflowAuthorizationTests(unittest.TestCase):
    def setUp(self):
        self.key = ApiKey(id="key-1", key_hash="hash", rate_limit_per_minute=60, user_id="user-a", access_mode="customer")

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

    def test_unclassified_key_without_owner_is_denied(self):
        key = ApiKey(id="legacy", key_hash="hash", rate_limit_per_minute=60, user_id=None, access_mode="customer")
        with self.assertRaises(HTTPException) as raised:
            _authorize_workflow_access(key, {"owner_user_id": "user-b"})
        self.assertEqual(raised.exception.status_code, 403)

    def test_explicit_system_key_can_access_workflow(self):
        key = ApiKey(id="system", key_hash="hash", rate_limit_per_minute=60, user_id=None, access_mode="system")
        _authorize_workflow_access(key, {"owner_user_id": "user-b"})


if __name__ == "__main__":
    unittest.main()
