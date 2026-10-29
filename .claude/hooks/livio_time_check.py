#!/usr/bin/env python3
"""Stop hook: enforce LIVIO'S TIME - RULE 1 (see top of CLAUDE.md).

Blocks the end of a turn when the last assistant message
  1. lacks "Need from you:", or
  2. claims live/deployed/fixed/done but no tool call this turn hit
     /api/version, /api/health or a browser check (unless it says "not verified").
Reads the Stop-hook JSON on stdin; prints {"decision":"block","reason":...} to block.
"""
import json
import re
import sys

CLAIM = re.compile(r"\b(live|deployed|fixed|done)\b", re.I)
EVIDENCE = re.compile(r"/api/version|/api/health|playwright|chromium|puppeteer|browser", re.I)
MESSAGE_TOOLS = ("post_message",)  # tools whose "text" input is the user-facing reply


def load(path):
    rows = []
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                try:
                    rows.append(json.loads(line))
                except ValueError:
                    pass
    except OSError:
        pass
    return rows


def blocks(row):
    content = (row.get("message") or {}).get("content", row.get("content"))
    if isinstance(content, str):
        return [{"type": "text", "text": content}]
    return content if isinstance(content, list) else []


def is_user_prompt(row):
    if row.get("type") != "user":
        return False
    return not any(b.get("type") == "tool_result" for b in blocks(row))


def last_turn(rows):
    """Assistant rows after the last real user prompt."""
    start = 0
    for i, row in enumerate(rows):
        if is_user_prompt(row):
            start = i + 1
    return [r for r in rows[start:] if r.get("type") == "assistant"]


def check(rows):
    """Return a block reason, or None when the turn passes."""
    turn = last_turn(rows)
    texts, evidence = [], False
    for row in turn:
        for b in blocks(row):
            if b.get("type") == "text":
                texts.append(b.get("text", ""))
            elif b.get("type") == "tool_use":
                inp = b.get("input") or {}
                if any(t in b.get("name", "") for t in MESSAGE_TOOLS):
                    texts.append(str(inp.get("text", "")))
                elif EVIDENCE.search(b.get("name", "") + " " + json.dumps(inp)):
                    evidence = True
    reply = "\n".join(t for t in texts if t.strip())
    if not reply:
        return None  # nothing user-facing yet
    if "Need from you:" not in reply:
        return ('Livio rule 1: end the reply with "Need from you: Nothing" or exactly one ask.')
    if CLAIM.search(reply) and not evidence and "not verified" not in reply.lower():
        return ('Livio rule 2: you claim live/fixed/done/deployed but no tool call this turn hit '
                '/api/version, /api/health or a browser check. Check it now, or write "not verified".')
    return None


def main():
    data = json.load(sys.stdin)
    if data.get("stop_hook_active"):
        return  # already blocked once this turn; never loop
    reason = check(load(data.get("transcript_path", "")))
    if reason:
        print(json.dumps({"decision": "block", "reason": reason}))


if __name__ == "__main__":
    main()
