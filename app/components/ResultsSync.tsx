"use client";

import { useEffect } from "react";

// Renders nothing. Its only job is to make "somebody opened the site" the
// trigger that gets a finished gameweek written into the permanent record.
//
// Saving results used to depend entirely on an external cron pinging
// /api/poll. That pinger stopped after GW1 and nothing noticed: GW2 played
// out, finished, and was never saved, so the standings table quietly skipped
// a week and the fixtures page showed it as unplayed. /api/live repairs that
// on any request (see the route), but the browser only polls it from the
// gameweek page and only while a gameweek is *live* -- which excludes the
// exact moment the repair is needed, just after the last whistle.
//
// So this sits in the root layout and pings once per page load, from any
// tab. The route short-circuits when nothing is missing, which is almost
// always, and one request per visit is a fair price for the site's history
// not depending on a cron job nobody is watching.
export default function ResultsSync() {
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/live", { cache: "no-store", signal: controller.signal }).catch(() => {
      // Offline, or the user navigated away mid-flight. The next page load
      // and the poller both still cover it.
    });
    return () => controller.abort();
  }, []);

  return null;
}
