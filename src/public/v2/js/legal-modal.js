function openPrivacy() {
  openLegalModal('privacy');
}

function openCookie() {
  openLegalModal('cookie');
}

function openLegalModal(type) {
  const modal = document.getElementById('legalModal');
  const privacy = document.getElementById('legal-privacy');
  const cookie = document.getElementById('legal-cookie');

  if (!modal) return;

  privacy.style.display = (type === 'privacy') ? 'block' : 'none';
  cookie.style.display  = (type === 'cookie')  ? 'block' : 'none';

  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeLegalModal() {
  const modal = document.getElementById('legalModal');
  if (!modal) return;

  modal.style.display = 'none';
  document.body.style.overflow = '';
}
