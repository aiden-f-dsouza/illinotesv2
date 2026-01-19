/**
 * Mobile Menu Toggle Functionality
 * Handles hamburger menu interactions across all pages
 */
(function() {
  'use strict';

  function initMobileMenu() {
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileOverlay = document.querySelector('.mobile-menu-overlay');

    if (!hamburgerBtn || !mobileMenu) return;

    // Toggle menu on hamburger click
    hamburgerBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleMobileMenu();
    });

    // Close on overlay click
    if (mobileOverlay) {
      mobileOverlay.addEventListener('click', closeMobileMenu);
    }

    // Close on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeMobileMenu();
    });

    // Close when clicking menu links
    mobileMenu.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', closeMobileMenu);
    });

    // Mobile theme toggle
    const mobileThemeToggle = mobileMenu.querySelector('.mobile-theme-toggle');
    if (mobileThemeToggle) {
      mobileThemeToggle.addEventListener('click', function() {
        // Use the global toggleTheme function from theme-toggle.js
        if (typeof window.toggleTheme === 'function') {
          window.toggleTheme();
        } else {
          // Fallback if theme-toggle.js hasn't loaded
          var currentTheme = document.documentElement.getAttribute('data-theme');
          var newTheme = currentTheme === 'light' ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', newTheme);
          localStorage.setItem('theme', newTheme);
        }
      });
    }
  }

  function toggleMobileMenu() {
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileOverlay = document.querySelector('.mobile-menu-overlay');

    const isOpen = mobileMenu.classList.contains('active');

    if (isOpen) {
      closeMobileMenu();
    } else {
      mobileMenu.classList.add('active');
      if (mobileOverlay) mobileOverlay.classList.add('active');
      hamburgerBtn.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeMobileMenu() {
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileOverlay = document.querySelector('.mobile-menu-overlay');

    if (mobileMenu) mobileMenu.classList.remove('active');
    if (mobileOverlay) mobileOverlay.classList.remove('active');
    if (hamburgerBtn) hamburgerBtn.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Expose globally for external use
  window.closeMobileMenu = closeMobileMenu;

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu);
  } else {
    initMobileMenu();
  }
})();
