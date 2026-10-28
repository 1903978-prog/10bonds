/**
 * The landing page's buttons open the finder with the list already showing (owner decision A, 28/10/2026): the visitor
 * does not have to press the finder's own button a second time. The consent box sits on top of the list as the only step.
 * Set by the landing just before the finder mounts, read once by the finder.
 */
let listRequested = false;
export const requestFinderList = () => { listRequested = true; };
export const takeFinderListRequest = (): boolean => {
  const r = listRequested;
  listRequested = false;
  return r;
};
