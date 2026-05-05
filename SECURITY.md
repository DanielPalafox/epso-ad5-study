# Security Policy

## Scope

This is a **client-side only** application. It runs entirely in the browser, has no backend server, stores no data outside your own browser's `localStorage`, and makes no network requests other than loading its own static files from GitHub Pages.

There is no user authentication, no database, and no server-side processing. The realistic attack surface is limited to:

- **Stored XSS** via a compromised question bank (`questions.js` or `digcomp3.js`)
- **Malicious fork** distributed as a fake study tool

## Reporting a vulnerability

If you discover a security issue (e.g. a reflected XSS vector, a supply-chain concern, or something in the question data files), please **do not open a public issue**.

Instead, report it privately:

1. Go to **Security → Report a vulnerability** on the GitHub repository page (uses GitHub's private advisory feature), or
2. Email the maintainer directly at the address listed in their GitHub profile.

Please include:
- A description of the issue
- Steps to reproduce
- The potential impact

You will receive a response within 7 days.

## Supported versions

Only the latest commit on `main` is actively maintained.
