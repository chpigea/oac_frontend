(function () {

  const COOKIE_NAME = 'hdlsd_cookie_consent';

  function getCookie(name) {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith(name + '='))
      ?.split('=')[1];
  }

  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days*24*60*60*1000));
    document.cookie = `${name}=${value}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
  }

  // Se già accettato → non mostrare
  if (getCookie(COOKIE_NAME) === 'accepted') {
    return;
  }

  const banner = document.getElementById('cookie-banner');
  const btn = document.getElementById('cookie-accept');

  if (!banner || !btn) return;

  banner.style.display = 'block';

  btn.addEventListener('click', function () {
    setCookie(COOKIE_NAME, 'accepted', 365);
    banner.remove();
  });

})();
