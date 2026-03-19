export function scrollToAnchor(id: string) {
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  // Focus for a11y after scroll settles
  setTimeout(() => {
    (el as HTMLElement).setAttribute("tabindex", "-1");
    (el as HTMLElement).focus({ preventScroll: true });
  }, 350);
}

