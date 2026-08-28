import unittest

from zce import identity, schema_check, util


class TestIdentity(unittest.TestCase):
    def test_sha256_known_vector(self):
        self.assertEqual(
            util.sha256_text("zoran"),
            "f650c01694fd8c1570609050adf6f88db82d50ec75132629cf73807f6a1ca550")

    def test_canonical_json_is_order_independent(self):
        a = util.sha256_obj({"b": 1, "a": [2, 3]})
        b = util.sha256_obj({"a": [2, 3], "b": 1})
        self.assertEqual(a, b)

    def test_object_id_stable_and_path_normalized(self):
        self.assertEqual(identity.object_id_for_path("a/b.py"),
                         identity.object_id_for_path("a\\b.py"))
        self.assertTrue(identity.object_id_for_path("a/b.py").startswith("ZORAN-FILE-"))

    def test_stamp_carries_full_contract(self):
        stamped = identity.stamp("OBJ", "doc", {"x": 1}, "2026-08-28T12:00:00Z",
                                 "owner/repo", "abc")
        for key in ["object_id", "meta_id", "object_type", "version", "created_at",
                    "effective_at", "updated_at", "redated_at", "redating_reason",
                    "field_scope", "total_trace_id", "content_sha256", "source_repo",
                    "source_ref", "relations", "coherence", "guard_ids", "rollback",
                    "k3_verdict"]:
            self.assertIn(key, stamped)
        self.assertEqual(stamped["meta_id"], "OBJ:v1")
        self.assertEqual(stamped["content_sha256"], util.sha256_obj({"x": 1}))


class TestSchemaCheck(unittest.TestCase):
    SCHEMA = {"type": "object", "required": ["a"],
              "properties": {"a": {"type": "integer"},
                             "b": {"type": "string", "enum": ["x", "y"]}}}

    def test_valid(self):
        self.assertEqual(schema_check.validate({"a": 1, "b": "x"}, self.SCHEMA), [])

    def test_violations_are_exhaustive_and_sorted(self):
        errors = schema_check.validate({"b": "z"}, self.SCHEMA)
        self.assertEqual(len(errors), 2)
        self.assertEqual(errors, sorted(errors))

    def test_bool_is_not_integer(self):
        self.assertNotEqual(schema_check.validate({"a": True}, self.SCHEMA), [])


if __name__ == "__main__":
    unittest.main()
