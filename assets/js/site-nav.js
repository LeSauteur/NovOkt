const siteNavScriptUrl = document.currentScript?.src || "";

document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector('link[rel~="icon"]') && siteNavScriptUrl) {
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.type = "image/svg+xml";
    icon.href = new URL("../images/favicon.svg", siteNavScriptUrl).href;
    document.head.append(icon);
  }

  if (!document.querySelector('meta[name="theme-color"]')) {
    const themeColor = document.createElement("meta");
    themeColor.name = "theme-color";
    themeColor.content = "#10251d";
    document.head.append(themeColor);
  }

  const headers = document.querySelectorAll(".site-header");

  headers.forEach((header, headerIndex) => {
    const toggle = header.querySelector(".nav-toggle");
    const nav = header.querySelector(".site-nav");
    const phone = header.querySelector(".header-phone");

    if (!toggle || !nav || !phone) {
      return;
    }

    if (!nav.id) {
      nav.id = `site-navigation-${headerIndex + 1}`;
    }
    toggle.setAttribute("aria-controls", nav.id);

    const closeMenu = (returnFocus = false) => {
      header.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Открыть меню");
      document.body.classList.remove("nav-open");
      if (returnFocus) {
        toggle.focus();
      }
    };

    const openMenu = () => {
      header.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Закрыть меню");
      document.body.classList.add("nav-open");
      requestAnimationFrame(() => nav.querySelector("a")?.focus());
    };

    toggle.addEventListener("click", () => {
      if (header.classList.contains("is-open")) {
        closeMenu(false);
      } else {
        openMenu();
      }
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => closeMenu(false));
    });

    phone.addEventListener("click", () => closeMenu(false));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && header.classList.contains("is-open")) {
        closeMenu(true);
      }
    });

    document.addEventListener("pointerdown", (event) => {
      if (header.classList.contains("is-open") && !header.contains(event.target)) {
        closeMenu(false);
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1180) {
        closeMenu(false);
      }
    });

    const updateHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealTargets = document.querySelectorAll([
    ".home-start-card",
    ".owner-standard__portrait",
    ".owner-standard__copy",
    ".home-district-card",
    ".home-checks__grid article",
    ".home-office__copy",
    ".home-office__gallery",
    ".deal-route__steps li",
    ".hero-cover__content",
    ".district-hero__content"
  ].join(","));

  if (!reduceMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("motion-ready");
    revealTargets.forEach((target) => target.classList.add("reveal-item"));
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
    revealTargets.forEach((target) => revealObserver.observe(target));
  }

  const heroVisual = document.querySelector(".sales-hero__visual");
  if (heroVisual && !reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    heroVisual.addEventListener("pointermove", (event) => {
      const bounds = heroVisual.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      heroVisual.style.setProperty("--hero-main-x", `${x * -8}px`);
      heroVisual.style.setProperty("--hero-main-y", `${y * -8}px`);
      heroVisual.style.setProperty("--hero-house-x", `${x * 10}px`);
      heroVisual.style.setProperty("--hero-house-y", `${y * 10}px`);
    });
    heroVisual.addEventListener("pointerleave", () => {
      heroVisual.style.setProperty("--hero-main-x", "0px");
      heroVisual.style.setProperty("--hero-main-y", "0px");
      heroVisual.style.setProperty("--hero-house-x", "0px");
      heroVisual.style.setProperty("--hero-house-y", "0px");
    });
  }
});
