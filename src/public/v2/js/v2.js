document.addEventListener('DOMContentLoaded', () => {

  /* =========================
   * TOP MENU
   * ========================= */
  const topMenuEl = document.querySelector('#top-menu');
  if (topMenuEl) {
    const activeMenu = document.body.dataset.activeMenu || '';

    Vue.createApp({
      data() {
        return { activeMenu };
      }
    }).mount(topMenuEl);
  }

  /* =========================
   * SIDEBAR PRESENTAZIONE
   * ========================= */
  const sidebarEl = document.querySelector('#sidebar-presentazione');
  if (sidebarEl) {
    const activeItem = document.body.dataset.activeSidebarItem || '';

    Vue.createApp({
      data() {
        return { activeItem };
      }
    }).mount(sidebarEl);
  }


    /* =========================
   * SIDEBAR PRESENTAZIONE
   * ========================= */
  const sidebarInd = document.querySelector('#sidebar-investigation');
  if (sidebarInd) {
    const activeItem = document.body.dataset.activeSidebarItem || '';

    Vue.createApp({
      data() {
        return { activeItem };
      }
    }).mount(sidebarInd);
  }
  /* =========================
   * PARTECIPANTI – ACCORDION
   * ========================= */
  const accordionHeaders = document.querySelectorAll('.accordion-trigger');
  if (accordionHeaders.length) {

    accordionHeaders.forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.department-banner');
        if (!item) return;

        // Chiude gli altri accordion aperti
        document.querySelectorAll('.department-banner.open')
          .forEach(el => {
            if (el !== item) el.classList.remove('open');
          });

        // Toggle dell’elemento corrente
        item.classList.toggle('open');
      });
    });

  }

});
