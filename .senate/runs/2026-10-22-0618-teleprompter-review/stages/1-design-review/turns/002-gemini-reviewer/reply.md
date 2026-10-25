Summary: Proposal for a dual-source live teleprompter addressing Gemini's 10-minute session limits and real-time coaching.

Strengths: Robust epoch-based rollover, token cancellation for stale responses, and secure server-side key management.

Major concerns with concrete fixes: The design assumes stopping `getDisplayMedia` video preserves audio. *Fix:* Request audio-only streams directly via explicit constraints (`audio: true, video: false`) rather than dropping video post-capture.

Minor concerns: Unverified runtime inference quotas under continuous dual-stream load.

Recommendation: Minor revision.

