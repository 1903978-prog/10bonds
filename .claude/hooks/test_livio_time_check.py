import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
from livio_time_check import check  # noqa: E402


def user(text="go"):
    return {"type": "user", "message": {"content": text}}


def say(text):
    return {"type": "assistant", "message": {"content": [{"type": "text", "text": text}]}}


def tool(name, **inp):
    return {"type": "assistant", "message": {"content": [{"type": "tool_use", "name": name, "input": inp}]}}


def result():
    return {"type": "user", "message": {"content": [{"type": "tool_result", "content": "ok"}]}}


class LivioTimeCheck(unittest.TestCase):
    # must block
    def test_block_missing_need_from_you(self):
        self.assertIn("Need from you", check([user(), say("Here is the answer.")]))

    def test_block_live_claim_without_check(self):
        self.assertIn("rule 2", check([user(), say("The fix is live.\nNeed from you: Nothing")]))

    def test_block_claim_after_unrelated_tool(self):
        rows = [user(), tool("Bash", command="ls"), result(), say("Deployed.\nNeed from you: Nothing")]
        self.assertIn("rule 2", check(rows))

    def test_block_old_check_does_not_count(self):
        rows = [user(), tool("Bash", command="curl /api/version"), result(), user("again"),
                say("It is fixed.\nNeed from you: Nothing")]
        self.assertIn("rule 2", check(rows))

    def test_block_post_message_tool_text(self):
        rows = [user(), tool("mcp__hearthbot__post_message", text="All done.")]
        self.assertIn("Need from you", check(rows))

    # must pass
    def test_pass_no_claim(self):
        self.assertIsNone(check([user(), say("Added the file.\nNeed from you: Nothing")]))

    def test_pass_claim_with_version_check(self):
        rows = [user(), tool("Bash", command="curl -s https://10bonds.com/api/version"), result(),
                say("Live, version matches.\nNeed from you: Nothing")]
        self.assertIsNone(check(rows))

    def test_pass_claim_with_health_check(self):
        rows = [user(), tool("WebFetch", url="https://10bonds.com/api/health"), result(),
                say("Fixed and live.\nNeed from you: Nothing")]
        self.assertIsNone(check(rows))

    def test_pass_claim_with_browser_check(self):
        rows = [user(), tool("Bash", command="node playwright-check.js"), result(),
                say("Fixed.\nNeed from you: Nothing")]
        self.assertIsNone(check(rows))

    def test_pass_not_verified(self):
        self.assertIsNone(check([user(), say("Fixed in code, not verified live.\nNeed from you: Nothing")]))

    def test_pass_tool_only_turn(self):
        self.assertIsNone(check([user(), tool("Bash", command="ls")]))


if __name__ == "__main__":
    unittest.main()
