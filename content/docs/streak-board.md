---
title: "Streak Board"
weight: 99
---

# Prep Streak Board

> LeetCode-style daily streaks — **100% local cache**, no backend, no accounts.

<div id="streak-board-root">
  <p>Loading streak board…</p>
</div>

## How it works

1. **Study** — check off problems on the [DSA Checklist]({{< relref "/docs/dsa-checklist" >}}).
2. **Pick your profile** — Arun or Friend.
3. **Log today** — saves to this browser's local cache.
4. **Share with your friend** — click **Export**, send the JSON file (WhatsApp, AirDrop, email).
5. **See both streaks** — click **Import friend's file** to merge their data into yours.

## Daily ritual (2 people, no backend)

| You | Your friend |
|-----|-------------|
| Study → Log today → Export JSON | Study → Log today → Export JSON |
| Send your file to them | Send their file to you |
| Import their file | Import your file |

After importing, both heatmaps show on each person's device. Data stays in **localStorage** — clearing browser data will erase it, so export weekly as backup.

## No GitHub / Firebase needed

Everything runs in the browser. GitHub Pages only hosts the static page — it does not store your streaks. Your friend just needs the Streak Board link.
