/**
 * DragonRPA Corporate Landing Page JavaScript
 * Handles interactivity, modal dialogs, drawer menus, and scroll effects
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const header = document.getElementById('header');
  const btnToggleMobileMenu = document.getElementById('btnToggleMobileMenu');
  const btnCloseMobileMenu = document.getElementById('btnCloseMobileMenu');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const mobileLinks = document.querySelectorAll('.m-link');
  const btnMobileContact = document.getElementById('btnMobileContact');
  const btnOpenContact = document.getElementById('btnOpenContact');
  const btnBackToTop = document.getElementById('btnBackToTop');
  const contactModal = document.getElementById('contactModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const contactForm = document.getElementById('contactForm');

  // 1. Header Scroll Effect & Back-to-Top Button Visibility
  const handleScroll = () => {
    const scrollY = window.scrollY;

    // Header styling
    if (scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Back to top button
    if (scrollY > 350) {
      btnBackToTop.classList.add('visible');
    } else {
      btnBackToTop.classList.remove('visible');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Trigger on initial load

  // 2. Mobile Drawer Menu Handlers
  const openDrawer = () => {
    mobileDrawer.classList.add('open');
    drawerBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    mobileDrawer.classList.remove('open');
    drawerBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  };

  if (btnToggleMobileMenu) btnToggleMobileMenu.addEventListener('click', openDrawer);
  if (btnCloseMobileMenu) btnCloseMobileMenu.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeDrawer();
    });
  });

  if (btnMobileContact) {
    btnMobileContact.addEventListener('click', () => {
      closeDrawer();
      openContactModal();
    });
  }

  // 3. Contact Modal Handlers
  window.openContactModal = () => {
    contactModal.classList.add('active');
    modalBackdrop.classList.add('active');
    contactModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  window.closeContactModal = () => {
    contactModal.classList.remove('active');
    modalBackdrop.classList.remove('active');
    contactModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  if (btnOpenContact) {
    btnOpenContact.addEventListener('click', window.openContactModal);
  }

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (contactModal.classList.contains('active')) {
        window.closeContactModal();
      }
      if (mobileDrawer.classList.contains('open')) {
        closeDrawer();
      }
    }
  });

  // 4. Form Submission Handling
  window.handleContactSubmit = (e) => {
    e.preventDefault();
    const company = document.getElementById('companyName').value;
    const person = document.getElementById('contactPerson').value;
    const email = document.getElementById('contactEmail').value;

    alert(`[문의 접수 완료]\n${company} (${person}님), 접수가 정상적으로 완료되었습니다.\n작성하신 이메일(${email})로 담당자가 24시간 이내에 회신드리겠습니다.`);
    
    contactForm.reset();
    window.closeContactModal();
  };

  // 5. Back to Top Button
  if (btnBackToTop) {
    btnBackToTop.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // 6. Smooth Scroll for Anchor Links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || !targetId) return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // 7. Scroll Reveal Animations (Intersection Observer)
  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.pillar-card, .showcase-card, .service-item, .client-badge, .cta-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    revealObserver.observe(el);
  });

  // Apply reveal class styles dynamically
  window.addEventListener('scroll', () => {
    document.querySelectorAll('.revealed').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }, { passive: true });
});
