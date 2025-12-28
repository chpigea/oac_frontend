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

});
