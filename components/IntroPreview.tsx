"use client";

import Intro from "./Intro";

/** The earlier animated landing page (PR #121/#128), kept for later use; its buttons go to the finder. */
export default function IntroPreview() {
  return <Intro lang="en" onClose={() => { window.location.href = "/"; }} />;
}
